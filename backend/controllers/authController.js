import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Quest from '../models/Quest.js';
import UserEvent from '../models/UserEvent.js';
import { validationResult } from 'express-validator';
import { sendOtpEmail } from '../services/emailService.js';
import {
  CLASS_DEFINITIONS,
  DUAL_CLASS_UNLOCK_STREAK_DAYS,
  STARTER_QUESTS,
} from '../config/onboardingConfig.js';
import {
  applyAutoShieldForYesterdayGap,
  applyShieldDate,
  computeCurrentStreakFromDateSet,
  dateKeyIsValid,
  getMostRecentActiveDateKey,
  getRecentMissingDateKeys,
  mergeActiveDateSets,
  refreshShield,
  syncDualClassUnlock,
  toDateKey,
} from '../services/streakService.js';

const isTrue = (value) => String(value).toLowerCase() === 'true';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const setUserOtp = (user, otp) => {
  user.emailVerification = {
    otpHash: hashOtp(otp),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    otpAttempts: 0,
    lastSentAt: new Date(),
  };
};

const trackUserEvent = async (userId, eventName, metadata = {}) => {
  try {
    await UserEvent.create({
      user: userId,
      eventName,
      metadata,
    });
  } catch (error) {
    console.error(`Track event failed (${eventName}):`, error?.message || error);
  }
};

const buildAuthUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  character: user.character,
  achievements: user.achievements,
  streaks: user.streaks,
  preferences: user.preferences,
  onboarding: user.onboarding,
});

const getCompletedQuestDateKeys = async (userId, now = new Date()) => {
  const completed = await Quest.find({
    user: userId,
    status: 'completed',
    completedAt: { $ne: null, $lte: now },
  }).select('completedAt');

  return [...new Set(completed.map((item) => toDateKey(item.completedAt)))];
};

