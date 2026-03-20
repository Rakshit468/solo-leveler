import React, { useEffect, useMemo, useState } from "react";
import { Pause, Play, Square, Timer } from "lucide-react";
import { questAPI } from "../services/api";
import toast from "react-hot-toast";

const formatClock = (seconds) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const FocusSessionModal = ({ quest, onClose, onSessionComplete }) => {
  const [preset, setPreset] = useState(quest?.estimatedMinutes || 25);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState((quest?.estimatedMinutes || 25) * 60);
  const [saving, setSaving] = useState(false);

  const activeMinutes = useMemo(() => {
    if (preset === "custom") {
      return Math.max(5, Math.min(120, Number(customMinutes || 30)));
    }
    return Number(preset);
  }, [preset, customMinutes]);

  useEffect(() => {
    setRemainingSeconds(activeMinutes * 60);
  }, [activeMinutes]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const handleStart = async () => {
    try {
      setSaving(true);
      await questAPI.startFocusSession(quest._id, { presetMinutes: activeMinutes });
      setHasStarted(true);
      setIsRunning(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start focus session");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      setSaving(true);
      await questAPI.cancelFocusSession(quest._id);
      toast("Focus session cancelled");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel focus session");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      const spentMinutes = Math.max(1, Math.round((activeMinutes * 60 - remainingSeconds) / 60));
      const response = await questAPI.completeFocusSession(quest._id, {
        durationMinutes: spentMinutes,
        presetMinutes: activeMinutes,
      });
      if (response.data?.success) {
        toast.success(`Focus complete! +${response.data?.data?.xpGained || 0} XP`);
        onSessionComplete?.(response.data?.data);
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not complete focus session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Focus Mode</h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-white">
            Close
          </button>
        </div>

        <p className="text-sm text-gray-300">{quest.title}</p>

        <div className="mt-4 flex items-center gap-2">
          {[25, 50].map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-md px-3 py-1 text-sm ${preset === value ? "bg-primary-500 text-white" : "bg-dark-700 text-gray-300"}`}
              onClick={() => setPreset(value)}
              disabled={isRunning}
            >
              {value}m
            </button>
          ))}
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-sm ${preset === "custom" ? "bg-primary-500 text-white" : "bg-dark-700 text-gray-300"}`}
            onClick={() => setPreset("custom")}
            disabled={isRunning}
          >
            Custom
          </button>
          {preset === "custom" && (
            <input
              type="number"
              min={5}
              max={120}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
              className="input h-9 w-20"
              disabled={isRunning}
            />
          )}
        </div>

        <div className="mt-6 rounded-lg bg-dark-900 p-4 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-gray-400">
            <Timer className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Session Timer</span>
          </div>
          <div className="text-4xl font-bold text-white">{formatClock(remainingSeconds)}</div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {!hasStarted ? (
            <button type="button" onClick={handleStart} disabled={saving} className="btn-primary inline-flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              disabled={saving}
              className="btn-secondary inline-flex items-center gap-2"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Pause" : "Resume"}
            </button>
          )}

          <button type="button" onClick={handleComplete} disabled={saving} className="btn-success">
            Complete
          </button>

          <button type="button" onClick={handleCancel} disabled={saving} className="btn inline-flex items-center gap-2">
            <Square className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusSessionModal;
