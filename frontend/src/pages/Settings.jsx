// src/pages/Settings.jsx
import React, { useState } from "react";
import {
  User,
  Lock,
  Key,
  Mail,
  Bell,
  Shield,
  Globe,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  LogOut,
  UserCog,
  Palette,
  Smartphone,
  Database,
  Activity,
  Clock,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import STATICPATHS from "../utils/STATICPATHS";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Change Password State
  const [passwordData, setPasswordData] = useState({
    email: "",
    prevpassword: "",
    newpassword: "",
    confirmPassword: "",
  });

  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = userData.email || "";

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate
    if (!passwordData.email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!passwordData.prevpassword) {
      setError("Current password is required");
      setLoading(false);
      return;
    }

    if (!passwordData.newpassword || passwordData.newpassword.length < 6) {
      setError("New password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (passwordData.newpassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(APIPATHS.changePassword, {
        email: passwordData.email,
        prevpassword: passwordData.prevpassword,
        newpassword: passwordData.newpassword,
      });

      if (response.success) {
        setSuccess("Password changed successfully!");
        setPasswordData({
          email: userEmail,
          prevpassword: "",
          newpassword: "",
          confirmPassword: "",
        });
        localStorage.clear();
        navigate(STATICPATHS.login);
      } else {
        setError(response.message || "Failed to change password");
      }
    } catch (error) {
      setError(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("org");
    navigate(STATICPATHS.login);
  };

  // Settings sections
  const settingsSections = [
    {
      id: "profile",
      icon: User,
      title: "Profile Settings",
      description: "Update your personal information",
      color: "bg-blue-50 text-blue-600",
      onClick: () => console.log("Profile settings clicked"),
    },
    {
      id: "security",
      icon: Shield,
      title: "Security",
      description: "Change password & security settings",
      color: "bg-emerald-50 text-emerald-600",
      active: true,
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Notifications",
      description: "Manage your notification preferences",
      color: "bg-purple-50 text-purple-600",
      onClick: () => console.log("Notifications clicked"),
    },
    {
      id: "appearance",
      icon: Palette,
      title: "Appearance",
      description: "Theme and display preferences",
      color: "bg-pink-50 text-pink-600",
      onClick: () => console.log("Appearance clicked"),
    },
    {
      id: "language",
      icon: Globe,
      title: "Language & Region",
      description: "Set your language and timezone",
      color: "bg-indigo-50 text-indigo-600",
      onClick: () => console.log("Language clicked"),
    },
    {
      id: "integrations",
      icon: Database,
      title: "Integrations",
      description: "Connect with third-party services",
      color: "bg-orange-50 text-orange-600",
      onClick: () => console.log("Integrations clicked"),
    },
    {
      id: "devices",
      icon: Smartphone,
      title: "Devices",
      description: "Manage connected devices and sessions",
      color: "bg-cyan-50 text-cyan-600",
      onClick: () => console.log("Devices clicked"),
    },
    {
      id: "activity",
      icon: Activity,
      title: "Activity Log",
      description: "View your recent activity",
      color: "bg-red-50 text-red-600",
      onClick: () => console.log("Activity clicked"),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Navigation */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20">
          <div className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={section.onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    section.active
                      ? "bg-black text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg ${
                      section.active ? "bg-white/20" : section.color
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        section.active ? "text-white" : ""
                      }`}
                    />
                  </div>
                  <span className="flex-1 text-left font-medium">
                    {section.title}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-gray-200" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="lg:col-span-2">
        {/* Change Password Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Key className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black">
                Change Password
              </h2>
              <p className="text-sm text-gray-500">
                Update your account password
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <div className="flex justify-between gap-4 items-center">
              {/* Email */}
              <div className="min-w-[40%]">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={passwordData.email}
                    onChange={handlePasswordChange}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Enter your registered email address
                </p>
              </div>

              {/* Current Password */}
              <div className="min-w-[40%]">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.current ? "text" : "password"}
                    name="prevpassword"
                    value={passwordData.prevpassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-4 items-center">
              {/* New Password */}
              <div className="min-w-[40%]">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.new ? "text" : "password"}
                    name="newpassword"
                    value={passwordData.newpassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div className="min-w-[40%]">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Tips */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Shield className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-black">
                Password Tips
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Use at least 8 characters with mix of letters, numbers &
                  symbols
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Avoid using common words or personal information
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Don't reuse passwords across different accounts
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
