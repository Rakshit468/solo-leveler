import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Star, TrendingUp } from "lucide-react";
import { statsAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import StateCard from "../components/StateCard";
import clsx from "clsx";

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedType, setSelectedType] = useState("overall");

  const leaderboardTypes = [
    { key: "overall", name: "Overall Ranking", icon: Trophy },
    { key: "weekly", name: "This Week", icon: TrendingUp },
    { key: "monthly", name: "This Month", icon: Star },
  ];

  useEffect(() => {
    loadLeaderboard();
  }, [selectedType]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      setError("");
      const response = await statsAPI.getLeaderboard({ type: selectedType });
      const normalizedEntries = response.data.data.entries.map(
        (entry, index) => {
          const userPart = entry.user || {};
          const characterPart = entry.character || userPart.character || {};
          return {
            id: entry._id || entry.id || index,
            username: entry.username || userPart.username || "Unknown Hunter",
            characterName:
              characterPart.name ||
              entry.username ||
              userPart.username ||
              "Unknown Hunter",
            avatar: characterPart.avatar || "shadow-monarch-avatar.svg",
            level: characterPart.level || entry.level || 0,
            xp: characterPart.xp || entry.score || 0,
            gold: characterPart.gold ?? 0,
            rank: entry.rank || index + 1,
          };
        }
      );
      setLeaderboard(normalizedEntries);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setError(error.response?.data?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-gray-400 font-bold">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-400 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-orange-500 to-orange-600";
      default:
        return "bg-dark-700";
    }
  };

  const isCurrentUser = (entry) => {
    if (!user) return false;
    return entry.id === (user.id || user._id);
  };

  const getUserRank = () => {
    const userEntry = leaderboard.find(isCurrentUser);
    return userEntry ? userEntry.rank : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <StateCard
        tone="error"
        title="Unable to load leaderboard"
        description={error}
        actionLabel="Retry"
        onAction={loadLeaderboard}
      />
    );
  }

  if (!leaderboard.length) {
    return (
      <StateCard
        title="No rankings yet"
        description="Complete a few quests and check back to see where hunters stand."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Leaderboard</h1>
        <p className="text-gray-400 mt-2">
          See how you stack up against other hunters
        </p>
      </div>

      {/* Type Selector */}
      <div className="flex space-x-1 overflow-x-auto bg-dark-800 p-1 rounded-lg">
        {leaderboardTypes.map((type) => (
          <button
            key={type.key}
            onClick={() => setSelectedType(type.key)}
            className={clsx(
              "flex-1 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2",
              selectedType === type.key
                ? "bg-primary-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-dark-700"
            )}
          >
            <type.icon className="h-4 w-4" />
            <span>{type.name}</span>
          </button>
        ))}
      </div>

      {/* User's Rank Card */}
      {getUserRank() && (
        <motion.div
          className="card border-primary-500/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  getRankBadgeColor(getUserRank())
                )}
              >
                {getRankIcon(getUserRank())}
              </div>
              <div>
                <h3 className="font-semibold text-white">Your Rank</h3>
                <p className="text-gray-400">
                  {user?.character?.name || user?.username}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary-400">
                #{getUserRank()}
              </div>
              <div className="text-sm text-gray-400">
                Level {user?.character?.level} • {user?.character?.xp} XP
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="hidden md:grid md:grid-cols-3 md:gap-4 md:mb-8">
          {/* 2nd Place */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg p-6 pb-8 relative">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center overflow-hidden border-2 border-primary-500">
                <img
                  src={`/avatars/${leaderboard[1]?.avatar || "shadow-monarch-avatar.svg"}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-semibold text-white truncate">
                {leaderboard[1]?.characterName}
              </h3>
              <p className="text-sm text-gray-300">
                Level {leaderboard[1]?.level}
              </p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <Medal className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-600 h-20 rounded-b-lg flex items-end justify-center pb-2">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg p-6 pb-8 relative">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center ring-4 ring-yellow-400 overflow-hidden border-2 border-primary-500">
                <img
                  src={`/avatars/${leaderboard[0]?.avatar || "shadow-monarch-avatar.svg"}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-semibold text-white truncate">
                {leaderboard[0]?.characterName}
              </h3>
              <p className="text-sm text-yellow-100">
                Level {leaderboard[0]?.level}
              </p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <Crown className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-yellow-600 h-24 rounded-b-lg flex items-end justify-center pb-2">
              <span className="text-3xl font-bold text-white">1</span>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-gradient-to-t from-orange-600 to-orange-500 rounded-t-lg p-6 pb-8 relative">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center overflow-hidden border-2 border-primary-500">
                <img
                  src={`/avatars/${leaderboard[2]?.avatar || "shadow-monarch-avatar.svg"}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-semibold text-white truncate">
                {leaderboard[2]?.characterName}
              </h3>
              <p className="text-sm text-orange-100">
                Level {leaderboard[2]?.level}
              </p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <Medal className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <div className="bg-orange-600 h-16 rounded-b-lg flex items-end justify-center pb-2">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6">All Rankings</h3>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.id}
              className={clsx(
                "flex flex-col gap-3 rounded-lg p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                isCurrentUser(entry)
                  ? "bg-primary-500/20 border border-primary-500/50"
                  : "bg-dark-700 hover:bg-dark-600"
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                    getRankBadgeColor(entry.rank)
                  )}
                >
                  {getRankIcon(entry.rank)}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center overflow-hidden border-2 border-primary-500">
                    <img
                      src={`/avatars/${entry.avatar}`}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="font-medium text-white">
                      {entry.characterName}
                    </h4>
                    <p className="text-sm text-gray-400">Level {entry.level}</p>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="font-semibold text-primary-400">
                  {entry.xp} XP
                </div>
                <div className="text-sm text-yellow-400 flex items-center sm:justify-end">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 1.343-3 3 0 1.657 1.343 3 3 3s3-1.343 3-3c0-1.657-1.343-3-3-3zm0 13c-4.418 0-8-3.582-8-8 0-4.418 3.582-8 8-8s8 3.582 8 8c0 4.418-3.582 8-8 8z"
                    />
                  </svg>
                  {entry.gold} Gold
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {leaderboard.length === 0 && (
        <div className="card text-center py-12">
          <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No rankings yet
          </h3>
          <p className="text-gray-400">
            Be the first to complete some quests and earn your place on the
            leaderboard!
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
