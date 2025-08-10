import React from "react";
import { Bell, LogOut, Settings } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    toast.success("Logged out successfully");
    logout();
  };

  return (
    <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back, Hunter!
          </h2>
          <p className="text-gray-400">Ready to level up your life?</p>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <div className="flex items-center space-x-2">
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
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
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
    </header>
  );
};

export default Header;
