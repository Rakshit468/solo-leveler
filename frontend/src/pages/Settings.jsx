import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Volume2, Eye, Bell, Moon, Sun, Palette, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    theme: localStorage.getItem("theme") || "dark",
    volume: parseInt(localStorage.getItem("volume") || "80"),
    brightness: parseInt(localStorage.getItem("brightness") || "100"),
    notifications: {
      questReminders: localStorage.getItem("notif_quest") !== "false",
      levelUps: localStorage.getItem("notif_level") !== "false",
      achievements: localStorage.getItem("notif_achievement") !== "false",
      dueDates: localStorage.getItem("notif_due") !== "false",
    },
    colorTheme: localStorage.getItem("colorTheme") || "purple",
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

  const handleThemeChange = (theme) => {
    setSettings({ ...settings, theme });
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    toast.success(`Theme changed to ${theme}!`);
  };

  const handleColorTheme = (color) => {
    setSettings({ ...settings, colorTheme: color });
    localStorage.setItem("colorTheme", color);
    toast.success(`Color theme changed to ${color}!`);
  };

  const colorOptions = [
    { name: "Purple", value: "purple", color: "from-purple-500 to-indigo-500" },
    { name: "Blue", value: "blue", color: "from-blue-500 to-cyan-500" },
    { name: "Red", value: "red", color: "from-red-500 to-pink-500" },
    { name: "Green", value: "green", color: "from-green-500 to-emerald-500" },
    { name: "Orange", value: "orange", color: "from-orange-500 to-red-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary-400" />
          Configuration Chamber
        </h1>
        <p className="text-gray-400 mt-2">Customize your hero's experience</p>
      </div>

      {/* Theme Settings */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-400" />
          Appearance
        </h2>

        {/* Theme Mode */}
        <div className="space-y-4">
          <div>
            <p className="text-gray-300 font-medium mb-3">Display Mode</p>
            <div className="flex gap-4">
              {["dark", "light"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleThemeChange(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    settings.theme === mode
                      ? "bg-primary-600 text-white border-primary-500"
                      : "bg-dark-700 text-gray-400 border-dark-600 hover:border-dark-500"
                  } border`}
                >
                  {mode === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
                </button>
              ))}
            </div>
          </div>

          {/* Color Theme */}
          <div className="pt-4 border-t border-dark-700">
            <p className="text-gray-300 font-medium mb-3">Primary Color</p>
            <div className="flex gap-3 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorTheme(color.value)}
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${color.color} transition-all transform hover:scale-110 ${
                    settings.colorTheme === color.value ? "ring-2 ring-offset-2 ring-white" : ""
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
              className="bg-dark-700 rounded-lg p-4 flex items-center justify-between hover:bg-dark-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange(item.key)}
                className={`relative w-14 h-8 rounded-full transition-all ${
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
        transition={{ delay: 0.3 }}
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
        transition={{ delay: 0.4 }}
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
        transition={{ delay: 0.5 }}
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
