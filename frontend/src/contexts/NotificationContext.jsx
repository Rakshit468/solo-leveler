import React, { useState, useCallback, useContext } from "react";

const NotificationContext = React.createContext();
const MAX_NOTIFICATIONS = 50;

const buildFingerprint = (notification = {}) => {
  const type = notification.type || "info";
  const title = notification.title || "";
  const message = notification.message || "";
  return `${type}:${title}:${message}`.toLowerCase();
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem("notifications");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, MAX_NOTIFICATIONS).map((item) => ({
        ...item,
        timestamp: item?.timestamp ? new Date(item.timestamp) : new Date(),
      }));
    } catch {
      return [];
    }
  });

  const persistNotifications = useCallback((items) => {
    try {
      localStorage.setItem(
        "notifications",
        JSON.stringify(
          items.slice(0, MAX_NOTIFICATIONS).map((item) => ({
            ...item,
            timestamp: item?.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
          }))
        )
      );
    } catch {
      // Ignore quota or serialization issues.
    }
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const fingerprint = buildFingerprint(notification);
    const newNotification = {
      id,
      timestamp: new Date(),
      fingerprint,
      ...notification,
    };

    setNotifications((prev) => {
      const withoutDuplicate = prev.filter((item) => item.fingerprint !== fingerprint);
      const next = [newNotification, ...withoutDuplicate].slice(0, MAX_NOTIFICATIONS);
      persistNotifications(next);
      return next;
    });

    // Auto-remove after 8 seconds if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        setNotifications((prev) => {
          const next = prev.filter((n) => n.id !== id);
          persistNotifications(next);
          return next;
        });
      }, 8000);
    }

    return id;
  }, [persistNotifications]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persistNotifications(next);
      return next;
    });
  }, [persistNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    persistNotifications([]);
  }, [persistNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
