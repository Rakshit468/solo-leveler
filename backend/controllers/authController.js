import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { sendOtpEmail } from '../services/emailService.js';

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

const buildAuthUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  character: user.character,
  achievements: user.achievements,
  streaks: user.streaks,
  preferences: user.preferences,
});

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

    await sendOtpEmail({
      to: email,
      otp,
      username: user.character?.name || user.username,
    });

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        requiresVerification: true,
        email: user.email,
      },
    });
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

    await sendOtpEmail({
      to: email,
      otp,
      username: user.character?.name || user.username,
    });

    res.json({
      success: true,
      message: 'A new OTP has been sent',
      data: { email },
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
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (user.streaks.lastActivity) {
      const lastActivity = new Date(user.streaks.lastActivity);
      lastActivity.setHours(0, 0, 0, 0);

      if (lastActivity.getTime() === yesterday.getTime()) {
        user.streaks.current += 1;
      } else if (lastActivity.getTime() === today.getTime()) {
        user.streaks.current = Math.max(user.streaks.current, 1);
      } else {
        user.streaks.current = 1;
      }
    } else {
      user.streaks.current = 1;
    }

    user.streaks.longest = Math.max(user.streaks.longest, user.streaks.current);
    user.streaks.lastActivity = now;
    await user.save();

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