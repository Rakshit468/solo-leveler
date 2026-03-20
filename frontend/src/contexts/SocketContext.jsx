import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import toast from "react-hot-toast";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL, {
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("🔌 Connected to server");
        newSocket.emit("join", user.id || user._id);
      });

      newSocket.on("questCompleted", (data) => {
        if (String(data.userId) !== String(user.id || user._id)) {
          const message = data.questTitle
            ? `🎉 ${data.questTitle} completed by another hunter!`
            : "🎉 Another hunter completed a quest!";
          toast(message, {
            duration: 3000,
          });
          addNotification({
            type: "quest",
            title: "Quest activity",
            message,
          });
        }
      });

      newSocket.on("levelUp", (data) => {
        if (String(data.userId) !== String(user.id || user._id)) {
          const message = `⭐ A hunter leveled up to Level ${data.newLevel}!`;
          toast(message, {
            duration: 3000,
          });
          addNotification({
            type: "success",
            title: "Level up spotted",
            message,
          });
        }
      });

      newSocket.on("leaderboardUpdate", () => {
        // Refresh leaderboard data if needed
        console.log("📊 Leaderboard updated");
      });

      newSocket.on("disconnect", () => {
        console.log("🔌 Disconnected from server");
      });

      newSocket.on("reconnect", () => {
        toast.success("Connection restored");
        addNotification({
          type: "success",
          title: "Connection restored",
          message: "Real-time updates are active again.",
          persistent: false,
        });
      });

      newSocket.on("connect_error", () => {
        // Avoid noisy warning spam in notifications; socket.io will auto-retry.
      });

      setSocket(newSocket);

      return () => {
        newSocket.off("connect");
        newSocket.off("questCompleted");
        newSocket.off("levelUp");
        newSocket.off("leaderboardUpdate");
        newSocket.off("disconnect");
        newSocket.off("reconnect");
        newSocket.off("connect_error");
        newSocket.close();
        setSocket(null);
      };
    }
  }, [addNotification, user]);

  const emitEvent = (event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const value = {
    socket,
    emitEvent,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
