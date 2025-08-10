import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      const handleLogin = async () => {
        const result = await loginWithToken(token);
        if (result.success) {
          toast.success("Successfully logged in!");
          navigate("/dashboard");
        } else {
          toast.error(result.error || "Login failed. Please try again.");
          navigate("/login");
        }
      };
      handleLogin();
    } else {
      toast.error("Authentication failed. No token provided.");
      navigate("/login");
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center text-white">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-lg">Finalizing your authentication...</p>
      <p className="text-gray-400">Please wait while we redirect you.</p>
    </div>
  );
};

export default AuthCallback;
