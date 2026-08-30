// src/components/Dashboard.jsx
import React, { useState } from "react";
import {
  Users,
  Briefcase,
  Megaphone,
  BarChart3,
  UserCog,
  Calendar,
  UserPlus,
  Star,
  Crown,
  Sparkles,
  GitBranch,
  CheckSquare,
  ListTodo,
  Rocket,
  FileText,
  ChevronRight,
  Code,
  Server,
  Database,
  Shield,
  Zap,
  Building2,
  FolderGit,
  Layers,
  Award,
  UserCheck,
  ClipboardList,
  Gauge,
  Share2,
} from "lucide-react";

const Dashboard = () => {
  const [activeWorkspace, setActiveWorkspace] = useState("hr");

  const workspaces = {
    hr: {
      title: "HR Workspace",
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      bgLight: "bg-emerald-50",
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

  const getPlanFeatures = (plan) => {
    const features = {
      Free: {
        icon: Sparkles,
        title: "Free Plan",
        members: "Up to 10 members",
        departments: "No departments",
        teams: "Limited teams",
        textColor: "text-gray-600",
        borderColor: "border-gray-200",
        bgLight: "bg-gray-50",
      },
      Pro: {
        icon: Star,
        title: "Pro Plan",
        members: "Up to 50 members",
        departments: "Up to 10 departments",
        teams: "Full team management",
        textColor: "text-yellow-600",
        borderColor: "border-yellow-200",
        bgLight: "bg-yellow-50",
      },
      Premium: {
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
    return features[plan] || features.Free;
  };

  return (
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
                <p className="text-gray-500 text-xs">{feature.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Dashboard;
