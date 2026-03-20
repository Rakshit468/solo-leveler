import React, { useMemo, useState } from "react";
import { Play, Timer } from "lucide-react";
import { questAPI } from "../services/api";
import toast from "react-hot-toast";
import { useFocusTimer } from "../contexts/FocusTimerContext";

const formatClock = (seconds) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const FocusSessionModal = ({ quest, onClose, onSessionComplete }) => {
  const { startTimer } = useFocusTimer();
  const [preset, setPreset] = useState(quest?.estimatedMinutes || 25);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  const activeMinutes = useMemo(() => {
    if (preset === "custom") {
      return Math.max(5, Math.min(120, Number(customMinutes || 30)));
    }
    return Number(preset);
  }, [preset, customMinutes]);

  const handleStart = async () => {
    try {
      setSaving(true);
      await questAPI.startFocusSession(quest._id, { presetMinutes: activeMinutes });
      startTimer({
        questId: quest._id,
        questTitle: quest.title,
        presetMinutes: activeMinutes,
      });
      toast.success("Focus started. Timer pinned at the top.");
      onSessionComplete?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start focus session");
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
            <span className="text-xs uppercase tracking-wide">Selected Duration</span>
          </div>
          <div className="text-4xl font-bold text-white">{formatClock(activeMinutes * 60)}</div>
          <p className="mt-2 text-xs text-gray-400">After starting, this timer stays visible at the top across pages.</p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="btn">
            Close
          </button>
          <button type="button" onClick={handleStart} disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Focus
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusSessionModal;
