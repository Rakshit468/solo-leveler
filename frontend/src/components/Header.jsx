import React, { useState } from "react";
import { Bell, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import NotificationPanel from "./NotificationPanel";
import toast from "react-hot-toast";

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);

  const handleLogout = () => {
    toast.success("Logged out successfully");
    logout();
  };

  return (
    <header className="bg-dark-800 border-b border-dark-700 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 pr-3">
          <h2 className="text-lg font-bold text-white sm:text-2xl truncate">
            Welcome back, Hunter!
          </h2>
          <p className="hidden text-gray-400 sm:block">Ready to level up your life?</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user && (
            <>
              <div className="hidden items-center space-x-2 sm:flex">
                <img
                  src={`/avatars/${
                    user.character?.avatar || "default-avatar.png"
                  }`}
                  alt="avatar"
                  className="w-10 h-10 rounded-full border-2 border-primary-500 bg-dark-700 object-cover"
                />
                <span className="text-yellow-400 font-bold flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
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
                  {user.character?.gold ?? 0}
                </span>
              </div>
            </>
          )}
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => navigate("/settings")}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      <NotificationPanel isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </header>
  );
};

export default Header;
