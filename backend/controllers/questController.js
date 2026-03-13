import Quest from "../models/Quest.js";
import User from "../models/User.js";
import XPLog from "../models/XPLog.js";
import { UserSkill } from "../models/Skill.js";
import { validationResult } from "express-validator";

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
      dueDate,
      recurrence,
      priority,
      tags: tags || [],
    });

    // Calculate XP using the model method
    quest.xpReward = quest.calculateXP();

    await quest.save();

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
      priority,
      tags,
    } = req.body;

    if (title) quest.title = title;
    if (description) quest.description = description;
    if (category) quest.category = category;
    if (difficulty) {
      quest.difficulty = difficulty;
      quest.xpReward = quest.calculateXP();
    }
    if (dueDate) quest.dueDate = dueDate;
    if (priority) quest.priority = priority;
    if (tags) quest.tags = tags;

    await quest.save();

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
    await quest.save();

    // Update user XP and level using the new model method
    const user = await User.findById(req.user.id);
    const { leveledUp, newLevel, newXP, newXPToNextLevel } = await user.addXP(
      quest.xpReward,
      "quest",
      quest._id,
      `Completed quest: ${quest.title}`,
      { questTitle: quest.title, multiplier: 1 }
    );

    // Update streak info
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
    const quest = await Quest.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: "Quest not found or you do not have permission to delete it",
      });
    }

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
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({ message: "Server error fetching dashboard data" });
  }
};
