import React from "react";
import { motion } from "framer-motion";
import { Check, Clock, Star, Target } from "lucide-react";
import { questAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import toast from "react-hot-toast";
import clsx from "clsx";

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
  const { updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = React.useState(false);

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

        // Update user data (XP, level, streaks)
        updateUser({
          character: {
            xp: newXP,
            level: newLevel,
            xpToNextLevel: response.data.data.newXPToNextLevel,
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
  const isOverdue =
    quest.dueDate && new Date(quest.dueDate) < new Date() && !isCompleted;

  return (
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
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
                    {new Date(quest.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {!isCompleted && (
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
            )}

            {isCompleted && (
              <div className="flex items-center text-success-400 text-sm">
                <Check className="h-4 w-4 mr-1" />
                Completed
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestCard;
