import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "activeFocusTimer";

const FocusTimerContext = createContext(null);

export const useFocusTimer = () => {
  const context = useContext(FocusTimerContext);
  if (!context) {
    throw new Error("useFocusTimer must be used within a FocusTimerProvider");
  }
  return context;
};

const getRemainingFromEndAt = (endAtMs) => Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));

export const FocusTimerProvider = ({ children }) => {
  const [focusState, setFocusState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { active: false };
      }

      const parsed = JSON.parse(raw);
      if (!parsed?.active) {
        return { active: false };
      }

      if (parsed.isRunning && parsed.endAtMs) {
        const remainingSeconds = getRemainingFromEndAt(parsed.endAtMs);
        return {
          ...parsed,
          remainingSeconds,
          isRunning: remainingSeconds > 0,
        };
      }

      return parsed;
    } catch {
      return { active: false };
    }
  });

  useEffect(() => {
    if (!focusState?.active || !focusState?.isRunning || !focusState?.endAtMs) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setFocusState((prev) => {
        if (!prev?.active || !prev?.isRunning || !prev?.endAtMs) {
          return prev;
        }

        const remainingSeconds = getRemainingFromEndAt(prev.endAtMs);
        if (remainingSeconds <= 0) {
          return {
            ...prev,
            remainingSeconds: 0,
            isRunning: false,
            endAtMs: null,
          };
        }

        return {
          ...prev,
          remainingSeconds,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [focusState?.active, focusState?.isRunning, focusState?.endAtMs]);

  useEffect(() => {
    if (!focusState?.active) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(focusState));
  }, [focusState]);

  const startTimer = ({ questId, questTitle, presetMinutes = 25 }) => {
    const totalSeconds = Math.max(300, Math.min(7200, Number(presetMinutes) * 60));
    setFocusState({
      active: true,
      questId,
      questTitle,
      presetMinutes: Number(presetMinutes),
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: true,
      endAtMs: Date.now() + totalSeconds * 1000,
    });
  };

  const pauseTimer = () => {
    setFocusState((prev) => {
      if (!prev?.active || !prev?.isRunning || !prev?.endAtMs) {
        return prev;
      }

      return {
        ...prev,
        remainingSeconds: getRemainingFromEndAt(prev.endAtMs),
        isRunning: false,
        endAtMs: null,
      };
    });
  };

  const resumeTimer = () => {
    setFocusState((prev) => {
      if (!prev?.active || prev?.isRunning || !prev?.remainingSeconds) {
        return prev;
      }

      return {
        ...prev,
        isRunning: true,
        endAtMs: Date.now() + prev.remainingSeconds * 1000,
      };
    });
  };

  const clearTimer = () => {
    setFocusState({ active: false });
  };

  const elapsedMinutes = useMemo(() => {
    if (!focusState?.active) {
      return 0;
    }

    const elapsedSeconds = Math.max(0, (focusState.totalSeconds || 0) - (focusState.remainingSeconds || 0));
    return Math.max(1, Math.round(elapsedSeconds / 60));
  }, [focusState]);

  const value = {
    focusState,
    startTimer,
    pauseTimer,
    resumeTimer,
    clearTimer,
    elapsedMinutes,
  };

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
};
