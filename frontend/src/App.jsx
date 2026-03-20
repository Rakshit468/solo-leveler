import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./contexts/AuthContext";

// Components
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Quests from "./pages/Quests";
import Calendar from "./pages/Calendar";
import Skills from "./pages/Skills";
import Leaderboard from "./pages/Leaderboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Challenges from "./pages/Challenges";
import ShareCard from "./pages/ShareCard";

function App() {
  const { user, loading } = useAuth();
  const hasPrimaryClass = Boolean(user?.onboarding?.primaryClass);
  const isProfileReady = Boolean(user?.onboarding?.completed && hasPrimaryClass);

  // Initialize theme on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/dashboard" />}
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/onboarding"
            element={
              user ? (
                isProfileReady ? <Navigate to="/dashboard" /> : <Onboarding />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              user ? (
                isProfileReady ? <Layout /> : <Navigate to="/onboarding" />
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/share-card" element={<ShareCard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: "bg-dark-800 text-white border border-primary-500",
            success: {
              className: "bg-success-500 text-white",
            },
            error: {
              className: "bg-error-500 text-white",
            },
          }}
        />
      </>
  );
}

export default App;
