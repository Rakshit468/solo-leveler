import User from "../models/User.js";
import Quest from "../models/Quest.js";
import XPLog from "../models/XPLog.js";
import LeaderboardEntry from "../models/Leaderboard.js";

export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get quest statistics
    const questStats = await Quest.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get XP history for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const xpHistory = await XPLog.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalXP: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Get category breakdown
    const categoryStats = await Quest.aggregate([
      {
        $match: {
          user: user._id,
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalXP: { $sum: "$xpReward" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        user: {
          character: user.character,
          achievements: user.achievements,
          streaks: user.streaks,
        },
        questStats,
        xpHistory,
        categoryStats,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Server error fetching stats" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const { type = "overall", limit = 50 } = req.query;

    let leaderboard;

    if (type === "overall") {
      leaderboard = await User.find({ isActive: true })
        .select(
          "username character.name character.level character.xp character.totalStats"
        )
        .sort({ "character.level": -1, "character.xp": -1 })
        .limit(parseInt(limit));
    } else {
      // Get leaderboard from LeaderboardEntry collection for specific periods
      leaderboard = await LeaderboardEntry.find({ type })
        .populate("user", "username character.name character.avatar")
        .sort({ rank: 1 })
        .limit(parseInt(limit));
    }

    // Add rank to overall leaderboard
    if (type === "overall") {
      leaderboard = leaderboard.map((user, index) => ({
        ...user.toObject(),
        rank: index + 1,
      }));
    }

    res.json({
      success: true,
      data: {
        type,
        entries: leaderboard,
      },
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ message: "Server error fetching leaderboard" });
  }
};

export const addXP = async (req, res) => {
  try {
    const { amount, reason, source = "admin" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid XP amount" });
    }

    const user = await User.findById(req.user.id);
    const { leveledUp, newLevel, newXP } = await user.addXP(
      amount,
      source,
      null, // No specific sourceId for manual addition
      reason || "Manual XP addition"
    );

    // Emit real-time update
    if (req.io) {
      req.io.emit("xpGained", {
        userId: user._id,
        xpGained: amount,
        leveledUp,
        newLevel,
      });
    }

    res.json({
      success: true,
      message: "XP added successfully",
      data: {
        xpGained: amount,
        leveledUp,
        newLevel,
        newXP,
      },
    });
  } catch (error) {
    console.error("Add XP error:", error);
    res.status(500).json({ message: "Server error adding XP" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "30" } = req.query;
    const daysBack = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // XP over time
    const xpOverTime = await XPLog.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalXP: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Quest completion rate by category
    const categoryPerformance = await Quest.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            category: "$category",
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.category",
          total: { $sum: "$count" },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "completed"] }, "$count", 0],
            },
          },
        },
      },
      {
        $project: {
          category: "$_id",
          total: 1,
          completed: 1,
          completionRate: {
            $multiply: [{ $divide: ["$completed", "$total"] }, 100],
          },
        },
      },
    ]);

    // Streak analysis
    const streakData = await XPLog.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          hasActivity: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        xpOverTime,
        categoryPerformance,
        streakData,
        period: daysBack,
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ message: "Server error fetching analytics" });
  }
};
