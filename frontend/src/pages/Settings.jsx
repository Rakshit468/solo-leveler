import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Volume2, Bell, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    volume: parseInt(localStorage.getItem("volume") || "80"),
    brightness: parseInt(localStorage.getItem("brightness") || "100"),
    notifications: {
      questReminders: localStorage.getItem("notif_quest") !== "false",
      levelUps: localStorage.getItem("notif_level") !== "false",
      achievements: localStorage.getItem("notif_achievement") !== "false",
      dueDates: localStorage.getItem("notif_due") !== "false",
    },
  });

  const handleNotificationChange = (key) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    };
    setSettings(newSettings);
    localStorage.setItem(`notif_${key === "questReminders" ? "quest" : key === "levelUps" ? "level" : key === "achievements" ? "achievement" : "due"}`, !settings.notifications[key]);
    toast.success("Notification settings updated!");
  };

  const handleVolumeChange = (value) => {
    setSettings({ ...settings, volume: value });
    localStorage.setItem("volume", value);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 sm:text-3xl">
          <SettingsIcon className="h-8 w-8 text-primary-400" />
          Configuration Chamber
        </h1>
        <p className="text-gray-400 mt-2">Customize your hero's experience</p>
      </div>

      {/* Notification Settings */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-400" />
          Notifications
        </h2>

        <div className="space-y-3">
          {[
            {
              key: "questReminders",
              label: "Quest Reminders",
              description: "Get alerts when quest deadlines are approaching",
              icon: "🎯",
            },
            {
              key: "levelUps",
              label: "Level Up Notifications",
              description: "Celebrate when you reach a new level",
              icon: "⭐",
            },
            {
              key: "achievements",
              label: "Achievement Unlocked",
              description: "See when you unlock new abilities and skills",
              icon: "🏆",
            },
            {
              key: "dueDates",
              label: "Due Date Alerts",
              description: "Reminders when tasks are almost due",
              icon: "⏰",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="bg-dark-700 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-dark-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-sm text-gray-400 break-words">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange(item.key)}
                className={`relative w-14 h-8 rounded-full transition-all self-end sm:self-auto ${
                  settings.notifications[item.key]
                    ? "bg-success-500"
                    : "bg-gray-600"
                }`}
              >
                <motion.div
                  layout
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{
                    x: settings.notifications[item.key] ? 24 : 0,
                  }}
                  transition={{ type: "spring", damping: 15 }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Audio Settings */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-green-400" />
          Audio
        </h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300 font-medium">Master Volume</label>
              <span className="text-primary-400 font-bold">{settings.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Account Settings */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Lock className="h-5 w-5 text-red-400" />
          Account
        </h2>

        <div className="space-y-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <p className="text-gray-300 font-medium mb-2">Current Account</p>
            <p className="text-gray-400">{user?.email}</p>
            <p className="text-gray-500 text-sm mt-2">Username: {user?.username}</p>
          </div>

          <div className="bg-dark-700 rounded-lg p-4">
            <p className="text-gray-300 font-medium mb-3">Quick Stats</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Level</p>
                <p className="text-white font-bold text-lg">{user?.character?.level}</p>
              </div>
              <div>
                <p className="text-gray-500">Character</p>
                <p className="text-white font-bold">{user?.character?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Beta Features */}
      <motion.div
        className="card border border-primary-500/50 bg-gradient-to-r from-dark-800 to-dark-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-primary-400 text-sm font-bold mb-2">🚀 BETA FEATURES</p>
        <h3 className="text-lg font-bold text-white mb-2">Coming Soon</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>✨ Battle Pass System</li>
          <li>⚔️ PvP Leaderboards</li>
          <li>🎭 Character Customization</li>
          <li>🗺️ Dungeon Raids</li>
          <li>🎁 Daily Rewards & Quests</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default Settings;
