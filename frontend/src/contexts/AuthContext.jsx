import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      if (authAPI && authAPI.defaults) {
        authAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const setAuthToken = (token) => {
    localStorage.setItem("token", token);
    setToken(token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    if (authAPI && authAPI.defaults) {
      authAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.data.success) {
        const { token, user } = response.data.data;
        setAuthToken(token);
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.data.success) {
        const payload = response.data.data || {};
        if (payload.requiresVerification) {
          return {
            success: true,
            requiresVerification: true,
            email: payload.email,
          };
        }

        const { token, user } = payload;
        setAuthToken(token);
        setUser(user);
        return { success: true, requiresVerification: false };
      }
    } catch (error) {
      console.error("Register error:", error);
      const timeoutMessage =
        error.code === "ECONNABORTED"
          ? "Request timed out. Please try again."
          : null;
      return {
        success: false,
        error: timeoutMessage || error.response?.data?.message || "Registration failed",
      };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      if (response.data.success) {
        setUser(response.data.data);
        return { success: true };
      }
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Profile update failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  const loginWithToken = async (token) => {
    setLoading(true);
    try {
      // 1. Set token in storage and headers
      setAuthToken(token);

      // 2. Fetch user profile
      const response = await authAPI.getProfile();
      if (response.data.success) {
        // 3. Set state
        setUser(response.data.data);
        setToken(token);
        setLoading(false);
        return { success: true };
      } else {
        throw new Error("Profile fetch was not successful");
      }
    } catch (error) {
      console.error("Login with token error:", error);
      logout(); // Clear bad token and user state
      setLoading(false);
      return {
        success: false,
        error: error.response?.data?.message || "Authentication failed",
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updateUser,
    loginWithToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
