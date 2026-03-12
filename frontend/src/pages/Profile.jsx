import React, { useState } from "react";
import { motion } from "framer-motion";
import { Edit, Save, X, User, Mail, Crown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const avatarOptions = [
  "default-avatar.png",
  "warrior-avatar.svg",
  "mage-avatar.svg",
  "rogue-avatar.svg",
  "paladin-avatar.svg",
  "archer-avatar.svg",
  "healer-avatar.svg",
  "knight-avatar.svg",
  "ninja-avatar.svg",
  "samurai-avatar.svg",
];

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    characterName: user?.character?.name || "",
    avatar: user?.character?.avatar || "default-avatar.png",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateProfile({
        characterName: formData.characterName,
        avatar: formData.avatar,
      });
      if (result.success) {
        toast.success("Profile updated successfully!");
        setEditing(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      characterName: user?.character?.name || "",
      avatar: user?.character?.avatar || "default-avatar.png",
    });
    setEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 mt-2">
          Manage your character and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Character Card */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="card text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center overflow-hidden">
                <img
                  src={`/avatars/${
                    user?.character?.avatar || "default-avatar.png"
                  }`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {user?.character?.level >= 10 && (
                <div className="absolute -top-2 -right-2">
                  <Crown className="h-8 w-8 text-accent-500" />
                </div>
              )}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 flex items-center bg-dark-700 px-4 py-1 rounded-full border-2 border-primary-500 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1 text-yellow-400"
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
                <span className="text-yellow-400 font-bold">
                  {user?.character?.gold ?? 0}
                </span>
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  name="characterName"
                  className="input text-center"
                  placeholder="Character Name"
                  value={formData.characterName}
                  onChange={handleChange}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Avatar Style
                  </label>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        className={`rounded-full border-2 p-1 w-16 h-16 flex items-center justify-center transition-all ${
                          formData.avatar === avatar
                            ? "border-primary-500 ring-2 ring-primary-400"
                            : "border-dark-700"
                        }`}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, avatar }))
                        }
                      >
                        <img
                          src={`/avatars/${avatar}`}
                          alt={avatar}
                          className="w-12 h-12 object-cover rounded-full"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 btn-success"
                  >
                    {loading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 btn btn-outline"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {user?.character?.name || user?.username}
                </h2>
                <p className="text-primary-400 mb-4">
                  Level {user?.character?.level} Hunter
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-primary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats & Info */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Character Stats */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">
              Character Stats
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-red-400">Strength</span>
                    <span className="font-bold text-white">
                      {user?.character?.stats?.strength || 10}
                    </span>
                  </div>
                  <div className="progress-bar h-2">
                    <div
                      className="bg-red-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((user?.character?.stats?.strength || 10) / 50) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-400">Intelligence</span>
                    <span className="font-bold text-white">
                      {user?.character?.stats?.intelligence || 10}
                    </span>
                  </div>
                  <div className="progress-bar h-2">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((user?.character?.stats?.intelligence || 10) / 50) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-green-400">Agility</span>
                    <span className="font-bold text-white">
                      {user?.character?.stats?.agility || 10}
                    </span>
                  </div>
                  <div className="progress-bar h-2">
                    <div
                      className="bg-green-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((user?.character?.stats?.agility || 10) / 50) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-yellow-400">Luck</span>
                    <span className="font-bold text-white">
                      {user?.character?.stats?.luck || 10}
                    </span>
                  </div>
                  <div className="progress-bar h-2">
                    <div
                      className="bg-yellow-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((user?.character?.stats?.luck || 10) / 50) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-dark-700">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Stats:</span>
                <span className="font-bold text-primary-400">
                  {user?.character?.totalStats || 40}
                </span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">
              Account Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-primary-400" />
                <span className="text-white">{user?.username}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-400" />
                <span className="text-white">{user?.email}</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Member Since</p>
                <p className="text-white">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {user?.achievements && user.achievements.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-6">
                Achievements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    className="bg-dark-700 rounded-lg p-4 flex items-center space-x-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <h4 className="font-medium text-white">
                        {achievement.name}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Unlocked{" "}
                          {new Date(
                            achievement.unlockedAt
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
