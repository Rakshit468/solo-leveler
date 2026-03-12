import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Bell, CheckCircle, AlertCircle, Zap, Lock } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

const getNotificationIcon = (type) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-success-400" />;
    case "warning":
      return <AlertCircle className="h-5 w-5 text-warning-400" />;
    case "skill":
      return <Lock className="h-5 w-5 text-primary-400" />;
    case "quest":
      return <Zap className="h-5 w-5 text-accent-400" />;
    default:
      return <Bell className="h-5 w-5 text-gray-400" />;
  }
};

const NotificationPanel = ({ isOpen, onClose }) => {
  const { notifications, removeNotification, clearAll } = useNotifications();

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed right-0 top-0 h-screen w-96 bg-dark-800 border-l border-dark-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary-400" />
                <h2 className="text-xl font-bold text-white">Notifications</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-2">Complete quests and unlock skills to see updates here!</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-dark-700 rounded-lg p-4 border border-dark-600 hover:border-dark-500 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-sm">
                              {notification.title}
                            </h3>
                            <p className="text-gray-400 text-sm mt-1 break-words">
                              {notification.message}
                            </p>
                            <p className="text-gray-500 text-xs mt-2">
                              {notification.timestamp?.toLocaleTimeString()}
                            </p>
                          </div>
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-dark-600 rounded"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-dark-700 p-4">
                <button
                  onClick={clearAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationPanel;
