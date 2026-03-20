import Quest from "../models/Quest.js";
import User from "../models/User.js";
import XPLog from "../models/XPLog.js";
import UserEvent from "../models/UserEvent.js";
import { UserSkill } from "../models/Skill.js";
import { validationResult } from "express-validator";
import { RECOVERY_QUEST } from "../config/onboardingConfig.js";
import {
  buildGoogleCalendarAuthUrl,
  exchangeGoogleCalendarCode,
  removeGoogleCalendarEvent,
  syncQuestWithGoogleCalendar,
} from "../services/googleCalendarService.js";
import {
  applyAutoShieldForYesterdayGap,
  computeCurrentStreakFromDateSet,
  computeDaysSinceLastActivity,
  getMostRecentActiveDateKey,
  getRecentMissingDateKeys,
  mergeActiveDateSets,
  refreshShield,
  syncDualClassUnlock,
  toDateKey,
} from "../services/streakService.js";

const getDifficultyBonus = (difficulty) => {
  const difficultyMap = {
    easy: 1,
    medium: 2,
    hard: 3,
    legendary: 4,
  };
  return difficultyMap[difficulty] || 1;
};

const getTypeBonus = (type) => {
  const typeMap = {
    daily: 1,
    weekly: 2,
    boss: 3,
    custom: 1,
  };
  return typeMap[type] || 1;
};