const recomputeUserStreak = async (user, now = new Date()) => {
  const activityDateKeys = await getCompletedQuestDateKeys(user._id, now);
  const shieldedDateKeys = user?.streaks?.shieldedDates || [];
  const activeDateSet = mergeActiveDateSets(activityDateKeys, shieldedDateKeys);
  applyAutoShieldForYesterdayGap(user, activeDateSet, now);

  const streaks = user.streaks || {};
  const currentStreak = computeCurrentStreakFromDateSet(activeDateSet, now);
  streaks.current = currentStreak;
  streaks.longest = Math.max(streaks.longest || 0, currentStreak);
  const latestActiveDateKey = getMostRecentActiveDateKey(activeDateSet);
  streaks.lastActivity = latestActiveDateKey
    ? new Date(`${latestActiveDateKey}T00:00:00.000Z`)
    : null;
  user.streaks = streaks;

  return {
    activeDateSet,
    currentStreak,
  };
};

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, characterName } = req.body;

    let user = await User.findOne({ email });

    if (user && user.isEmailVerified) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (!user) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      user = new User({
        username,
        email,
        password,
        isEmailVerified: false,
        character: {
          name: characterName || username,
          avatar: 'default-avatar.png',
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          stats: {
            strength: 10,
            intelligence: 10,
            productivity: 10,
            consistency: 10,
            stamina: 100,
          },
        },
      });
    } else {
      if (username !== user.username) {
        const usernameTaken = await User.findOne({
          username,
          _id: { $ne: user._id },
        });
        if (usernameTaken) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }

      user.username = username;
      user.password = password;
      user.character.name = characterName || username;
      user.isEmailVerified = false;
    }

    const otp = generateOtp();
    setUserOtp(user, otp);
    await user.save();

    let emailDeliveryFailed = false;
    try {
      await sendOtpEmail({
        to: email,
        otp,
        username: user.character?.name || user.username,
      });
    } catch (mailError) {
      emailDeliveryFailed = true;
      console.error('Register OTP email error:', mailError?.message || mailError);
    }

    const allowOtpInResponse = isTrue(process.env.ALLOW_OTP_IN_RESPONSE);

    if (emailDeliveryFailed && !allowOtpInResponse) {
      return res.status(503).json({
        success: false,
        message:
          'Unable to send OTP email right now. Please try again shortly or contact support.',
      });
    }

    res.status(201).json({
      success: true,
      message: emailDeliveryFailed
        ? 'Email delivery failed. OTP returned in response (temporary fallback enabled).'
        : 'OTP sent to your email',
      data: {
        requiresVerification: true,
        email: user.email,
        otp: emailDeliveryFailed && allowOtpInResponse ? otp : undefined,
      },
    });

    await trackUserEvent(user._id, 'register_otp_sent');
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const verification = user.emailVerification || {};
    if (!verification.otpHash || !verification.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP not found. Please request a new OTP.' });
    }

    if (verification.otpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (new Date(verification.otpExpiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    if (verification.otpHash !== hashOtp(otp)) {
      user.emailVerification.otpAttempts = (verification.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.isEmailVerified = true;
    user.emailVerification = {
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      lastSentAt: null,
    };
    await user.save();

    await trackUserEvent(user._id, 'signup_completed');

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: buildAuthUser(user),
        token,
      },
    });
  } catch (error) {
    console.error('Verify signup OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

export const resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const lastSentAt = user.emailVerification?.lastSentAt
      ? new Date(user.emailVerification.lastSentAt).getTime()
      : 0;
    if (Date.now() - lastSentAt < 60 * 1000) {
      return res.status(429).json({ message: 'Please wait before requesting another OTP' });
    }

    const otp = generateOtp();
    setUserOtp(user, otp);
    await user.save();

    let emailDeliveryFailed = false;
    try {
      await sendOtpEmail({
        to: email,
        otp,
        username: user.character?.name || user.username,
      });
    } catch (mailError) {
      emailDeliveryFailed = true;
      console.error('Resend OTP email error:', mailError?.message || mailError);
    }

    const allowOtpInResponse = isTrue(process.env.ALLOW_OTP_IN_RESPONSE);

    if (emailDeliveryFailed && !allowOtpInResponse) {
      return res.status(503).json({
        success: false,
        message:
          'Unable to send OTP email right now. Please try again shortly or contact support.',
      });
    }

    res.json({
      success: true,
      message: emailDeliveryFailed
        ? 'Email delivery failed. OTP returned in response (temporary fallback enabled).'
        : 'A new OTP has been sent',
      data: {
        email,
        otp: emailDeliveryFailed && allowOtpInResponse ? otp : undefined,
      },
    });
  } catch (error) {
    console.error('Resend signup OTP error:', error);
    res.status(500).json({ message: 'Server error resending OTP' });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email with OTP before logging in',
        requiresVerification: true,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const now = new Date();
    const accountAgeMs = now.getTime() - new Date(user.createdAt).getTime();
    const isAtLeastOneDayOld = accountAgeMs >= 24 * 60 * 60 * 1000;

    refreshShield(user, now);
    await recomputeUserStreak(user, now);
    user.onboarding = user.onboarding || {};
    if (!user.onboarding.dualClassUnlockStreak) {
      user.onboarding.dualClassUnlockStreak = DUAL_CLASS_UNLOCK_STREAK_DAYS;
    }
    syncDualClassUnlock(user);
    await user.save();

    if (isAtLeastOneDayOld) {
      const existingReturnEvent = await UserEvent.findOne({
        user: user._id,
        eventName: 'day1_returned',
      }).select('_id');

      if (!existingReturnEvent) {
        await trackUserEvent(user._id, 'day1_returned');
      }
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: buildAuthUser(user),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { characterName, avatar, preferences } = req.body;

    const updateFields = {};
    if (characterName) updateFields['character.name'] = characterName;
    if (avatar) updateFields['character.avatar'] = avatar;
    if (preferences) updateFields.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const getOnboardingOptions = async (_req, res) => {
  try {
    const classes = Object.values(CLASS_DEFINITIONS);
    res.json({
      success: true,
      data: {
        dualClassUnlockStreak: DUAL_CLASS_UNLOCK_STREAK_DAYS,
        classes,
      },
    });
  } catch (error) {
    console.error('Get onboarding options error:', error);
    res.status(500).json({ message: 'Server error fetching onboarding options' });
  }
};

export const setupOnboarding = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { primaryClass } = req.body;
    const selectedClass = String(primaryClass || '').toLowerCase();
    if (!STARTER_QUESTS[selectedClass]) {
      return res.status(400).json({ message: 'Invalid class selection' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();

    await Quest.deleteMany({
      user: user._id,
      isStarterQuest: true,
      status: 'active',
    });

    const starterQuestsPayload = STARTER_QUESTS[selectedClass].slice(0, 3).map((template) => {
      const quest = new Quest({
        user: user._id,
        title: template.title,
        description: template.description,
        category: template.category,
        type: template.type,
        difficulty: template.difficulty,
        priority: template.priority,
        tags: template.tags,
        isStarterQuest: true,
        templateKey: template.templateKey,
      });

      quest.xpReward = quest.calculateXP();
      return quest;
    });

    const starterQuests = await Quest.insertMany(starterQuestsPayload);

    user.onboarding = {
      ...user.onboarding,
      completed: true,
      completedAt: now,
      primaryClass: selectedClass,
      dualClassUnlockStreak: DUAL_CLASS_UNLOCK_STREAK_DAYS,
      dualClassUnlocked: (user.streaks?.current || 0) >= DUAL_CLASS_UNLOCK_STREAK_DAYS,
    };

    await user.save();

    await trackUserEvent(user._id, 'onboarding_started', { primaryClass: selectedClass });
    await trackUserEvent(user._id, 'starter_pack_selected', {
      primaryClass: selectedClass,
      questCount: starterQuests.length,
    });
    await trackUserEvent(user._id, 'onboarding_completed', { primaryClass: selectedClass });

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        user: buildAuthUser(user),
        starterQuests,
      },
    });
  } catch (error) {
    console.error('Setup onboarding error:', error);
    res.status(500).json({ message: 'Server error completing onboarding' });
  }
};

export const updateStarterQuests = async (req, res) => {
  try {
    const { quests } = req.body;
    if (!Array.isArray(quests)) {
      return res.status(400).json({ message: 'Invalid quests payload' });
    }

    const updates = [];
    for (const item of quests) {
      if (!item?.id) continue;
      const updateData = {};
      if (typeof item.title === 'string') {
        updateData.title = item.title.trim().slice(0, 100);
      }
      if (typeof item.description === 'string') {
        updateData.description = item.description.trim().slice(0, 500);
      }
      if (Object.keys(updateData).length === 0) continue;

      const updated = await Quest.findOneAndUpdate(
        {
          _id: item.id,
          user: req.user.id,
          isStarterQuest: true,
          status: 'active',
        },
        { $set: updateData },
        { new: true }
      );
      if (updated) updates.push(updated);
    }

    await trackUserEvent(req.user.id, 'starter_quests_edited', { editedCount: updates.length });

    res.json({
      success: true,
      data: {
        quests: updates,
      },
    });
  } catch (error) {
    console.error('Update starter quests error:', error);
    res.status(500).json({ message: 'Server error updating starter quests' });
  }
};

export const useShieldNow = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { targetDate } = req.body || {};
    const now = new Date();
    refreshShield(user, now);

    if (!dateKeyIsValid(targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid targetDate. Use YYYY-MM-DD format.',
      });
    }

    const todayKey = toDateKey(now);
    if (targetDate >= todayKey) {
      return res.status(400).json({
        success: false,
        message: 'Shield can only be used on past dates.',
      });
    }

    const activityDateKeys = await getCompletedQuestDateKeys(user._id, now);
    const activeSetBeforeShield = mergeActiveDateSets(
      activityDateKeys,
      user?.streaks?.shieldedDates || []
    );

    if (activeSetBeforeShield.has(targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'That date already has task activity or shield applied.',
      });
    }

    const missingDateKeys = getRecentMissingDateKeys(activeSetBeforeShield, now, 365);
    if (!missingDateKeys.includes(targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Selected date is not eligible for shield usage.',
      });
    }

    const consumed = applyShieldDate(user, targetDate, now);
    if (!consumed) {
      return res.status(400).json({
        success: false,
        message: 'No shield charges available or shield already used for this date.',
        data: {
          shieldCharges: user?.streaks?.shieldCharges || 0,
        },
      });
    }

    const { activeDateSet } = await recomputeUserStreak(user, now);

    syncDualClassUnlock(user);
    await user.save();

    await trackUserEvent(user._id, 'shield_used_manually', {
      at: now,
      streakAfterUse: user?.streaks?.current || 0,
      targetDate,
    });

    const missingDateKeysAfterUse = getRecentMissingDateKeys(activeDateSet, now, 365);

    res.json({
      success: true,
      message: 'Shield used successfully. Your streak is protected.',
      data: {
        user: buildAuthUser(user),
        canUseShieldNow: (user?.streaks?.shieldCharges || 0) > 0 && missingDateKeysAfterUse.length > 0,
        missingShieldDates: missingDateKeysAfterUse,
      },
    });
  } catch (error) {
    console.error('Use shield error:', error);
    res.status(500).json({ message: 'Server error using shield' });
  }
};