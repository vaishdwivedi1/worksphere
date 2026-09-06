import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  XCircle,
  CheckCircle,
  Clock,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  Building,
  User,
  Mail,
  Phone,
  FileText,
  Star,
  ChevronDown,
  ChevronRight,
  Eye,
  Send,
  Ban,
  UserCheck,
  Award,
  MessageSquare,
  Upload,
  Download,
  Printer,
  Settings,
  BarChart,
  PieChart,
  TrendingUp,
  AlertCircle,
  Play,
  Pause,
  Circle,
  Check,
  X,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

const HRJobs = () => {
  const [activeTab, setActiveTab] = useState("jobs");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // list, kanban

  // Sample Data
  const jobs = [
    {
      id: 1,
      title: "Senior Software Engineer",
      department: "Engineering",
      team: "Backend",
      location: "Remote",
      employmentType: "Full-time",
      experience: "5-8 years",
      status: "Open",
      applicants: 45,
      createdAt: "2026-08-15",
      rounds: 3,
      description: "Looking for experienced backend engineer...",
      requirements: ["Node.js", "Python", "AWS", "Microservices"],
      skills: ["JavaScript", "Python", "AWS", "Docker"],
      hiringWorkflow: [
        {
          name: "HR Screening",
          interviewer: "John Doe",
          type: "Phone",
          duration: "30 mins",
        },
        {
          name: "Technical Round",
          interviewer: "Jane Smith",
          type: "Video",
          duration: "60 mins",
        },
        {
          name: "Final Round",
          interviewer: "Mike Johnson",
          type: "In-person",
          duration: "45 mins",
        },
      ],
      screeningQuestions: [
        "Why do you want to work here?",
        "Tell me about your experience with Node.js",
        "How do you handle conflicts in a team?",
      ],
      approval: {
        requestedBy: "Sarah Wilson",
        reason: "New project requirement",
        department: "Engineering",
        team: "Backend",
      },
      candidates: [
        {
          id: 1,
          name: "Alice Johnson",
          email: "alice@email.com",
          phone: "+1234567890",
          resume: "alice_resume.pdf",
          experience: "6 years",
          stage: "Interviewing",
          noticePeriod: "2 weeks",
          interviewHistory: [
            {
              round: "HR Screening",
              interviewer: "John Doe",
              feedback: "Good communication",
              result: "Passed",
              score: 85,
              notes: "Proceed to next round",
            },
            {
              round: "Technical Round",
              interviewer: "Jane Smith",
              feedback: "Strong technical skills",
              result: "Passed",
              score: 90,
              notes: "Good problem solving",
            },
          ],
          status: "Interviewing",
        },
        {
          id: 2,
          name: "Bob Williams",
          email: "bob@email.com",
          phone: "+9876543210",
          resume: "bob_resume.pdf",
          experience: "4 years",
          stage: "Applied",
          noticePeriod: "1 month",
          interviewHistory: [],
          status: "Applied",
        },
        {
          id: 3,
          name: "Carol Davis",
          email: "carol@email.com",
          phone: "+5555555555",
          resume: "carol_resume.pdf",
          experience: "8 years",
          stage: "Selected",
          noticePeriod: "3 weeks",
          interviewHistory: [
            {
              round: "HR Screening",
              interviewer: "John Doe",
              feedback: "Excellent",
              result: "Passed",
              score: 95,
              notes: "Hired",
            },
          ],
          status: "Selected",
        },
      ],
    },
    {
      id: 2,
      title: "UX Designer",
      department: "Design",
      team: "Product Design",
      location: "Hybrid",
      employmentType: "Full-time",
      experience: "3-5 years",
      status: "Draft",
      applicants: 12,
      createdAt: "2026-08-20",
      rounds: 2,
      description: "Join our design team...",
      requirements: ["Figma", "Adobe XD", "User Research"],
      skills: ["Figma", "UI/UX", "Prototyping"],
      hiringWorkflow: [
        {
          name: "Portfolio Review",
          interviewer: "Design Lead",
          type: "Video",
          duration: "45 mins",
        },
        {
          name: "Design Challenge",
          interviewer: "Team",
          type: "Take-home",
          duration: "2 hours",
        },
      ],
      screeningQuestions: [
        "What's your design process?",
        "How do you handle design feedback?",
      ],
      approval: {
        requestedBy: "Alex Chen",
        reason: "Team expansion",
        department: "Design",
        team: "Product Design",
      },
      candidates: [
        {
          id: 4,
          name: "Diana Prince",
          email: "diana@email.com",
          phone: "+1111111111",
          resume: "diana_resume.pdf",
          experience: "5 years",
          stage: "Screening",
          noticePeriod: "2 weeks",
          interviewHistory: [],
          status: "Screening",
        },
      ],
    },
  ];

  const statusColors = {
    Open: "bg-green-100 text-green-700 border-green-200",
    Draft: "bg-gray-100 text-gray-700 border-gray-200",
    Closed: "bg-red-100 text-red-700 border-red-200",
    "On Hold": "bg-yellow-100 text-yellow-700 border-yellow-200",
    Filled: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const candidateStatusColors = {
    Applied: "bg-blue-100 text-blue-700 border-blue-200",
    Screening: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Interviewing: "bg-purple-100 text-purple-700 border-purple-200",
    Selected: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
    Offered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Joined: "bg-teal-100 text-teal-700 border-teal-200",
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Open":
        return <Play className="w-3 h-3" />;
      case "Draft":
        return <Pause className="w-3 h-3" />;
      case "Closed":
        return <XCircle className="w-3 h-3" />;
      case "On Hold":
        return <Clock className="w-3 h-3" />;
      case "Filled":
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  const getCandidateStatusIcon = (status) => {
    switch (status) {
      case "Applied":
        return <Send className="w-3 h-3" />;
      case "Screening":
        return <Filter className="w-3 h-3" />;
      case "Interviewing":
        return <Users className="w-3 h-3" />;
      case "Selected":
        return <Check className="w-3 h-3" />;
      case "Rejected":
        return <X className="w-3 h-3" />;
      case "Offered":
        return <Award className="w-3 h-3" />;
      case "Joined":
        return <UserCheck className="w-3 h-3" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Jobs",
              value: jobs.length,
              icon: Briefcase,
              color: "text-blue-600",
            },
            {
              label: "Positions",
              value: jobs.filter((j) => j.status === "Open").length,
              icon: Play,
              color: "text-green-600",
            },
            {
              label: "Applicants",
              value: jobs.reduce((acc, j) => acc + j.applicants, 0),
              icon: Users,
              color: "text-purple-600",
            },
            {
              label: "On Hold",
              value: jobs.filter((j) => j.status === "On Hold").length,
              icon: Clock,
              color: "text-yellow-600",
            },
            {
              label: "Filled",
              value: jobs.filter((j) => j.status === "Filled").length,
              icon: CheckCircle,
              color: "text-emerald-600",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-2"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg bg-${stat.color.split("-")[1]}-50`}
                >
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-800">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJobModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs or candidates..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
        <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
          <option value="on-hold">On Hold</option>
          <option value="filled">Filled</option>
        </select>
        <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500">
          <option value="all">All Departments</option>
          <option value="engineering">Engineering</option>
          <option value="design">Design</option>
          <option value="marketing">Marketing</option>
          <option value="sales">Sales</option>
        </select>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
          >
            {/* Job Header */}
            <div className="p-4 border-b border-gray-100 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {job.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${statusColors[job.status]}`}
                  >
                    {getStatusIcon(job.status)}
                    {job.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {job.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {job.team}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {job.experience}
                  </span>
                </div>
              </div>
            </div>

            {/* Job Body */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Applicants</p>
                  <p className="text-lg font-bold text-gray-800">
                    {job.applicants}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Rounds</p>
                  <p className="text-lg font-bold text-gray-800">
                    {job.rounds}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-800">
                    {job.createdAt}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium text-gray-800">
                    {job.employmentType}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all text-xs font-medium"
                >
                  View Details
                </button>
                <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-xs font-medium">
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all text-xs font-medium">
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-xs font-medium">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedJob.title}
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Department",
                    value: selectedJob.department,
                    icon: Building,
                  },
                  { label: "Team", value: selectedJob.team, icon: Users },
                  {
                    label: "Location",
                    value: selectedJob.location,
                    icon: MapPin,
                  },
                  {
                    label: "Experience",
                    value: selectedJob.experience,
                    icon: Briefcase,
                  },
                  {
                    label: "Type",
                    value: selectedJob.employmentType,
                    icon: Clock,
                  },
                  { label: "Status", value: selectedJob.status, icon: Circle },
                  {
                    label: "Applicants",
                    value: selectedJob.applicants,
                    icon: Users,
                  },
                  {
                    label: "Created",
                    value: selectedJob.createdAt,
                    icon: Calendar,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-gray-400" />
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Description
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedJob.description}
                </p>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Requirements
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {selectedJob.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              {/* Hiring Workflow */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Hiring Workflow
                </h4>
                <div className="space-y-2">
                  {selectedJob.hiringWorkflow.map((round, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="flex items-center justify-center w-6 h-6 bg-emerald-600 text-white rounded-full text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {round.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {round.interviewer} • {round.type} • {round.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screening Questions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Screening Questions
                </h4>
                <ul className="space-y-1">
                  {selectedJob.screeningQuestions.map((q, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-emerald-600 font-bold">
                        Q{idx + 1}.
                      </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Approval Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Approval Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Requested By</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedJob.approval.requestedBy}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reason</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedJob.approval.reason}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedJob.approval.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Team</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedJob.approval.team}
                    </p>
                  </div>
                </div>
              </div>

              {/* Candidates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Candidates
                  </h4>
                  <button className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                    View All ({selectedJob.candidates.length})
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedJob.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowCandidateModal(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {candidate.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${candidateStatusColors[candidate.status]}`}
                        >
                          {getCandidateStatusIcon(candidate.status)}
                          {candidate.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {candidate.experience}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedCandidate.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedCandidate.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCandidateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Candidate Info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Phone",
                    value: selectedCandidate.phone,
                    icon: Phone,
                  },
                  {
                    label: "Experience",
                    value: selectedCandidate.experience,
                    icon: Briefcase,
                  },
                  {
                    label: "Stage",
                    value: selectedCandidate.stage,
                    icon: Users,
                  },
                  {
                    label: "Notice Period",
                    value: selectedCandidate.noticePeriod,
                    icon: Calendar,
                  },
                  {
                    label: "Status",
                    value: selectedCandidate.status,
                    icon: Circle,
                  },
                  {
                    label: "Resume",
                    value: selectedCandidate.resume,
                    icon: FileText,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-gray-400" />
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Interview History */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Interview History
                </h4>
                {selectedCandidate.interviewHistory.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCandidate.interviewHistory.map(
                      (interview, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {interview.round}
                              </p>
                              <p className="text-xs text-gray-500">
                                {interview.interviewer}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                interview.result === "Passed"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : "bg-red-100 text-red-700 border-red-200"
                              }`}
                            >
                              {interview.result}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Score: {interview.score}%</span>
                            <span>•</span>
                            <span>{interview.type}</span>
                            <span>•</span>
                            <span>{interview.duration}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {interview.feedback}
                          </p>
                          {interview.notes && (
                            <p className="text-xs text-gray-400 mt-1 italic">
                              Note: {interview.notes}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No interviews scheduled yet.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium">
                  <UserCheck className="w-4 h-4" />
                  Schedule Interview
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium">
                  <MessageSquare className="w-4 h-4" />
                  Send Message
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800">
                Create New Job
              </h2>
              <button
                onClick={() => setShowJobModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Department *
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                      <option value="">Select Department</option>
                      <option value="engineering">Engineering</option>
                      <option value="design">Design</option>
                      <option value="marketing">Marketing</option>
                      <option value="sales">Sales</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Team
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Backend Team"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Experience Required
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                      <option value="">Select Experience</option>
                      <option value="0-2 years">0-2 years</option>
                      <option value="3-5 years">3-5 years</option>
                      <option value="5-8 years">5-8 years</option>
                      <option value="8+ years">8+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Employment Type
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Location
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="Job description..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Requirements
                  </label>
                  <textarea
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="Enter requirements (one per line)"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Skills
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g., JavaScript, Python, AWS (comma separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Number of Interview Rounds
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g., 3"
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Screening Questions
                  </label>
                  <textarea
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="Enter screening questions (one per line)"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                  >
                    Create Job
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJobModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRJobs;
