import Challenge from "../models/Challenge.js";
import Quest from "../models/Quest.js";
import User from "../models/User.js";
import UserEvent from "../models/UserEvent.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const generateInviteCode = () => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

const buildChallengeStatus = (challenge) => {
  const now = new Date();
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);

  if (challenge.status === "cancelled") {
    return "cancelled";
  }

  if (end < now) {
    return "completed";
  }

  if (start > now) {
    return "active";
  }

  return "active";
};

const scoreParticipant = ({ completedQuests, activeDateKeys, recoveryLessDays, totalDays }) => {
  const consistencyRatio = totalDays > 0 ? activeDateKeys.size / totalDays : 0;
  const consistencyScore = consistencyRatio * 100;

  const score =
    consistencyScore * 2 +
    completedQuests * 10 +
    recoveryLessDays * 3;

  return Math.round(score);
};

const getDateRangeDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
};

export const createChallenge = async (req, res) => {
  try {
    const { title, startDate, endDate, rules } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: "title, startDate, and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ message: "Invalid challenge date range" });
    }

    const challenge = new Challenge({
      title,
      inviteCode: generateInviteCode(),
      creatorUserId: req.user.id,
      participantUserIds: [req.user.id],
      startDate: start,
      endDate: end,
      rules: {
        minQuestsPerDay: Math.max(1, Number(rules?.minQuestsPerDay || 1)),
      },
      status: "active",
    });

    await challenge.save();

    await UserEvent.create({
      user: req.user.id,
      eventName: "challenge_created",
      metadata: {
        challengeId: challenge._id,
      },
    });

    return res.status(201).json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error("Create challenge error:", error);
    return res.status(500).json({ message: "Server error creating challenge" });
  }
};

export const joinChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { inviteCode } = req.body || {};

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    if (buildChallengeStatus(challenge) !== "active") {
      return res.status(400).json({ message: "Challenge is not active" });
    }

    if (inviteCode && inviteCode !== challenge.inviteCode) {
      return res.status(400).json({ message: "Invalid invite code" });
    }

    const alreadyIn = challenge.participantUserIds.some(
      (participantId) => String(participantId) === String(req.user.id)
    );

    if (!alreadyIn) {
      challenge.participantUserIds.push(req.user.id);
      await challenge.save();
    }

    await UserEvent.create({
      user: req.user.id,
      eventName: "challenge_joined",
      metadata: {
        challengeId: challenge._id,
      },
    });

    return res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error("Join challenge error:", error);
    return res.status(500).json({ message: "Server error joining challenge" });
  }
};

export const leaveChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id);

    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    challenge.participantUserIds = challenge.participantUserIds.filter(
      (participantId) => String(participantId) !== String(req.user.id)
    );

    await challenge.save();

    await UserEvent.create({
      user: req.user.id,
      eventName: "challenge_left",
      metadata: {
        challengeId: challenge._id,
      },
    });

    return res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error("Leave challenge error:", error);
    return res.status(500).json({ message: "Server error leaving challenge" });
  }
};

export const getMyChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      participantUserIds: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate("creatorUserId", "username character.name")
      .lean();

    const withStatus = challenges.map((challenge) => ({
      ...challenge,
      computedStatus: buildChallengeStatus(challenge),
      isCreator: String(challenge.creatorUserId?._id || challenge.creatorUserId) === String(req.user.id),
    }));

    return res.json({
      success: true,
      data: withStatus,
    });
  } catch (error) {
    console.error("Get my challenges error:", error);
    return res.status(500).json({ message: "Server error fetching challenges" });
  }
};

export const getChallengeLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id).lean();

    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    const participants = await User.find({
      _id: { $in: challenge.participantUserIds },
      isActive: true,
    }).select("username character.name character.avatar streaks.current");

    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);

    const quests = await Quest.find({
      user: { $in: challenge.participantUserIds },
      status: "completed",
      completedAt: { $gte: startDate, $lte: endDate },
    }).select("user completedAt isRecoveryQuest");

    const byUser = new Map();
    participants.forEach((participant) => {
      byUser.set(String(participant._id), {
        user: participant,
        completedQuests: 0,
        activeDateKeys: new Set(),
        recoveryCount: 0,
      });
    });

    quests.forEach((quest) => {
      const key = String(quest.user);
      const bucket = byUser.get(key);
      if (!bucket) return;
      bucket.completedQuests += 1;
      bucket.activeDateKeys.add(toDateKey(quest.completedAt));
      if (quest.isRecoveryQuest) {
        bucket.recoveryCount += 1;
      }
    });

    const totalDays = getDateRangeDays(startDate, endDate);

    const entries = [...byUser.values()].map((bucket) => {
      const recoveryLessDays = Math.max(0, bucket.activeDateKeys.size - bucket.recoveryCount);
      const score = scoreParticipant({
        completedQuests: bucket.completedQuests,
        activeDateKeys: bucket.activeDateKeys,
        recoveryLessDays,
        totalDays,
      });

      return {
        userId: bucket.user._id,
        username: bucket.user.username,
        characterName: bucket.user.character?.name || bucket.user.username,
        avatar: bucket.user.character?.avatar || "shadow-monarch-avatar.svg",
        streak: bucket.user.streaks?.current || 0,
        completedQuests: bucket.completedQuests,
        activeDays: bucket.activeDateKeys.size,
        recoveryLessDays,
        score,
      };
    });

    entries.sort((a, b) => b.score - a.score || b.completedQuests - a.completedQuests || b.activeDays - a.activeDays);
    const ranked = entries.map((entry, index) => ({ ...entry, rank: index + 1 }));

    return res.json({
      success: true,
      data: {
        challenge,
        entries: ranked,
      },
    });
  } catch (error) {
    console.error("Get challenge leaderboard error:", error);
    return res.status(500).json({ message: "Server error fetching challenge leaderboard" });
  }
};
