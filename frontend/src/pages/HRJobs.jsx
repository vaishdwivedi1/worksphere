import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Search,
  Plus,
  Filter,
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
  Phone,
  FileText,
  ChevronDown,
  Eye,
  Send,
  Ban,
  UserCheck,
  Award,
  MessageSquare,
  BarChart,
  AlertCircle,
  Play,
  Pause,
  Circle,
  Check,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";

// ============================================
// PATH BUILDER — replaces :param placeholders
// ============================================
const buildPath = (template, params = {}) =>
  template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) =>
    params[key] !== undefined && params[key] !== null
      ? encodeURIComponent(params[key])
      : "",
  );

// ============================================
// SAFE ARRAY PARSER (handles JSONB, text, null, CSV)
// ============================================
const asArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined || val === "") return [];
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    // Try JSON first
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        /* fall through */
      }
    }
    // Try newline-separated
    if (trimmed.includes("\n")) {
      return trimmed
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // Try comma-separated
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

// ============================================
// MAPPERS (snake_case API → camelCase UI)
// ============================================
const mapJobFromApi = (j) => ({
  id: j.id,
  title: j.title || "",
  department: j.department || "—",
  team: j.team || "—",
  location: j.location || "—",
  employmentType: j.employment_type || "—",
  experience: j.experience_required || "—",
  status: j.status || "Draft",
  applicants: Number(j.total_applicants) || 0,
  createdAt: j.created_at ? new Date(j.created_at).toLocaleDateString() : "—",
  rounds: Number(j.total_rounds) || 0,
  description: j.description || "",
  requirements: asArray(j.requirements),
  skills: asArray(j.skills),
  hiringWorkflow: asArray(j.hiring_workflow),
  screeningQuestions: asArray(j.screening_questions),
  approval: {
    requestedBy: j.approval_requested_by || "—",
    reason: j.approval_reason || "—",
    department: j.approval_department || "—",
    team: j.approval_team || "—",
  },
  candidates: [],
  _raw: j,
});

const mapCandidateFromApi = (c) => ({
  id: c.id,
  name: c.name || "Unknown",
  email: c.email || "—",
  phone: c.phone || "—",
  resume: c.resume_url || "—",
  resume_url: c.resume_url,
  experience: c.experience || "—",
  stage: c.stage || c.status || "Applied",
  noticePeriod: c.notice_period || "—",
  interviewHistory: asArray(c.interviews).map((i) => ({
    round: i.round_name || i.round || "—",
    interviewer: i.interviewer || "—",
    feedback: i.feedback || "",
    result: i.result || "Pending",
    score: i.score,
    notes: i.notes || "",
    type: i.interview_type || "",
    duration: i.duration || "",
  })),
  status: c.status || "Applied",
  _raw: c,
});

// ============================================
// DEBOUNCE HOOK
// ============================================
const useDebounced = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ============================================
// DEFAULT FORM
// ============================================
const emptyForm = () => ({
  title: "",
  department: "",
  team: "",
  experience: "",
  employmentType: "full-time",
  location: "remote",
  description: "",
  requirements: "",
  skills: "",
  rounds: 3,
  screeningQuestions: "",
});

// ============================================
// COMPONENT
// ============================================
const HRJobs = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  // ========== API state ==========
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const debouncedSearch = useDebounced(searchQuery, 400);

  // Create/Edit form state
  const [jobForm, setJobForm] = useState(emptyForm());

  // ---------- organization ----------
  const organizationId = useMemo(() => {
    try {
      const org = JSON.parse(localStorage.getItem("org") || "{}");
      return org?.id || org?.organization_id || null;
    } catch {
      return null;
    }
  }, []);

  // Track in-flight fetches to avoid race conditions
  const fetchSeq = useRef(0);

  // ============================================
  // API CALLS
  // ============================================
  const fetchJobsApi = useCallback(async () => {
    if (!organizationId) {
      setError("Organization not found. Please log in again.");
      return;
    }

    const seq = ++fetchSeq.current;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("organization_id", organizationId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (deptFilter !== "all") params.append("department", deptFilter);
      if (debouncedSearch.trim())
        params.append("search", debouncedSearch.trim());

      const res = await api.get(`${APIPATHS.getAllJobs}?${params.toString()}`);

      // Ignore stale response if a newer request has started
      if (seq !== fetchSeq.current) return;

      if (res?.success) {
        const list = res.data?.jobs || res.data || [];
        setJobs(asArray(list).map(mapJobFromApi));
      } else {
        setError(res?.message || "Failed to load jobs");
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      setError(err?.message || "Failed to load jobs");
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [organizationId, statusFilter, deptFilter, debouncedSearch]);

  useEffect(() => {
    fetchJobsApi();
  }, [fetchJobsApi]);

  const fetchCandidatesByJobApi = async (jobId) => {
    try {
      const url = `${APIPATHS.getAllCandidates}?job_id=${encodeURIComponent(jobId)}`;
      const res = await api.get(url);
      if (res?.success) {
        const list = res.data?.candidates || res.data || [];
        return asArray(list).map(mapCandidateFromApi);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
    return [];
  };

  const createJobApi = (payload) => api.post(APIPATHS.createJob, payload);

  const updateJobApi = (id, payload) =>
    api.put(buildPath(APIPATHS.updateJob, { id }), payload);

  const updateJobStatusApi = (id, status) =>
    api.patch(buildPath(APIPATHS.updateJobStatus, { id }), { status });

  const deleteJobApi = (id) =>
    api.delete(buildPath(APIPATHS.deleteJob, { id }));

  const getCandidateByIdApi = (id) =>
    api.get(buildPath(APIPATHS.getCandidateById, { id }));

  const updateCandidateStatusApi = (id, status) =>
    api.patch(buildPath(APIPATHS.updateCandidateStatus, { id }), { status });

  // ============================================
  // HANDLERS
  // ============================================
  const handleViewJob = async (job) => {
    setSelectedJob({ ...job, candidates: [] });
    const candidates = await fetchCandidatesByJobApi(job.id);
    setSelectedJob((prev) =>
      prev && prev.id === job.id ? { ...prev, candidates } : prev,
    );
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || "",
      department: job.department !== "—" ? job.department : "",
      team: job.team !== "—" ? job.team : "",
      experience: job.experience !== "—" ? job.experience : "",
      employmentType: (job.employmentType || "full-time").toLowerCase(),
      location: (job.location || "remote").toLowerCase(),
      description: job.description || "",
      requirements: (job.requirements || []).join("\n"),
      skills: (job.skills || []).join(", "),
      rounds: job.rounds || 1,
      screeningQuestions: (job.screeningQuestions || []).join("\n"),
    });
    setShowJobModal(true);
  };

  const handleArchive = async (job) => {
    if (!window.confirm(`Archive "${job.title}"?`)) return;
    try {
      const res = await updateJobStatusApi(job.id, "On Hold");
      if (res?.success) fetchJobsApi();
      else alert(res?.message || "Failed to archive");
    } catch (err) {
      alert(err?.message || "Failed to archive");
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`))
      return;
    try {
      const res = await deleteJobApi(job.id);
      if (res?.success) fetchJobsApi();
      else alert(res?.message || "Failed to delete");
    } catch (err) {
      alert(err?.message || "Failed to delete");
    }
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();

    if (!organizationId) {
      alert("Organization not found. Please log in again.");
      return;
    }
    if (!jobForm.title.trim() || !jobForm.department) {
      alert("Job Title and Department are required");
      return;
    }

    setSubmitting(true);

    try {
      const requirements = jobForm.requirements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const skills = jobForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const screening_questions = jobForm.screeningQuestions
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const roundsNum = Math.max(1, parseInt(jobForm.rounds, 10) || 1);

      // Build a hiring_workflow with the requested number of rounds
      const hiring_workflow = Array.from({ length: roundsNum }, (_, i) => ({
        name: `Round ${i + 1}`,
        type: "Interview",
        interviewer: "",
        duration: "",
      }));

      const payload = {
        organization_id: organizationId,
        title: jobForm.title.trim(),
        department: jobForm.department,
        team: jobForm.team.trim() || null,
        experience_required: jobForm.experience || null,
        employment_type:
          jobForm.employmentType.charAt(0).toUpperCase() +
          jobForm.employmentType.slice(1),
        location:
          jobForm.location.charAt(0).toUpperCase() + jobForm.location.slice(1),
        description: jobForm.description.trim() || null,
        requirements,
        skills,
        hiring_workflow,
        screening_questions,
        total_rounds: roundsNum,
        status: editingJob ? undefined : "Draft",
      };

      const res = editingJob
        ? await updateJobApi(editingJob.id, payload)
        : await createJobApi(payload);

      if (res?.success) {
        setShowJobModal(false);
        setEditingJob(null);
        setJobForm(emptyForm());
        fetchJobsApi();
      } else {
        alert(res?.message || "Failed to save job");
      }
    } catch (err) {
      alert(err?.message || "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);

    try {
      const res = await getCandidateByIdApi(candidate.id);
      if (res?.success && res.data) {
        setSelectedCandidate(mapCandidateFromApi(res.data));
      }
    } catch (err) {
      console.error("Failed to fetch candidate details:", err);
    }
  };

  const handleRejectCandidate = async (candidate) => {
    if (!window.confirm(`Reject ${candidate.name}?`)) return;
    try {
      const res = await updateCandidateStatusApi(candidate.id, "Rejected");
      if (res?.success) {
        setShowCandidateModal(false);
        setSelectedCandidate(null);
        if (selectedJob) {
          const candidates = await fetchCandidatesByJobApi(selectedJob.id);
          setSelectedJob((prev) => (prev ? { ...prev, candidates } : prev));
        }
        fetchJobsApi();
      } else {
        alert(res?.message || "Failed to reject");
      }
    } catch (err) {
      alert(err?.message || "Failed to reject");
    }
  };

  const handleScheduleInterview = (candidate) => {
    alert(`Schedule interview for ${candidate.name} (coming soon)`);
  };

  const handleSendMessage = (candidate) => {
    alert(`Send message to ${candidate.name} (coming soon)`);
  };

  // ============================================
  // STYLING HELPERS
  // ============================================
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

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="w-full overflow-scroll h-[80dvh]">
      {/* Header with Stats */}
      <div className="flex justify-between items-center w-full gap-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
          {[
            {
              label: "Jobs",
              value: jobs.length,
              icon: Briefcase,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Positions",
              value: jobs.filter((j) => j.status === "Open").length,
              icon: Play,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Applicants",
              value: jobs.reduce((acc, j) => acc + (j.applicants || 0), 0),
              icon: Users,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
            {
              label: "On Hold",
              value: jobs.filter((j) => j.status === "On Hold").length,
              icon: Clock,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
            },
            {
              label: "Filled",
              value: jobs.filter((j) => j.status === "Filled").length,
              icon: CheckCircle,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-3"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
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
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobsApi}
            disabled={loading}
            title="Refresh"
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => {
              setEditingJob(null);
              setJobForm(emptyForm());
              setShowJobModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs or candidates..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
          <option value="On Hold">On Hold</option>
          <option value="Filled">Filled</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Marketing">Marketing</option>
          <option value="Sales">Sales</option>
          <option value="HR">HR</option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading jobs…
        </div>
      )}

      {/* Empty */}
      {!loading && jobs.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No jobs found. Click{" "}
          <span className="font-medium text-gray-700">Create Job</span> to add
          one.
        </div>
      )}

      {/* Jobs Grid */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-4 border-b border-gray-100 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-800 truncate">
                      {job.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 whitespace-nowrap ${statusColors[job.status] || statusColors.Draft}`}
                    >
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
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

              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Applicants</p>
                    <p className="text-base font-bold text-gray-800">
                      {job.applicants}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Rounds</p>
                    <p className="text-base font-bold text-gray-800">
                      {job.rounds}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-800">
                      {job.createdAt}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm font-medium text-gray-800">
                      {job.employmentType}
                    </p>
                  </div>
                </div>

                {job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 flex-wrap">
                  <button
                    onClick={() => handleViewJob(job)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all text-xs font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleEditJob(job)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-xs font-medium"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchive(job)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all text-xs font-medium"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(job)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-xs font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      {item.value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Description
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedJob.description || "—"}
                </p>
              </div>

              {selectedJob.requirements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Requirements
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {selectedJob.requirements.map((req, idx) => (
                      <li key={idx}>
                        {typeof req === "string" ? req : JSON.stringify(req)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedJob.hiringWorkflow.length > 0 && (
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
                            {round?.name || `Round ${idx + 1}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {round?.interviewer || "—"} • {round?.type || "—"} •{" "}
                            {round?.duration || "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.screeningQuestions.length > 0 && (
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
                        {typeof q === "string" ? q : JSON.stringify(q)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Candidates
                  </h4>
                  <button className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                    View All ({selectedJob.candidates.length})
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedJob.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                      onClick={() => handleViewCandidate(candidate)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                          {(candidate.name || "?").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {candidate.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${candidateStatusColors[candidate.status] || candidateStatusColors.Applied}`}
                        >
                          {getCandidateStatusIcon(candidate.status)}
                          {candidate.status}
                        </span>
                        <span className="text-xs text-gray-500 hidden sm:inline">
                          {candidate.experience}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedJob.candidates.length === 0 && (
                    <p className="text-sm text-gray-500">No candidates yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                  {(selectedCandidate.name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-800 truncate">
                    {selectedCandidate.name}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">
                    {selectedCandidate.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCandidateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
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
                      <span className="truncate">{item.value || "—"}</span>
                    </p>
                  </div>
                ))}
              </div>

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
                          <div className="flex items-center justify-between mb-2 flex-wrap">
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
                                  : interview.result === "Failed"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {interview.result || "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                            {interview.score != null && (
                              <span>Score: {interview.score}%</span>
                            )}
                            {interview.type && (
                              <>
                                <span>•</span>
                                <span>{interview.type}</span>
                              </>
                            )}
                            {interview.duration && (
                              <>
                                <span>•</span>
                                <span>{interview.duration}</span>
                              </>
                            )}
                          </div>
                          {interview.feedback && (
                            <p className="text-xs text-gray-600 mt-1">
                              {interview.feedback}
                            </p>
                          )}
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

              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleScheduleInterview(selectedCandidate)}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                >
                  <UserCheck className="w-4 h-4" />
                  Schedule Interview
                </button>
                <button
                  onClick={() => handleSendMessage(selectedCandidate)}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Message
                </button>
                <button
                  onClick={() => handleRejectCandidate(selectedCandidate)}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800">
                {editingJob ? "Edit Job" : "Create New Job"}
              </h2>
              <button
                onClick={() => {
                  setShowJobModal(false);
                  setEditingJob(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <form className="space-y-4" onSubmit={handleSubmitJob}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Department *
                    </label>
                    <select
                      value={jobForm.department}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, department: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Team
                    </label>
                    <input
                      type="text"
                      value={jobForm.team}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, team: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Backend Team"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Experience Required
                    </label>
                    <select
                      value={jobForm.experience}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, experience: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    >
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
                    <select
                      value={jobForm.employmentType}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,
                          employmentType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    >
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
                    <select
                      value={jobForm.location}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, location: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    >
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
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    placeholder="Job description..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Requirements
                  </label>
                  <textarea
                    rows="2"
                    value={jobForm.requirements}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, requirements: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    placeholder="Enter requirements (one per line)"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Skills
                  </label>
                  <input
                    type="text"
                    value={jobForm.skills}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, skills: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    placeholder="e.g., JavaScript, Python, AWS (comma separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Number of Interview Rounds
                  </label>
                  <input
                    type="number"
                    value={jobForm.rounds}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, rounds: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
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
                    value={jobForm.screeningQuestions}
                    onChange={(e) =>
                      setJobForm({
                        ...jobForm,
                        screeningQuestions: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                    placeholder="Enter screening questions (one per line)"
                  ></textarea>
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting
                      ? "Saving…"
                      : editingJob
                        ? "Update Job"
                        : "Create Job"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowJobModal(false);
                      setEditingJob(null);
                    }}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
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
