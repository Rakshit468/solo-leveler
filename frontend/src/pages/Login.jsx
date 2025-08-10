import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sword, Mail, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      toast.success("Welcome back, Hunter!");
      navigate("/dashboard");
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  const handleGoogleLogin = () => {
    // Get base API URL from env
    const baseApiUrl = import.meta.env.VITE_API_URL;

    // Remove trailing slash if any to avoid double slash
    const cleanBaseUrl = baseApiUrl.replace(/\/$/, "");

    // Construct the full Google auth URL, ensuring the /api prefix is present
    const googleAuthUrl = `${cleanBaseUrl}/api/auth/google`;

    // DEBUG: Show the exact URL before redirecting
    alert(`Attempting to redirect to: ${googleAuthUrl}`);

    // Redirect browser to the Google OAuth endpoint
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <motion.div
        className="max-w-md w-full space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo & Title */}
        <div className="text-center">
          <motion.div
            className="mx-auto h-16 w-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Sword className="h-8 w-8 text-white" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-bold gradient-text">
            Welcome Back, Hunter
          </h2>
          <p className="mt-2 text-gray-400">Sign in to continue your journey</p>
        </div>

        {/* Login Form */}
        <motion.form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input pl-10"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium text-primary-400 hover:text-primary-300 transition-colors"
              >
                Join the Guild
              </Link>
            </p>
          </div>
        </motion.form>

        {/* Or divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-dark-700"></div>
          <span className="mx-4 text-gray-500">or</span>
          <div className="flex-grow border-t border-dark-700"></div>
        </div>

        {/* Google Login Button */}
        <button
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-dark-700 bg-white hover:bg-gray-100 transition-colors shadow-sm mb-6"
          onClick={handleGoogleLogin}
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="h-6 w-6"
          />
          <span className="text-gray-800 font-medium">Sign in with Google</span>
        </button>

        {/* Demo Credentials */}
        <motion.div
          className="mt-8 p-4 bg-dark-800 rounded-lg border border-dark-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-medium text-white mb-2">
            Demo Credentials
          </h3>
          <p className="text-sm text-gray-400">
            Email: demo@example.com
            <br />
            Password: password123
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