const parseDate = (value) => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const localDate = new Date(`${value}T00:00:00`);
    return Number.isNaN(localDate.getTime()) ? undefined : localDate;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const getCompletedQuestDateKeys = async (userId, now = new Date()) => {
  const completed = await Quest.find({
    user: userId,
    status: "completed",
    completedAt: { $ne: null, $lte: now },
  }).select("completedAt");

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

const createRecoveryQuestIfNeeded = async (user, missedDays) => {
  if (missedDays < 1) {
    return null;
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const lastRecoveryAt = user.onboarding?.lastRecoveryQuestAt
    ? new Date(user.onboarding.lastRecoveryQuestAt)
    : null;
  if (lastRecoveryAt) {
    lastRecoveryAt.setHours(0, 0, 0, 0);
    if (lastRecoveryAt.getTime() === today.getTime()) {
      return null;
    }
  }

  const existingToday = await Quest.findOne({
    user: user._id,
    isRecoveryQuest: true,
    status: "active",
    createdAt: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  }).select("_id");

  if (existingToday) {
    return null;
  }

  const recoveryQuest = new Quest({
    user: user._id,
    title: RECOVERY_QUEST.title,
    description: RECOVERY_QUEST.description,
    category: RECOVERY_QUEST.category,
    type: RECOVERY_QUEST.type,
    difficulty: RECOVERY_QUEST.difficulty,
    priority: RECOVERY_QUEST.priority,
    tags: RECOVERY_QUEST.tags,
    templateKey: RECOVERY_QUEST.templateKey,
    isRecoveryQuest: true,
  });

  recoveryQuest.xpReward = recoveryQuest.calculateXP();
  await recoveryQuest.save();

  user.onboarding = user.onboarding || {};
  user.onboarding.lastRecoveryQuestAt = now;

  await UserEvent.create({
    user: user._id,
    eventName: "recovery_quest_created",
    metadata: {
      missedDays,
      questId: recoveryQuest._id,
    },
  });

  return recoveryQuest;
};

export const getQuests = async (req, res) => {
  try {
    const { search, type, status, category, page = 1, limit = 20 } = req.query;

    const filter = { user: req.user.id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const quests = await Quest.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("user", "username character.name");

    const total = await Quest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        quests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get quests error:", error);
    res.status(500).json({ message: "Server error fetching quests" });
  }
};

export const createQuest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      type,
      difficulty,
      dueDate,
      startDateTime,
      endDateTime,
      timezone,
      recurrence,
      tags,
      priority,
    } = req.body;

    const quest = new Quest({
      user: req.user.id,
      title,
      description,
      category,
      type,
      difficulty,
      dueDate: parseDate(dueDate),
      startDateTime: parseDate(startDateTime),
      endDateTime: parseDate(endDateTime),
      timezone:
        timezone ||
        req.user?.preferences?.timezone ||
        "UTC",
      recurrence,
      priority,
      tags: tags || [],
    });

    // Calculate XP using the model method
    quest.xpReward = quest.calculateXP();

    await quest.save();

    const questCount = await Quest.countDocuments({ user: req.user.id });
    if (questCount === 1) {
      await UserEvent.create({
        user: req.user.id,
        eventName: "first_quest_created",
        metadata: { questId: quest._id },
      });
    }

    const user = await User.findById(req.user.id);
    if (user?.integrations?.googleCalendar?.connected) {
      try {
        const syncedEvent = await syncQuestWithGoogleCalendar(user, quest);
        if (syncedEvent?.id) {
          quest.googleCalendarEventId = syncedEvent.id;
          await quest.save();
        }
      } catch (syncError) {
        console.error("Google Calendar sync (create) failed:", syncError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Quest created successfully",
      data: quest,
    });
  } catch (error) {
    console.error("Create quest error:", error);
    res.status(500).json({ message: "Server error creating quest" });
  }
};

export const updateQuest = async (req, res) => {
  try {
    const quest = await Quest.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    const {
      title,
      description,
      category,
      difficulty,
      dueDate,
      startDateTime,
      endDateTime,
      timezone,
      priority,
      tags,
    } = req.body;

    if (title !== undefined) quest.title = title;
    if (description !== undefined) quest.description = description;
    if (category !== undefined) quest.category = category;
    if (difficulty) {
      quest.difficulty = difficulty;
      quest.xpReward = quest.calculateXP();
    }
    if (dueDate !== undefined) quest.dueDate = parseDate(dueDate);
    if (startDateTime !== undefined)
      quest.startDateTime = parseDate(startDateTime);
    if (endDateTime !== undefined) quest.endDateTime = parseDate(endDateTime);
    if (timezone !== undefined) quest.timezone = timezone || "UTC";
    if (priority !== undefined) quest.priority = priority;
    if (tags !== undefined) quest.tags = tags;

    await quest.save();

    const user = await User.findById(req.user.id);
    if (user?.integrations?.googleCalendar?.connected) {
      try {
        const syncedEvent = await syncQuestWithGoogleCalendar(user, quest);
        if (syncedEvent?.id && quest.googleCalendarEventId !== syncedEvent.id) {
          quest.googleCalendarEventId = syncedEvent.id;
          await quest.save();
        }
      } catch (syncError) {
        console.error("Google Calendar sync (update) failed:", syncError.message);
      }
    }

    res.json({
      success: true,
      message: "Quest updated successfully",
      data: quest,
    });
  } catch (error) {
    console.error("Update quest error:", error);
    res.status(500).json({ message: "Server error updating quest" });
  }
};

export const completeQuest = async (req, res) => {
  try {
    const quest = await Quest.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    if (quest.status === "completed") {
      return res.status(400).json({ message: "Quest already completed" });
    }

    // Complete the quest
    quest.complete();

    const recoveryBonusXP = quest.isRecoveryQuest ? 25 : 0;
    if (recoveryBonusXP > 0) {
      quest.xpReward += recoveryBonusXP;
      const completionIndex = quest.completionHistory.length - 1;
      if (completionIndex >= 0) {
        quest.completionHistory[completionIndex].xpEarned = quest.xpReward;
        quest.completionHistory[completionIndex].notes = 'Recovery quest completed (+bonus XP)';
      }
    }

    await quest.save();

    // Update user XP and level using the new model method
    const user = await User.findById(req.user.id);
    const { leveledUp, newLevel, newXP, newXPToNextLevel } = await user.addXP(
      quest.xpReward,
      "quest",
      quest._id,
      `Completed quest: ${quest.title}`,
      {
        questTitle: quest.title,
        multiplier: 1,
        recoveryBonusXP,
      }
    );

    const now = new Date();
    refreshShield(user, now);
    await recomputeUserStreak(user, now);
    syncDualClassUnlock(user);

    // Meaningful stat growth based on completion quality and quest challenge.
    const completedAt = quest.completedAt || now;
    const hasDueDate = Boolean(quest.dueDate);
    const hoursDiff = hasDueDate
      ? (new Date(quest.dueDate).getTime() - completedAt.getTime()) / 3600000
      : 0;
    const isOnTime = !hasDueDate || hoursDiff >= 0;
    const completedEarlyBy24h = hasDueDate && hoursDiff >= 24;

    const completedTodayCount = await Quest.countDocuments({
      user: user._id,
      status: "completed",
      completedAt: { $gte: new Date(now).setHours(0, 0, 0, 0) },
    });

    const difficultyBonus = getDifficultyBonus(quest.difficulty);
    const typeBonus = getTypeBonus(quest.type);
    const highPriorityBonus = ["high", "critical"].includes(quest.priority) ? 1 : 0;

    const statGains = {
      strength: Math.max(1, Math.floor((difficultyBonus + highPriorityBonus) / 2)),
      intelligence:
        (quest.category === "knowledge" ? 1 : 0) + (quest.difficulty === "hard" || quest.difficulty === "legendary" ? 1 : 0),
      productivity:
        typeBonus + highPriorityBonus + (quest.difficulty === "hard" || quest.difficulty === "legendary" ? 1 : 0) + (completedTodayCount >= 3 ? 1 : 0),
      consistency:
        (isOnTime ? 2 : 0) + (completedEarlyBy24h ? 1 : 0) + (quest.type === "daily" ? 1 : 0),
    };

    user.character.stats.productivity =
      user.character.stats.productivity ?? user.character.stats.agility ?? 10;
    user.character.stats.consistency =
      user.character.stats.consistency ?? user.character.stats.luck ?? 10;

    user.character.stats.strength += statGains.strength;
    user.character.stats.intelligence += statGains.intelligence;
    user.character.stats.productivity += statGains.productivity;
    user.character.stats.consistency += statGains.consistency;
    user.character.totalStats =
      user.character.stats.strength +
      user.character.stats.intelligence +
      user.character.stats.productivity +
      user.character.stats.consistency;

    await user.save();

    // Update skill progress for skills in the same category as the quest
    const userSkills = await UserSkill.find({ user: user._id }).populate("skill");
    const relatedSkills = userSkills.filter((us) => us.skill.category === quest.category);

    const updatedSkills = [];
    for (const userSkill of relatedSkills) {
      const xpGainedForSkill = Math.max(5, Math.round(quest.xpReward * 0.2));
      userSkill.experience += xpGainedForSkill;

      const xpToLevel = (level) => 100 * level;
      while (userSkill.experience >= xpToLevel(userSkill.level) && userSkill.level < 10) {
        userSkill.experience -= xpToLevel(userSkill.level);
        userSkill.level += 1;
      }

      await userSkill.save();
      updatedSkills.push(userSkill);
    }

    // Emit real-time update
    if (req.io) {
      req.io.emit("questCompleted", {
        userId: user._id,
        questId: quest._id,
        xpGained: quest.xpReward,
        recoveryBonusXP,
        leveledUp,
        newLevel,
        streaks: user.streaks,
      });
      if (updatedSkills.length > 0) {
        req.io.emit("skillProgress", {
          userId: user._id,
          updatedSkills,
        });
      }
    }

    res.json({
      success: true,
      message: "Quest completed successfully!",
      data: {
        quest,
        xpGained: quest.xpReward,
        recoveryBonusXP,
        leveledUp,
        newLevel,
        newXP,
        newXPToNextLevel,
        statGains,
        updatedStats: user.character.stats,
        streaks: user.streaks,
        updatedSkills,
      },
    });
  } catch (error) {
    console.error("Complete quest error:", error);
    res.status(500).json({ message: "Server error completing quest" });
  }
};

export const deleteQuest = async (req, res) => {
  try {
    const quest = await Quest.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found or you do not have permission to delete it",
      });
    }

    const user = await User.findById(req.user.id);
    if (
      user?.integrations?.googleCalendar?.connected &&
      quest.googleCalendarEventId
    ) {
      try {
        await removeGoogleCalendarEvent(user, quest.googleCalendarEventId);
      } catch (syncError) {
        console.error("Google Calendar delete sync failed:", syncError.message);
      }
    }

    await quest.deleteOne();

    res.json({
      success: true,
      message: "Quest deleted successfully",
    });
  } catch (error) {
    console.error("Delete quest error:", error);
    res.status(500).json({ message: "Server error deleting quest" });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const now = new Date();
    refreshShield(user, now);
    const { activeDateSet } = await recomputeUserStreak(user, now);
    const missingShieldDates = getRecentMissingDateKeys(activeDateSet, now, 365);
    const canUseShieldNow = (user?.streaks?.shieldCharges || 0) > 0 && missingShieldDates.length > 0;
    syncDualClassUnlock(user);
    const daysSinceLastActivity = computeDaysSinceLastActivity(user?.streaks?.lastActivity, now);
    const recoveryQuest = await createRecoveryQuestIfNeeded(
      user,
      daysSinceLastActivity > 1 ? daysSinceLastActivity - 1 : 0
    );
    await user.save();

    // Get quest statistics
    const [dailyQuests, weeklyQuests, bossQuests, completedToday] =
      await Promise.all([
        Quest.find({ user: userId, type: "daily", status: "active" }),
        Quest.find({ user: userId, type: "weekly", status: "active" }),
        Quest.find({ user: userId, type: "boss", status: "active" }),
        Quest.countDocuments({
          user: userId,
          status: "completed",
          completedAt: { $gte: new Date().setHours(0, 0, 0, 0) },
        }),
      ]);

    // Get recent XP activity
    const recentActivity = await XPLog.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("sourceId");

    res.json({
      success: true,
      data: {
        quests: {
          daily: dailyQuests,
          weekly: weeklyQuests,
          boss: bossQuests,
          completedToday,
        },
        progression: {
          primaryClass: user?.onboarding?.primaryClass || null,
          dualClassUnlocked: Boolean(user?.onboarding?.dualClassUnlocked),
          dualClassUnlockStreak: user?.onboarding?.dualClassUnlockStreak || 60,
          shieldCharges: user?.streaks?.shieldCharges ?? 1,
          shieldLastUsedAt: user?.streaks?.shieldLastUsedAt || null,
          shieldedDates: user?.streaks?.shieldedDates || [],
          shieldAutoUse: user?.preferences?.shieldAutoUse !== false,
          canUseShieldNow,
          missingShieldDates,
          recoveryQuestCreated: Boolean(recoveryQuest),
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({ message: "Server error fetching dashboard data" });
  }
};

export const getGoogleCalendarAuthUrl = async (req, res) => {
  try {
    const authUrl = buildGoogleCalendarAuthUrl(req.user.id);
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error("Generate Google Calendar auth URL error:", error);
    res.status(500).json({ message: "Failed to generate Google Calendar auth URL" });
  }
};

export const googleCalendarCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${clientUrl}/calendar?googleCalendar=error`);
    }

    const { userId, tokens, calendarEmail } = await exchangeGoogleCalendarCode(
      code,
      state
    );

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${clientUrl}/calendar?googleCalendar=error`);
    }

    user.integrations = user.integrations || {};
    user.integrations.googleCalendar = {
      connected: true,
      email: calendarEmail,
      accessToken: tokens.access_token,
      refreshToken:
        tokens.refresh_token || user.integrations?.googleCalendar?.refreshToken,
      scope: tokens.scope,
      expiryDate: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : user.integrations?.googleCalendar?.expiryDate,
    };

    await user.save();

    return res.redirect(`${clientUrl}/calendar?googleCalendar=connected`);
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    return res.redirect(`${clientUrl}/calendar?googleCalendar=error`);
  }
};

