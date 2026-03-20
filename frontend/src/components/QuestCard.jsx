import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, Check, Clock, Flame, Star, Target, Timer } from "lucide-react";
import { questAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import toast from "react-hot-toast";
import clsx from "clsx";
import FocusSessionModal from "./FocusSessionModal";

const difficultyColors = {
  easy: "text-green-400 bg-green-400/20",
  medium: "text-yellow-400 bg-yellow-400/20",
  hard: "text-orange-400 bg-orange-400/20",
  legendary: "text-purple-400 bg-purple-400/20",
};

const typeIcons = {
  daily: Clock,
  weekly: Target,
  boss: Star,
  custom: Target,
};

const QuestCard = ({ quest, onQuestComplete }) => {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = React.useState(false);
  const [focusOpen, setFocusOpen] = React.useState(false);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [rescheduleSaving, setRescheduleSaving] = React.useState(false);
  const [rescheduleAt, setRescheduleAt] = React.useState(() => {
    const baseDate = quest?.startDateTime || quest?.dueDate || new Date();
    const parsed = new Date(baseDate);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  const Icon = typeIcons[quest.type];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await questAPI.completeQuest(quest._id);
      if (response.data.success) {
        const { xpGained, leveledUp, newLevel, newXP } = response.data.data;

        // Add notification
        addNotification({
          type: "quest",
          title: "Quest Completed!",
          message: `${quest.title} complete! +${xpGained} XP`,
          persistent: false,
        });

        // Add level up notification if applicable
        if (leveledUp) {
          addNotification({
            type: "success",
            title: "⭐ Level Up!",
            message: `You reached Level ${newLevel}!`,
            persistent: false,
          });
        }

        toast.success(
          <div>
            <p>Quest completed! +{xpGained} XP</p>
            {leveledUp && <p>🎉 Level up! You are now level {newLevel}!</p>}
          </div>
        );

        // Update user data (XP, level, streaks, and new stat progression)
        updateUser({
          character: {
            ...user?.character,
            xp: newXP,
            level: newLevel,
            xpToNextLevel: response.data.data.newXPToNextLevel,
            stats: response.data.data.updatedStats || user?.character?.stats,
            totalStats:
              (response.data.data.updatedStats?.strength || user?.character?.stats?.strength || 0) +
              (response.data.data.updatedStats?.intelligence || user?.character?.stats?.intelligence || 0) +
              (response.data.data.updatedStats?.productivity || user?.character?.stats?.productivity || user?.character?.stats?.agility || 0) +
              (response.data.data.updatedStats?.consistency || user?.character?.stats?.consistency || user?.character?.stats?.luck || 0),
          },
          streaks: response.data.data.streaks,
        });

        if (onQuestComplete) {
          onQuestComplete(quest._id);
        }
        // Dispatch events to reload dependent UI
        window.dispatchEvent(new Event("reload-analytics"));
        window.dispatchEvent(new Event("reload-skills"));
      }
    } catch (error) {
      console.error("Error completing quest:", error);
      toast.error("Failed to complete quest");
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = quest.status === "completed";
  const compareDate = quest.snoozeUntil || quest.startDateTime || quest.dueDate;
  const isOverdue =
    compareDate && new Date(compareDate) < new Date() && !isCompleted;

  const handleReschedule = async () => {
    if (!rescheduleAt) {
      toast.error("Choose a date and time first");
      return;
    }

    try {
      setRescheduleSaving(true);
      const nextDate = new Date(rescheduleAt);
      if (Number.isNaN(nextDate.getTime())) {
        toast.error("Invalid date/time selected");
        return;
      }

      await questAPI.updateQuest(quest._id, {
        startDateTime: nextDate.toISOString(),
        snoozeUntil: nextDate.toISOString(),
      });

      toast.success("Quest rescheduled");
      setRescheduleOpen(false);
      onQuestComplete?.(quest._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reschedule quest");
    } finally {
      setRescheduleSaving(false);
    }
  };

  return (
    <>
      <motion.div
        className={clsx(
          "card hover-lift",
          isCompleted && "opacity-75 bg-success-500/10",
          isOverdue && "border-error-500/50"
        )}
        whileHover={{ scale: 1.02 }}
        layout
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Icon className="h-4 w-4 text-gray-400" />
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide",
                difficultyColors[quest.difficulty]
              )}
            >
              {quest.difficulty}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-dark-700 text-gray-300">
              {quest.type}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-error-500/20 px-2 py-1 text-xs font-medium text-error-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Overdue
              </span>
            )}
            {quest.isRecoveryQuest && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary-500/20 text-secondary-300">
                Recovery +bonus XP
              </span>
            )}
          </div>

          <h3
            className={clsx(
              "font-semibold mb-2",
              isCompleted ? "text-gray-400 line-through" : "text-white"
            )}
          >
            {quest.title}
          </h3>

          {quest.description && (
            <p className="text-gray-400 text-sm mb-3">{quest.description}</p>
          )}

          <div className="mb-3 flex items-center gap-2 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1 rounded-md bg-dark-700 px-2 py-1">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              Effort: {quest.effort || "medium"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-dark-700 px-2 py-1">
              <Timer className="h-3.5 w-3.5 text-primary-400" />
              {quest.estimatedMinutes || 25} min
            </span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-accent-500" />
                <span className="text-sm font-medium text-accent-500">
                  {quest.xpReward} XP
                </span>
              </div>

              {quest.dueDate && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span
                    className={clsx(
                      "text-sm",
                      isOverdue ? "text-error-400" : "text-gray-400"
                    )}
                  >
                    {quest.startDateTime
                      ? `${new Date(quest.startDateTime).toLocaleDateString()} ${new Date(
                          quest.startDateTime
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : new Date(quest.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {!isCompleted && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleOpen((prev) => !prev)}
                  className="btn text-sm inline-flex items-center gap-1"
                >
                  <CalendarClock className="h-4 w-4" />
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={() => setFocusOpen(true)}
                  className="btn-secondary text-sm"
                >
                  Start Focus
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="btn-success text-sm"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  )}
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center text-success-400 text-sm">
                <Check className="h-4 w-4 mr-1" />
                Completed
              </div>
            )}
          </div>

          {rescheduleOpen && !isCompleted && (
            <div className="mt-3 rounded-lg border border-dark-700 bg-dark-900/60 p-3">
              <p className="mb-2 text-xs text-gray-400">Pick a new date and time</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="datetime-local"
                  className="input"
                  value={rescheduleAt}
                  onChange={(event) => setRescheduleAt(event.target.value)}
                  disabled={rescheduleSaving}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleReschedule}
                  disabled={rescheduleSaving}
                >
                  {rescheduleSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </motion.div>

      {focusOpen && !isCompleted && (
        <FocusSessionModal
          quest={quest}
          onClose={() => setFocusOpen(false)}
          onSessionComplete={(data) => {
            updateUser({
              character: {
                ...user?.character,
                xp: data?.newXP ?? user?.character?.xp,
                level: data?.newLevel ?? user?.character?.level,
                xpToNextLevel: data?.newXPToNextLevel ?? user?.character?.xpToNextLevel,
              },
            });
          }}
        />
      )}
    </>
  );
};

export default QuestCard;
