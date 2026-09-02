// src/components/Dashboard.jsx
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Code,
  Crown,
  FileText,
  FolderGit,
  Gauge,
  GitBranch,
  Layers,
  ListTodo,
  Lock,
  Megaphone,
  Rocket,
  Sparkles,
  Star,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const [activeWorkspace, setActiveWorkspace] = useState("hr");
  const [userRole, setUserRole] = useState("member");
  const [userName, setUserName] = useState("");
  const [userPlan, setUserPlan] = useState("FREE");
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUserRole(parsedUser.role || "member");
        setUserName(parsedUser.name || "User");
        setUserPlan(parsedUser.plan || "FREE");
        setOrganizationName(
          parsedUser.organization?.company_name || "Organization",
        );
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }
  }, []);

  // Role-based workspace access
  const roleWorkspaces = {
    owner: ["hr", "sales", "marketing", "management", "developer"],
    admin: ["hr", "sales", "marketing", "management", "developer"],
    hr: ["hr"],
    manager: ["management"],
    developer: ["developer"],
    sales: ["sales"],
    marketing: ["marketing"],
  };

  const accessibleWorkspaces = roleWorkspaces[userRole] || ["hr"];

  const workspaces = {
    hr: {
      title: "HR Workspace",
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      bgLight: "bg-emerald-50",
      icon: Users,
      features: [
        {
          icon: Calendar,
          title: "Leave Management",
          description: "View all leave requests with filters",
        },
        {
          icon: Users,
          title: "Employees",
          description: "CRUD operations for employees",
        },
        {
          icon: Megaphone,
          title: "Announcements",
          description: "Create and manage announcements",
        },
        {
          icon: Briefcase,
          title: "Job Openings",
          description: "Manage job postings and candidates",
        },
        {
          icon: BarChart3,
          title: "Analytics",
          description: "HR analytics and reports",
        },
        {
          icon: ClipboardList,
          title: "Leave Types",
          description: "Manage leave type configurations",
        },
      ],
    },
    sales: {
      title: "Sales Workspace",
      color: "bg-blue-500",
      textColor: "text-blue-600",
      borderColor: "border-blue-200",
      bgLight: "bg-blue-50",
      icon: Gauge,
      features: [
        {
          icon: Gauge,
          title: "Leads Management",
          description: "CRUD leads with filters",
        },
        {
          icon: UserCheck,
          title: "Assign/Reassign",
          description: "Assign leads to team members",
        },
        {
          icon: BarChart3,
          title: "Analytics",
          description: "Revenue & conversion analytics",
        },
        {
          icon: Award,
          title: "Performance",
          description: "Salesperson performance tracking",
        },
      ],
    },
    marketing: {
      title: "Marketing Workspace",
      color: "bg-purple-500",
      textColor: "text-purple-600",
      borderColor: "border-purple-200",
      bgLight: "bg-purple-50",
      icon: Megaphone,
      features: [
        {
          icon: Megaphone,
          title: "Campaign Management",
          description: "CRUD campaigns with status filters",
        },
        {
          icon: BarChart3,
          title: "Analytics",
          description: "Campaign performance tracking",
        },
        {
          icon: Layers,
          title: "Campaign Details",
          description: "Detailed campaign information",
        },
      ],
    },
    management: {
      title: "Management Workspace",
      color: "bg-orange-500",
      textColor: "text-orange-600",
      borderColor: "border-orange-200",
      bgLight: "bg-orange-50",
      icon: UserCog,
      features: [
        {
          icon: Users,
          title: "Member Management",
          description: "CRUD for organization members",
        },
        {
          icon: Megaphone,
          title: "Announcements",
          description: "Create and manage announcements",
        },
        {
          icon: UserCog,
          title: "Teams",
          description: "Create and manage teams",
        },
      ],
    },
    developer: {
      title: "Developer Workspace",
      color: "bg-indigo-500",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-200",
      bgLight: "bg-indigo-50",
      icon: Code,
      features: [
        {
          icon: FileText,
          title: "Documents",
          description: "CRUD documents",
        },
        {
          icon: GitBranch,
          title: "Sprints",
          description: "Manage sprints with tasks",
        },
        {
          icon: FolderGit,
          title: "Projects",
          description: "CRUD projects",
        },
        {
          icon: Rocket,
          title: "Release Summary",
          description: "Manage release summaries",
        },
        {
          icon: CheckSquare,
          title: "TODO",
          description: "Manage TODO items",
        },
        {
          icon: ListTodo,
          title: "Tasks",
          description: "Jira-style task management",
        },
      ],
    },
  };

  // Set default workspace to first accessible
  useEffect(() => {
    if (
      accessibleWorkspaces.length > 0 &&
      !accessibleWorkspaces.includes(activeWorkspace)
    ) {
      setActiveWorkspace(accessibleWorkspaces[0]);
    }
  }, [userRole]);

  const getPlanFeatures = (plan) => {
    const features = {
      FREE: {
        icon: Sparkles,
        title: "Free Plan",
        members: "Up to 10 members",
        departments: "No departments",
        teams: "Limited teams",
        textColor: "text-gray-600",
        borderColor: "border-gray-200",
        bgLight: "bg-gray-50",
      },
      PRO: {
        icon: Star,
        title: "Pro Plan",
        members: "Up to 50 members",
        departments: "Up to 10 departments",
        teams: "Full team management",
        textColor: "text-yellow-600",
        borderColor: "border-yellow-200",
        bgLight: "bg-yellow-50",
      },
      PREMIUM: {
        icon: Crown,
        title: "Premium Plan",
        members: "Unlimited members",
        departments: "Unlimited departments",
        teams: "Full team management",
        textColor: "text-purple-600",
        borderColor: "border-purple-200",
        bgLight: "bg-purple-50",
      },
    };
    return features[plan] || features.FREE;
  };

  const currentPlan = userPlan || "FREE";

  // Show role badge
  const getRoleBadge = (role) => {
    const badges = {
      owner: "bg-purple-100 text-purple-700",
      admin: "bg-blue-100 text-blue-700",
      hr: "bg-emerald-100 text-emerald-700",
      manager: "bg-orange-100 text-orange-700",
      developer: "bg-indigo-100 text-indigo-700",
      sales: "bg-cyan-100 text-cyan-700",
      marketing: "bg-pink-100 text-pink-700",
      member: "bg-gray-100 text-gray-700",
    };
    return badges[role] || badges.member;
  };

  return (
    <div>
      {/* Welcome Header with Role Badge */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-gray-500 text-sm">
            {organizationName} •
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(userRole)}`}
            >
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Plan:</span>
          <span className="px-3 py-1 bg-black/5 rounded-full text-xs font-medium text-black">
            {currentPlan}
          </span>
        </div>
      </div>

      {/* Plans Section - Only show for owner/admin */}
      {(userRole === "owner" || userRole === "admin") && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Organization Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["FREE", "PRO", "PREMIUM"].map((plan) => {
              const features = getPlanFeatures(plan);
              const IconComponent = features.icon;
              return (
                <div
                  key={plan}
                  className={`${features.bgLight} rounded-xl p-6 border ${features.borderColor} hover:shadow-md transition-all bg-white ${
                    currentPlan === plan ? "ring-2 ring-black" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${features.bgLight}`}>
                      <IconComponent
                        className={`w-5 h-5 ${features.textColor}`}
                      />
                    </div>
                    <h3 className="font-semibold text-black">
                      {features.title}
                    </h3>
                    {currentPlan === plan && (
                      <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      {features.members}
                    </p>
                    <p className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {features.departments}
                    </p>
                    <p className="flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-gray-400" />
                      {features.teams}
                    </p>
                  </div>
                  {plan === "PRO" && (
                    <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Workspace Navigation */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Your Workspaces
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(workspaces).map((key) => {
            const isAccessible = accessibleWorkspaces.includes(key);
            const workspace = workspaces[key];
            const IconComponent = workspace.icon;
            return (
              <button
                key={key}
                onClick={() => isAccessible && setActiveWorkspace(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isAccessible
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                    : activeWorkspace === key
                      ? "bg-black text-white shadow-md"
                      : "bg-white text-gray-600 hover:text-black hover:bg-gray-100 border border-gray-200"
                }`}
                disabled={!isAccessible}
                title={
                  !isAccessible
                    ? `You don't have access to ${workspace.title}`
                    : ""
                }
              >
                <IconComponent className="w-4 h-4" />
                {workspace.title}
                {!isAccessible && <Lock className="w-3 h-3 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Workspace Content */}
      {accessibleWorkspaces.includes(activeWorkspace) ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`w-3 h-3 rounded-full ${workspaces[activeWorkspace].color}`}
            />
            <h2 className="text-lg font-semibold text-black">
              {workspaces[activeWorkspace].title}
            </h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium">
              Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces[activeWorkspace].features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all cursor-pointer group border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white group-hover:bg-gray-200 transition-all border border-gray-200">
                      <IconComponent className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-black text-sm mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-500 text-xs">
                        {feature.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-500 text-sm">
            You don't have permission to view this workspace.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