export const getGoogleCalendarStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("integrations.googleCalendar");
    const integration = user?.integrations?.googleCalendar;

    res.json({
      success: true,
      data: {
        connected: Boolean(integration?.connected),
        email: integration?.email || null,
      },
    });
  } catch (error) {
    console.error("Get Google Calendar status error:", error);
    res.status(500).json({ message: "Failed to get Google Calendar status" });
  }
};

export const disconnectGoogleCalendar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.integrations = user.integrations || {};
    user.integrations.googleCalendar = {
      connected: false,
      email: null,
      accessToken: null,
      refreshToken: null,
      scope: null,
      expiryDate: null,
    };

    await user.save();

    res.json({
      success: true,
      message: "Google Calendar disconnected",
    });
  } catch (error) {
    console.error("Disconnect Google Calendar error:", error);
    res.status(500).json({ message: "Failed to disconnect Google Calendar" });
  }
};

export const syncQuestToGoogleCalendar = async (req, res) => {
  try {
    const [user, quest] = await Promise.all([
      User.findById(req.user.id),
      Quest.findOne({ _id: req.params.id, user: req.user.id }),
    ]);

    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    if (!user?.integrations?.googleCalendar?.connected) {
      return res.status(400).json({ message: "Google Calendar is not connected" });
    }

    const syncedEvent = await syncQuestWithGoogleCalendar(user, quest);
    if (syncedEvent?.id) {
      quest.googleCalendarEventId = syncedEvent.id;
      await quest.save();
    }

    res.json({
      success: true,
      message: "Quest synced to Google Calendar",
      data: {
        eventId: syncedEvent?.id || quest.googleCalendarEventId,
      },
    });
  } catch (error) {
    console.error("Sync quest to Google Calendar error:", error);
    res.status(500).json({ message: "Failed to sync quest to Google Calendar" });
  }
};

export const syncAllQuestsToGoogleCalendar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.integrations?.googleCalendar?.connected) {
      return res.status(400).json({ message: "Google Calendar is not connected" });
    }

    const quests = await Quest.find({
      user: req.user.id,
      status: { $ne: "completed" },
      $or: [{ dueDate: { $ne: null } }, { startDateTime: { $ne: null } }],
    });

    let synced = 0;
    for (const quest of quests) {
      try {
        const event = await syncQuestWithGoogleCalendar(user, quest);
        if (event?.id) {
          quest.googleCalendarEventId = event.id;
          await quest.save();
          synced += 1;
        }
      } catch (syncError) {
        console.error(`Sync failed for quest ${quest._id}:`, syncError.message);
      }
    }

    res.json({
      success: true,
      message: `Synced ${synced} quest(s) to Google Calendar`,
      data: { synced, total: quests.length },
    });
  } catch (error) {
    console.error("Sync all quests to Google Calendar error:", error);
    res.status(500).json({ message: "Failed to sync quests to Google Calendar" });
  }
};
