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

export const toDateKey = (value) => startOfDay(value).toISOString().slice(0, 10);

const addDays = (value, days) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const dateKeyToDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

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

export const mergeActiveDateSets = (activityDateKeys = [], shieldedDateKeys = []) => {
  return new Set([...(activityDateKeys || []), ...(shieldedDateKeys || [])]);
};

export const getMostRecentActiveDateKey = (activeDateSet) => {
  const activeKeys = [...(activeDateSet || [])].sort();
  if (activeKeys.length === 0) {
    return null;
  }

  return activeKeys[activeKeys.length - 1];
};

export const computeCurrentStreakFromDateSet = (activeDateSet, now = new Date()) => {
  let streak = 0;
  let cursor = startOfDay(now);

  while (activeDateSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

export const getRecentMissingDateKeys = (activeDateSet, now = new Date(), daysBack = 45) => {
  const keys = [];
  let cursor = addDays(startOfDay(now), -1);

  for (let i = 0; i < daysBack; i += 1) {
    const key = toDateKey(cursor);
    if (!activeDateSet.has(key)) {
      keys.push(key);
    }
    cursor = addDays(cursor, -1);
  }

  return keys;
};

export const applyShieldDate = (user, targetDateKey, now = new Date()) => {
  const streaks = user.streaks || {};
  if ((streaks.shieldCharges || 0) <= 0) {
    return false;
  }

  const todayKey = toDateKey(now);
  if (targetDateKey >= todayKey) {
    return false;
  }

  const shielded = new Set(streaks.shieldedDates || []);
  if (shielded.has(targetDateKey)) {
    return false;
  }

  shielded.add(targetDateKey);
  streaks.shieldedDates = [...shielded].sort();
  streaks.shieldCharges = 0;
  streaks.shieldLastUsedAt = now;
  user.streaks = streaks;

  return true;
};

export const applyAutoShieldForYesterdayGap = (user, activeDateSet, now = new Date()) => {
  if (user?.preferences?.shieldAutoUse === false) {
    return { usedShield: false, targetDate: null };
  }

  const streaks = user?.streaks || {};
  if ((streaks.shieldCharges || 0) <= 0) {
    return { usedShield: false, targetDate: null };
  }

  const yesterdayKey = toDateKey(addDays(now, -1));
  const dayBeforeYesterdayKey = toDateKey(addDays(now, -2));

  if (activeDateSet.has(yesterdayKey)) {
    return { usedShield: false, targetDate: null };
  }

  if (!activeDateSet.has(dayBeforeYesterdayKey)) {
    return { usedShield: false, targetDate: null };
  }

  const consumed = applyShieldDate(user, yesterdayKey, now);
  if (!consumed) {
    return { usedShield: false, targetDate: null };
  }

  activeDateSet.add(yesterdayKey);
  return {
    usedShield: true,
    targetDate: yesterdayKey,
  };
};

export const hasActiveDate = (activeDateSet, dateKey) => activeDateSet.has(dateKey);

export const dateKeyIsValid = (dateKey) => {
  if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }
  const parsed = dateKeyToDate(dateKey);
  return !Number.isNaN(parsed.getTime()) && toDateKey(parsed) === dateKey;
};

export const computeDaysSinceLastActivity = (lastActivity, now = new Date()) => {
  if (!lastActivity) return 0;
  return getDaysBetween(lastActivity, now);
};

export const syncDualClassUnlock = (user) => {
  user.onboarding = user.onboarding || {};
  const unlockStreak = user.onboarding.dualClassUnlockStreak || 60;
  user.onboarding.dualClassUnlocked = (user.streaks?.current || 0) >= unlockStreak;
};
