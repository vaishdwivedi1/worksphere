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
  Send,
  UserCheck,
  Award,
  AlertCircle,
  Play,
  Pause,
  Circle,
  Check,
  X,
  Loader2,
  RefreshCw,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";

// ============================================
// PATH BUILDER
// ============================================
const buildPath = (template, params = {}) =>
  template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) =>
    params[key] !== undefined && params[key] !== null
      ? encodeURIComponent(params[key])
      : "",
  );

const asArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined || val === "") return [];
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

// ============================================
// MAPPERS
// ============================================
const mapJobFromApi = (j) => {
  let normalizedScreening = [];
  if (Array.isArray(j.screening_questions)) {
    normalizedScreening = j.screening_questions.map((item) => {
      if (typeof item === "string") return { question: item, answer: "" };
      if (item && typeof item === "object")
        return { question: item.question || "", answer: item.answer || "" };
      return { question: "", answer: "" };
    });
  }

  return {
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
    responsibilities: j.responsibilities || "",
    requirements: asArray(j.requirements),
    skills: asArray(j.skills),
    hiringWorkflow: asArray(j.hiring_workflow),
    screeningQuestions: normalizedScreening,
    approval: {
      requestedBy: j.approval_requested_by || "—",
      reason: j.approval_reason || "—",
      department: j.approval_department || "—",
      team: j.approval_team || "—",
    },
    candidates: [],
    _raw: j,
  };
};

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
  screeningAnswers: c.screening_answers || {},
  interviewHistory: asArray(c.interviews).map((i) => ({
    id: i.id,
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

const useDebounced = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const emptyForm = () => ({
  title: "",
  department: "",
  team: "",
  experience: "",
  employmentType: "full-time",
  location: "remote",
  description: "",
  responsibilities: "",
  requirements: "",
  skills: "",
  rounds: 3,
  screeningQuestions: [{ question: "", answer: "" }],
});

// ============================================
// MAIN COMPONENT
// ============================================
const HRJobs = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // Custom confirm modal state
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const debouncedSearch = useDebounced(searchQuery, 400);

  const [jobForm, setJobForm] = useState(emptyForm());

  const [candidateForm, setCandidateForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    notice_period: "",
    resume_url: "",
    screeningAnswers: {},
  });

  const [interviewForm, setInterviewForm] = useState({
    round_name: "",
    interviewer: "",
    interview_type: "Technical",
    duration: "60 mins",
    feedback: "",
    result: "Pending",
    score: "",
    notes: "",
  });

  const organizationId = useMemo(() => {
    try {
      const org = JSON.parse(localStorage.getItem("org") || "{}");
      return org?.id || org?.organization_id || null;
    } catch {
      return null;
    }
  }, []);

  const fetchSeq = useRef(0);

  // ============================================
  // CONFIRM HELPER (Toast-style custom modal)
  // ============================================
  const confirmAction = (title, message) =>
    new Promise((resolve) => {
      setConfirmState({
        open: true,
        title,
        message,
        onConfirm: (ok) => {
          setConfirmState({
            open: false,
            title: "",
            message: "",
            onConfirm: null,
          });
          resolve(ok);
        },
      });
    });

  // ============================================
  // API CALLS
  // ============================================
  const fetchJobsApi = useCallback(async () => {
    if (!organizationId) {
      setError("Organization not found.");
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
      if (seq !== fetchSeq.current) return;

      if (res?.success) {
        const list = res.data?.jobs || res.data || [];
        setJobs(asArray(list).map(mapJobFromApi));
      } else {
        const msg = res?.message || "Failed to load jobs";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      const msg = err?.message || "Failed to load jobs";
      setError(msg);
      toast.error(msg);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [organizationId, statusFilter, deptFilter, debouncedSearch]);

  const fetchTeams = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await api.get(
        `${APIPATHS.getAllTeams}/${organizationId}`,
      );
      const teamsList = response.data || response || [];
      setTeams(Array.isArray(teamsList) ? teamsList : []);
    } catch (err) {
      console.error("fetchTeams error:", err);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchJobsApi();
    fetchTeams();
  }, [fetchJobsApi, fetchTeams]);

  const fetchCandidatesByJobApi = async (jobId) => {
    try {
      const url = `${APIPATHS.getAllCandidates}?job_id=${encodeURIComponent(
        jobId,
      )}`;
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
  const createInterviewApi = (payload) =>
    api.post(APIPATHS.createInterview, payload);
  const createCandidateApi = (payload) =>
    api.post(APIPATHS.createCandidate, payload);

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
      responsibilities: job.responsibilities || "",
      requirements: (job.requirements || []).join("\n"),
      skills: (job.skills || []).join(", "),
      rounds: job.rounds || 1,
      screeningQuestions:
        job.screeningQuestions.length > 0
          ? job.screeningQuestions.map((q) => ({
              question: q.question || "",
              answer: q.answer || "",
            }))
          : [{ question: "", answer: "" }],
    });
    setShowJobModal(true);
  };

  const handleArchive = async (job) => {
    const ok = await confirmAction(
      "Archive Job",
      `Archive "${job.title}"? This will move it to On Hold.`,
    );
    if (!ok) return;
    try {
      const res = await updateJobStatusApi(job.id, "On Hold");
      if (res?.success) {
        toast.success("Job archived successfully");
        fetchJobsApi();
      } else {
        toast.error(res?.message || "Failed to archive");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to archive");
    }
  };

  const handleDelete = async (job) => {
    const ok = await confirmAction(
      "Delete Job",
      `Delete "${job.title}"? This action cannot be undone.`,
    );
    if (!ok) return;
    try {
      const res = await deleteJobApi(job.id);
      if (res?.success) {
        toast.success("Job deleted successfully");
        fetchJobsApi();
      } else {
        toast.error(res?.message || "Failed to delete");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organization not found.");
    if (!jobForm.title.trim() || !jobForm.department)
      return toast.error("Title and Department are required");

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
        .filter((q) => q.question.trim() !== "")
        .map((q) => ({
          question: q.question.trim(),
          answer: (q.answer || "").trim(),
        }));

      const roundsNum = Math.max(1, parseInt(jobForm.rounds, 10) || 1);

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
        team: jobForm.team || null,
        experience_required: jobForm.experience || null,
        employment_type:
          jobForm.employmentType.charAt(0).toUpperCase() +
          jobForm.employmentType.slice(1),
        location:
          jobForm.location.charAt(0).toUpperCase() + jobForm.location.slice(1),
        description: jobForm.description.trim() || null,
        responsibilities: jobForm.responsibilities.trim() || null,
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
        toast.success(
          editingJob ? "Job updated successfully" : "Job created successfully",
        );
        setShowJobModal(false);
        setEditingJob(null);
        setJobForm(emptyForm());
        fetchJobsApi();
      } else {
        toast.error(res?.message || "Failed to save job");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save job");
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

  const handleOpenAddCandidate = () => {
    const initialAnswers = {};
    if (selectedJob?.screeningQuestions) {
      selectedJob.screeningQuestions.forEach((q) => {
        initialAnswers[q.question] = "";
      });
    }
    setCandidateForm({
      name: "",
      email: "",
      phone: "",
      experience: "",
      notice_period: "",
      resume_url: "",
      screeningAnswers: initialAnswers,
    });
    setShowAddCandidateModal(true);
  };

  const handleSubmitCandidate = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      const payload = {
        ...candidateForm,
        job_id: selectedJob.id,
        organization_id: organizationId,
      };
      const res = await createCandidateApi(payload);
      if (res?.success) {
        toast.success("Candidate added successfully");
        setShowAddCandidateModal(false);
        const candidates = await fetchCandidatesByJobApi(selectedJob.id);
        setSelectedJob((prev) => (prev ? { ...prev, candidates } : prev));
        fetchJobsApi();
      } else {
        toast.error(res?.message || "Failed to add candidate");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to add candidate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectCandidate = async (candidate) => {
    const ok = await confirmAction(
      "Reject Candidate",
      `Reject ${candidate.name}? This will mark them as Rejected.`,
    );
    if (!ok) return;
    try {
      const res = await updateCandidateStatusApi(candidate.id, "Rejected");
      if (res?.success) {
        toast.success("Candidate rejected");
        setShowCandidateModal(false);
        setSelectedCandidate(null);
        if (selectedJob) {
          const candidates = await fetchCandidatesByJobApi(selectedJob.id);
          setSelectedJob((prev) => (prev ? { ...prev, candidates } : prev));
        }
        fetchJobsApi();
      } else {
        toast.error(res?.message || "Failed to reject");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to reject");
    }
  };

  const handleScheduleInterview = () => {
    setInterviewForm({
      round_name: "",
      interviewer: "",
      interview_type: "Technical",
      duration: "60 mins",
      feedback: "",
      result: "Pending",
      score: "",
      notes: "",
    });
    setShowInterviewModal(true);
  };

  const handleSubmitInterview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        candidate_id: selectedCandidate.id,
        ...interviewForm,
        score: interviewForm.score ? parseInt(interviewForm.score, 10) : null,
      };
      const res = await createInterviewApi(payload);
      if (res?.success) {
        toast.success("Interview scheduled successfully");
        setShowInterviewModal(false);
        const updatedCand = await getCandidateByIdApi(selectedCandidate.id);
        if (updatedCand?.success) {
          setSelectedCandidate(mapCandidateFromApi(updatedCand.data));
        }
        fetchJobsApi();
      } else {
        toast.error(res?.message || "Failed to add interview");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to add interview");
    } finally {
      setSubmitting(false);
    }
  };

  // Screening question handlers
  const handleAddQuestion = () => {
    setJobForm({
      ...jobForm,
      screeningQuestions: [
        ...jobForm.screeningQuestions,
        { question: "", answer: "" },
      ],
    });
  };
  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...jobForm.screeningQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setJobForm({ ...jobForm, screeningQuestions: updated });
  };
  const handleRemoveQuestion = (index) => {
    if (jobForm.screeningQuestions.length === 1) return;
    setJobForm({
      ...jobForm,
      screeningQuestions: jobForm.screeningQuestions.filter(
        (_, i) => i !== index,
      ),
    });
  };

  const handleUpdateCandidateAnswer = (question, value) => {
    setCandidateForm((prev) => ({
      ...prev,
      screeningAnswers: { ...prev.screeningAnswers, [question]: value },
    }));
  };

  // ============================================
  // STYLING
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
      {/* Custom Confirm Modal */}
      {confirmState.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {confirmState.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => confirmState.onConfirm?.(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmState.onConfirm?.(true)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats & Header */}
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
            <Plus className="w-4 h-4" /> Create Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
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

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading jobs…
        </div>
      )}
      {!loading && jobs.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No jobs found.
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
                </div>
                <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 flex-wrap">
                  <button
                    onClick={() => handleViewJob(job)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-xs font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEditJob(job)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-medium"
                  >
                    <Edit className="w-3.5 h-3.5 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchive(job)}
                    className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-xs font-medium"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(job)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium"
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
                className="p-2 hover:bg-gray-100 rounded-lg"
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

              {selectedJob.responsibilities && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Responsibilities
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedJob.responsibilities}
                  </p>
                </div>
              )}

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
                    Screening Questions & Expected Answers
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.screeningQuestions.map((q, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-800">
                          Q{idx + 1}. {q.question}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Expected: {q.answer || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
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
                  <button
                    onClick={handleOpenAddCandidate}
                    className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-all"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Candidate
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
                      </div>
                    </div>
                  ))}
                  {selectedJob.candidates.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No candidates yet. Click "Add Candidate" to add one.
                    </p>
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
                className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
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

              {selectedJob?.screeningQuestions &&
                selectedJob.screeningQuestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Screening Questions & Answers
                    </h4>
                    <div className="space-y-3">
                      {selectedJob.screeningQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-lg p-3"
                        >
                          <p className="text-sm text-gray-800 font-medium">
                            Q{idx + 1}. {q.question}
                          </p>
                          <p className="text-xs text-gray-500 italic mt-1">
                            Expected: {q.answer || "—"}
                          </p>
                          <p className="text-sm text-emerald-700 font-medium mt-2">
                            Candidate:{" "}
                            {selectedCandidate.screeningAnswers?.[q.question] ||
                              "Not answered"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${interview.result === "Passed" ? "bg-green-100 text-green-700 border-green-200" : interview.result === "Failed" ? "bg-red-100 text-red-700 border-red-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}
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
                  onClick={() => handleScheduleInterview()}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                >
                  <UserCheck className="w-4 h-4" /> Schedule Interview
                </button>
                <button
                  onClick={() => handleRejectCandidate(selectedCandidate)}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" /> Reject
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
                className="p-2 hover:bg-gray-100 rounded-lg"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
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
                    <select
                      value={jobForm.team}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, team: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
                    >
                      <option value="">Select Team</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
                    >
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Job Description
                  </label>
                  <textarea
                    rows="2"
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
                    placeholder="Short description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Responsibilities
                  </label>
                  <textarea
                    rows="2"
                    value={jobForm.responsibilities}
                    onChange={(e) =>
                      setJobForm({
                        ...jobForm,
                        responsibilities: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
                    placeholder="Key responsibilities..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Requirements (one per line)
                  </label>
                  <textarea
                    rows="2"
                    value={jobForm.requirements}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, requirements: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    value={jobForm.skills}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, skills: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:border-emerald-500"
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Screening Questions & Expected Answers
                    </label>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Question
                    </button>
                  </div>
                  <div className="space-y-3">
                    {jobForm.screeningQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-400 w-4">
                            Q{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) =>
                              handleUpdateQuestion(
                                idx,
                                "question",
                                e.target.value,
                              )
                            }
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-black bg-white focus:border-emerald-500"
                            placeholder="Enter question..."
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            disabled={jobForm.screeningQuestions.length === 1}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="pl-6">
                          <input
                            type="text"
                            value={q.answer}
                            onChange={(e) =>
                              handleUpdateQuestion(
                                idx,
                                "answer",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black bg-white focus:border-emerald-500"
                            placeholder="Expected answer / criteria..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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

      {/* Add Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">
                Add New Candidate
              </h2>
              <button
                onClick={() => setShowAddCandidateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={handleSubmitCandidate}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={candidateForm.name}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={candidateForm.phone}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Experience
                  </label>
                  <input
                    type="text"
                    value={candidateForm.experience}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        experience: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g., 3 years"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notice Period
                  </label>
                  <input
                    type="text"
                    value={candidateForm.notice_period}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        notice_period: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g., 2 weeks"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Resume URL
                  </label>
                  <input
                    type="url"
                    value={candidateForm.resume_url}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        resume_url: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="https://..."
                  />
                </div>

                {selectedJob?.screeningQuestions &&
                  selectedJob.screeningQuestions.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Screening Answers
                      </h4>
                      <div className="space-y-3">
                        {selectedJob.screeningQuestions.map((q, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              {idx + 1}. {q.question}
                            </p>
                            <p className="text-xs text-gray-500 italic mb-2">
                              Expected: {q.answer || "—"}
                            </p>
                            <textarea
                              rows="2"
                              value={
                                candidateForm.screeningAnswers[q.question] || ""
                              }
                              onChange={(e) =>
                                handleUpdateCandidateAnswer(
                                  q.question,
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              placeholder="Candidate's answer..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
                  >
                    {submitting ? "Saving..." : "Add Candidate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCandidateModal(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">
                Schedule Interview
              </h2>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={handleSubmitInterview}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Round Name *
                  </label>
                  <input
                    type="text"
                    value={interviewForm.round_name}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        round_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                    placeholder="e.g., Technical Round 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Interviewer
                  </label>
                  <input
                    type="text"
                    value={interviewForm.interviewer}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        interviewer: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Type
                    </label>
                    <select
                      value={interviewForm.interview_type}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          interview_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="Technical">Technical</option>
                      <option value="HR">HR</option>
                      <option value="Managerial">Managerial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={interviewForm.duration}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          duration: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
                  >
                    {submitting ? "Saving..." : "Save Interview"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInterviewModal(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
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
