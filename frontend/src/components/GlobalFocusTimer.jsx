import React from "react";
import { Check, Pause, Play, X } from "lucide-react";
import toast from "react-hot-toast";
import { useFocusTimer } from "../contexts/FocusTimerContext";
import { questAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const formatClock = (seconds) => {
  const safe = Math.max(0, seconds || 0);
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const GlobalFocusTimer = () => {
  const { user, updateUser } = useAuth();
  const { focusState, pauseTimer, resumeTimer, clearTimer, elapsedMinutes } = useFocusTimer();
  const [saving, setSaving] = React.useState(false);

  if (!focusState?.active) {
    return null;
  }

  const handleComplete = async () => {
    try {
      setSaving(true);
      const response = await questAPI.completeFocusSession(focusState.questId, {
        durationMinutes: elapsedMinutes,
        presetMinutes: focusState.presetMinutes,
      });

      if (response.data?.success) {
        const data = response.data?.data || {};
        updateUser({
          character: {
            ...user?.character,
            xp: data.newXP ?? user?.character?.xp,
            level: data.newLevel ?? user?.character?.level,
            xpToNextLevel: data.newXPToNextLevel ?? user?.character?.xpToNextLevel,
          },
        });
        toast.success(`Focus completed! +${data.xpGained || 0} XP`);
      }

      clearTimer();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not complete focus session");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      setSaving(true);
      await questAPI.cancelFocusSession(focusState.questId);
      toast("Focus session cancelled");
      clearTimer();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel focus session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 border-b border-primary-700/40 bg-dark-900/95 px-4 py-2 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-300">Focus Session Active</p>
          <p className="text-sm text-white">{focusState.questTitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-dark-700 px-3 py-1.5 font-mono text-base text-white">{formatClock(focusState.remainingSeconds)}</span>

          <button
            type="button"
            onClick={focusState.isRunning ? pauseTimer : resumeTimer}
            disabled={saving || focusState.remainingSeconds <= 0}
            className="btn-secondary inline-flex items-center gap-1 text-sm"
          >
            {focusState.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {focusState.isRunning ? "Pause" : "Resume"}
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="btn-success inline-flex items-center gap-1 text-sm"
          >
            <Check className="h-4 w-4" />
            Complete
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="btn inline-flex items-center gap-1 text-sm"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalFocusTimer;
