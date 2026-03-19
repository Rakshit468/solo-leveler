import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, // base URL includes /api
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to always attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API (paths adjusted — no leading /api)
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (profileData) => api.put("/auth/profile", profileData),
};

// Quest API
export const questAPI = {
  getQuests: (params = {}) => api.get("/quests", { params }),
  createQuest: (questData) => api.post("/quests", questData),
  updateQuest: (id, questData) => api.put(`/quests/${id}`, questData),
  completeQuest: (id) => api.post(`/quests/${id}/complete`),
  deleteQuest: (id) => api.delete(`/quests/${id}`),
  getDashboardData: () => api.get("/quests/dashboard"),
  getGoogleCalendarAuthUrl: () => api.get("/quests/google-calendar/auth-url"),
  getGoogleCalendarStatus: () => api.get("/quests/google-calendar/status"),
  disconnectGoogleCalendar: () => api.delete("/quests/google-calendar/disconnect"),
  syncAllToGoogleCalendar: () => api.post("/quests/google-calendar/sync-all"),
  syncQuestToGoogleCalendar: (id) => api.post(`/quests/${id}/google-calendar/sync`),
};

// Stats API
export const statsAPI = {
  getStats: () => api.get("/stats"),
  getLeaderboard: (params = {}) => api.get("/stats/leaderboard", { params }),
  addXP: (xpData) => api.post("/stats/xp", xpData),
  getAnalytics: (params = {}) => api.get("/stats/analytics", { params }),
};

// Skills API
export const skillsAPI = {
  getSkills: (params = {}) => api.get("/skills", { params }),
  getUserSkills: () => api.get("/skills/user"),
  unlockSkill: (id) => api.post(`/skills/${id}/unlock`),
};

export default api;
