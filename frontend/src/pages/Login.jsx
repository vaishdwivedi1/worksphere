import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import STATICPATHS from "../utils/STATICPATHS";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(APIPATHS.login, {
        email: formData.email,
        password: formData.password,
      });

      if (response.success) {
        // Store tokens and user data
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("org", JSON.stringify(response.data.organization));

        // Redirect to dashboard
        navigate(STATICPATHS.dashboard);
      } else {
        setError(response.message || "Login failed");
      }
    } catch (error) {
      setError(error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-black">
            <span className="bg-black text-white p-2 rounded-lg">◆</span>
            WorkSphere
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-black transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black focus:ring-offset-0"
                />
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">or</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <a
              href={STATICPATHS.registerOrganization}
              className="text-black font-medium hover:underline"
            >
              Create Organization
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 WorkSphere. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
