import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Crown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [showPlanDetails, setShowPlanDetails] = React.useState(false);
  const navigate = useNavigate();

  // Get user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Plan details
  const currentPlan = user?.plan || "FREE";

  const planDetails = {
    FREE: {
      name: "Free Plan",
      icon: Sparkles,
      color: "text-gray-500",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200",
      features: ["Up to 10 members", "Basic features", "Email support"],
      nextPlan: "PRO",
      price: "$0/month",
    },
    PRO: {
      name: "Pro Plan",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      features: [
        "Up to 50 members",
        "Advanced features",
        "Priority support",
        "10 departments",
      ],
      nextPlan: "PREMIUM",
      price: "$29/month",
    },
    PREMIUM: {
      name: "Premium Plan",
      icon: Crown,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      features: [
        "Unlimited members",
        "All features",
        "24/7 support",
        "Unlimited departments",
      ],
      nextPlan: null,
      price: "$99/month",
    },
  };

  const currentPlanData =
    planDetails[currentPlan as keyof typeof planDetails] || planDetails.FREE;
  const PlanIcon = currentPlanData.icon;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="bg-black text-white p-1.5 rounded-lg transition-colors">
            ◆
          </span>
          <span className="text-black">WorkSphere</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        <button
          onClick={toggleSidebar}
          className="flex md:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Profile Section */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-semibold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || "user@email.com"}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Section */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${currentPlanData.bgColor} border ${currentPlanData.borderColor}`}
          onClick={() => setShowPlanDetails(!showPlanDetails)}
        >
          <div className="flex items-center gap-2">
            <PlanIcon className={`w-4 h-4 ${currentPlanData.color}`} />
            <div>
              <p className="text-xs font-medium text-black">
                {currentPlanData.name}
              </p>
              <p className="text-[10px] text-gray-500">
                {currentPlanData.price}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentPlan !== "PREMIUM" && (
              <span className="text-[10px] font-medium text-black bg-white px-2 py-0.5 rounded-full border border-gray-200">
                Upgrade
              </span>
            )}
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${
                showPlanDetails ? "rotate-90" : ""
              }`}
            />
          </div>
        </div>

        {/* Plan Details Dropdown */}
        {showPlanDetails && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-2">
              <p className="text-xs font-medium text-black">Plan Features:</p>
              {currentPlanData.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-gray-600"
                >
                  <span className="w-1 h-1 rounded-full bg-black" />
                  {feature}
                </div>
              ))}
              {currentPlan !== "PREMIUM" && (
                <button
                  className="w-full mt-2 bg-black text-white text-xs font-medium py-1.5 rounded-lg hover:bg-gray-800 transition-all"
                  onClick={() => {
                    // Handle upgrade logic
                    alert(`Upgrade to ${currentPlanData.nextPlan} plan`);
                  }}
                >
                  Upgrade to {currentPlanData.nextPlan}
                </button>
              )}
              {currentPlan === "PREMIUM" && (
                <div className="mt-1 text-xs text-purple-600 font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  You're on the best plan!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-1">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active
            onClick={() => navigate("/dashboard")}
          />
          <NavItem
            icon={Briefcase}
            label="Tasks"
            onClick={() => navigate("/tasks")}
          />
          <NavItem
            icon={Users}
            label="Employees"
            onClick={() => navigate("/employees")}
          />
          <NavItem
            icon={Target}
            label="Campaigns"
            onClick={() => navigate("/campaigns")}
          />
          <NavItem
            icon={BarChart3}
            label="Analytics"
            onClick={() => navigate("/analytics")}
          />
          <NavItem
            icon={Settings}
            label="Settings"
            onClick={() => navigate("/settings")}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <NavItem icon={HelpCircle} label="Help & Support" />
          <NavItem
            icon={LogOut}
            label="Log Out"
            className="text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          />
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400">
        <p>Version 2.0.0</p>
      </div>
    </div>
  );

  const NavItem = ({
    icon: Icon,
    label,
    active = false,
    className = "",
    onClick = () => {},
  }: {
    icon: any;
    label: string;
    active?: boolean;
    className?: string;
    onClick?: () => void;
  }) => {
    if (!sidebarOpen && window.innerWidth >= 768) {
      return (
        <div className="flex justify-center py-3">
          <div
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              active
                ? "bg-black/10 text-black"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            } ${className}`}
            title={label}
            onClick={onClick}
          >
            <Icon size={20} />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          active
            ? "bg-black/10 text-black"
            : "text-gray-500 hover:bg-gray-100 hover:text-black"
        } ${className}`}
        onClick={onClick}
      >
        <Icon size={20} />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-20 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 z-40 md:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen && window.innerWidth >= 768
            ? "ml-64"
            : window.innerWidth >= 768
              ? "ml-16"
              : "ml-0"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-black text-lg font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentPlan === "FREE"
                    ? "bg-gray-400"
                    : currentPlan === "PRO"
                      ? "bg-yellow-400"
                      : "bg-purple-400"
                }`}
              />
              <span className="text-xs text-gray-500 hidden sm:block">
                {currentPlan}
              </span>
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">
              {user?.name || "User"}
            </span>
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-semibold text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
