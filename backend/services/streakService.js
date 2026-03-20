const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDaysBetween = (fromDate, toDate) => {
  const from = startOfDay(fromDate).getTime();
  const to = startOfDay(toDate).getTime();
  return Math.floor((to - from) / DAY_MS);
};

export const refreshShield = (user, now = new Date()) => {
  const streaks = user.streaks || {};
  if (typeof streaks.shieldCharges !== "number") {
    streaks.shieldCharges = 1;
  }

  if (!streaks.shieldLastRefillAt) {
    streaks.shieldLastRefillAt = now;
    streaks.shieldCharges = 1;
    user.streaks = streaks;
    return;
  }

  const daysSinceRefill = getDaysBetween(streaks.shieldLastRefillAt, now);
  if (daysSinceRefill >= 30) {
    streaks.shieldCharges = 1;
    streaks.shieldLastRefillAt = now;
  }

  user.streaks = streaks;
};

export const applyShieldForMissedDay = (user, now = new Date()) => {
  refreshShield(user, now);

  const streaks = user.streaks || {};
  if (!streaks.lastActivity) {
    return { missedDays: 0, usedShield: false, brokeStreak: false };
  }

  const daysSinceActivity = getDaysBetween(streaks.lastActivity, now);
  if (daysSinceActivity <= 1) {
    return { missedDays: 0, usedShield: false, brokeStreak: false };
  }

  const missedDays = Math.max(1, daysSinceActivity - 1);

  if (daysSinceActivity === 2 && (streaks.shieldCharges || 0) > 0) {
    const yesterday = startOfDay(now);
    yesterday.setDate(yesterday.getDate() - 1);

    streaks.shieldCharges = 0;
    streaks.shieldLastUsedAt = now;
    streaks.lastActivity = yesterday;
    user.streaks = streaks;

    return { missedDays, usedShield: true, brokeStreak: false };
  }

  streaks.current = 0;
  user.streaks = streaks;

  return { missedDays, usedShield: false, brokeStreak: true };
};

export const syncDualClassUnlock = (user) => {
  user.onboarding = user.onboarding || {};
  const unlockStreak = user.onboarding.dualClassUnlockStreak || 60;
  user.onboarding.dualClassUnlocked = (user.streaks?.current || 0) >= unlockStreak;
};
