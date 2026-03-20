import Quest from "../models/Quest.js";
import UserEvent from "../models/UserEvent.js";

export const TITLE_DEFINITIONS = [
  {
    key: "rookie_hunter",
    name: "Rookie Hunter",
    description: "Started the path of growth.",
    isUnlocked: () => true,
  },
  {
    key: "streak_reaper",
    name: "Streak Reaper",
    description: "Maintained a 7-day streak.",
    isUnlocked: async ({ user }) => (user?.streaks?.current || 0) >= 7,
  },
  {
    key: "focus_monarch",
    name: "Focus Monarch",
    description: "Completed 20 focus sessions.",
    isUnlocked: async ({ user }) => {
      const count = await UserEvent.countDocuments({
        user: user._id,
        eventName: "focus_completed",
      });
      return count >= 20;
    },
  },
  {
    key: "raid_commander",
    name: "Raid Commander",
    description: "Completed 100 quests.",
    isUnlocked: async ({ user }) => {
      const count = await Quest.countDocuments({
        user: user._id,
        status: "completed",
      });
      return count >= 100;
    },
  },
];

const ensureTitleShape = (user) => {
  user.hunterTitles = user.hunterTitles || {};
  if (!Array.isArray(user.hunterTitles.unlocked)) {
    user.hunterTitles.unlocked = [];
  }
  if (!user.hunterTitles.equippedKey) {
    user.hunterTitles.equippedKey = "rookie_hunter";
  }
};

export const syncHunterTitles = async (user) => {
  ensureTitleShape(user);

  const unlockedMap = new Map(
    (user.hunterTitles.unlocked || []).map((title) => [title.key, title])
  );

  for (const title of TITLE_DEFINITIONS) {
    const unlocked = await title.isUnlocked({ user });
    if (unlocked && !unlockedMap.has(title.key)) {
      unlockedMap.set(title.key, {
        key: title.key,
        name: title.name,
        description: title.description,
        unlockedAt: new Date(),
      });
    }
  }

  user.hunterTitles.unlocked = [...unlockedMap.values()];

  const hasEquipped = user.hunterTitles.unlocked.some(
    (title) => title.key === user.hunterTitles.equippedKey
  );
  if (!hasEquipped) {
    user.hunterTitles.equippedKey = "rookie_hunter";
  }
};

export const getEquippedTitle = (user) => {
  const equippedKey = user?.hunterTitles?.equippedKey;
  const unlocked = user?.hunterTitles?.unlocked || [];
  return unlocked.find((title) => title.key === equippedKey) || unlocked[0] || null;
};
