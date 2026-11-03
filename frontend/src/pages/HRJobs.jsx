import {
  AlertCircle,
  Archive,
  Award,
  Briefcase,
  Building,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  DollarSign,
  Edit,
  FileText,
  Filter,
  Globe,
  Loader2,
  MapPin,
  MinusCircle,
  Pause,
  Phone,
  Play,
  Plus,
  PlusCircle,
  Search,
  Send,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  salaryExpectation: c.salary_expectation || "—",
  linkedinUrl: c.linkedin_url || "",
  portfolioUrl: c.portfolio_url || "",
  githubUrl: c.github_url || "",
  currentCompany: c.current_company || "—",
  currentDesignation: c.current_designation || "—",
  hrCallNotes: c.hr_call_notes || "",
  hrCallStatus: c.hr_call_status || "Pending",
  interviewHistory: asArray(c.interviews).map((i) => ({
    id: i.id,
    round: i.round_name || "—",
    interviewer: i.interviewer || "—",
    feedback: i.feedback || "",
    result: i.result || "Pending",
    score: i.score,
    notes: i.notes || "",
    type: i.interview_type || "",
    duration: i.duration || "",
  })),
  rounds: asArray(c.rounds).map((r) => ({
    id: r.id,
    roundNumber: r.round_number,
    roundName: r.round_name,
    roundType: r.round_type,
    interviewer: r.interviewer,
    status: r.status,
    questionsAsked: r.questions_asked || [],
    overallFeedback: r.overall_feedback || "",
    overallScore: r.overall_score,
    scheduledAt: r.scheduled_at,
    conductedAt: r.conducted_at,
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

const emptyCandidateForm = () => ({
  name: "",
  email: "",
  phone: "",
  experience: "",
  notice_period: "",
  resume_url: "",
  screeningAnswers: {},
  salary_expectation: "",
  linkedin_url: "",
  portfolio_url: "",
  github_url: "",
  current_company: "",
  current_designation: "",
  hr_call_notes: "",
  hr_call_status: "Pending",
});

const emptyRoundForm = (nextNum = 1) => ({
  round_number: nextNum,
  round_name: "",
  round_type: "HR Call",
  interviewer: "",
  status: "Pending",
  questions_asked: [
    {
      question: "",
      expected_answer: "",
      candidate_answer: "",
      answered: false,
      quality: "Average",
      score: 0,
    },
  ],
  overall_feedback: "",
  overall_score: "",
});

// ============================================
// MAIN COMPONENT
// ============================================
const HRJobs = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [candidateTab, setCandidateTab] = useState("overview");
  const [expandedRounds, setExpandedRounds] = useState({});

  const [jobs, setJobs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const debouncedSearch = useDebounced(searchQuery, 400);

  const [jobForm, setJobForm] = useState(emptyForm());
  const [candidateForm, setCandidateForm] = useState(emptyCandidateForm());
  const [roundForm, setRoundForm] = useState(emptyRoundForm());

  const organizationId = useMemo(() => {
    try {
      const org = JSON.parse(localStorage.getItem("org") || "{}");
      return org?.id || org?.organization_id || null;
    } catch {
      return null;
    }
  }, []);

  const fetchSeq = useRef(0);

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
      if (teamFilter !== "all") params.append("team", teamFilter);
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
  }, [organizationId, statusFilter, teamFilter, debouncedSearch]);

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

  // Job APIs
  const createJobApi = (payload) => api.post(APIPATHS.createJob, payload);
  const updateJobApi = (id, payload) =>
    api.put(buildPath(APIPATHS.updateJob, { id }), payload);
  const updateJobStatusApi = (id, status) =>
    api.patch(buildPath(APIPATHS.updateJobStatus, { id }), { status });
  const deleteJobApi = (id) =>
    api.delete(buildPath(APIPATHS.deleteJob, { id }));

  // Candidate APIs
  const createCandidateApi = (payload) =>
    api.post(APIPATHS.createCandidate, payload);
  const getCandidateByIdApi = (id) =>
    api.get(buildPath(APIPATHS.getCandidateById, { id }));
  const updateCandidateStatusApi = (id, status) =>
    api.patch(buildPath(APIPATHS.updateCandidateStatus, { id }), { status });

  // Round APIs
  const createRoundApi = (payload) => api.post(APIPATHS.createRound, payload);
  const updateRoundApi = (id, payload) =>
    api.put(buildPath(APIPATHS.updateRound, { id }), payload);
  const deleteRoundApi = (id) =>
    api.delete(buildPath(APIPATHS.deleteRound, { id }));

  // ============================================
  // HANDLERS — JOBS
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
        toast.success("Job archived");
        fetchJobsApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  const handleDelete = async (job) => {
    const ok = await confirmAction(
      "Delete Job",
      `Delete "${job.title}"? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      const res = await deleteJobApi(job.id);
      if (res?.success) {
        toast.success("Job deleted");
        fetchJobsApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
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
        toast.success(editingJob ? "Job updated" : "Job created");
        setShowJobModal(false);
        setEditingJob(null);
        setJobForm(emptyForm());
        fetchJobsApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
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

  // ============================================
  // HANDLERS — CANDIDATES
  // ============================================
  const handleViewCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setCandidateTab("overview");
    setShowCandidateModal(true);
    try {
      const res = await getCandidateByIdApi(candidate.id);
      if (res?.success && res.data)
        setSelectedCandidate(mapCandidateFromApi(res.data));
    } catch (err) {
      console.error(err);
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
      ...emptyCandidateForm(),
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
        toast.success("Candidate added");
        setShowAddCandidateModal(false);
        const candidates = await fetchCandidatesByJobApi(selectedJob.id);
        setSelectedJob((prev) => (prev ? { ...prev, candidates } : prev));
        fetchJobsApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectCandidate = async (candidate) => {
    const ok = await confirmAction(
      "Reject Candidate",
      `Reject ${candidate.name}?`,
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
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  const handleUpdateCandidateAnswer = (question, value) => {
    setCandidateForm((prev) => ({
      ...prev,
      screeningAnswers: { ...prev.screeningAnswers, [question]: value },
    }));
  };

  // ============================================
  // HANDLERS — ROUNDS
  // ============================================
  const handleOpenAddRound = () => {
    const nextNum = (selectedCandidate?.rounds?.length || 0) + 1;
    setEditingRound(null);
    setRoundForm(emptyRoundForm(nextNum));
    setShowRoundModal(true);
  };

  const handleEditRound = (round) => {
    setEditingRound(round);
    setRoundForm({
      round_number: round.roundNumber,
      round_name: round.roundName,
      round_type: round.roundType || "Interview",
      interviewer: round.interviewer || "",
      status: round.status || "Pending",
      questions_asked:
        round.questionsAsked?.length > 0
          ? round.questionsAsked.map((q) => ({
              question: q.question || "",
              expected_answer: q.expected_answer || "",
              candidate_answer: q.candidate_answer || "",
              answered: !!q.answered,
              quality: q.quality || "Average",
              score: q.score || 0,
            }))
          : [
              {
                question: "",
                expected_answer: "",
                candidate_answer: "",
                answered: false,
                quality: "Average",
                score: 0,
              },
            ],
      overall_feedback: round.overallFeedback || "",
      overall_score:
        round.overallScore != null ? String(round.overallScore) : "",
    });
    setShowRoundModal(true);
  };

  const handleAddRoundQuestion = () => {
    setRoundForm({
      ...roundForm,
      questions_asked: [
        ...roundForm.questions_asked,
        {
          question: "",
          expected_answer: "",
          candidate_answer: "",
          answered: false,
          quality: "Average",
          score: 0,
        },
      ],
    });
  };
  const handleUpdateRoundQuestion = (i, field, value) => {
    const updated = [...roundForm.questions_asked];
    updated[i] = { ...updated[i], [field]: value };
    setRoundForm({ ...roundForm, questions_asked: updated });
  };
  const handleRemoveRoundQuestion = (i) => {
    if (roundForm.questions_asked.length === 1) return;
    setRoundForm({
      ...roundForm,
      questions_asked: roundForm.questions_asked.filter((_, idx) => idx !== i),
    });
  };

  const handleSubmitRound = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    if (!roundForm.round_name.trim()) return toast.error("Round name required");
    setSubmitting(true);
    try {
      const cleanQuestions = roundForm.questions_asked
        .filter((q) => q.question.trim() !== "")
        .map((q) => ({
          question: q.question.trim(),
          expected_answer: (q.expected_answer || "").trim(),
          candidate_answer: (q.candidate_answer || "").trim(),
          answered: !!q.answered,
          quality: q.quality || "Average",
          score: q.score ? parseInt(q.score, 10) : 0,
        }));

      const payload = {
        candidate_id: selectedCandidate.id,
        round_number: parseInt(roundForm.round_number, 10) || 1,
        round_name: roundForm.round_name.trim(),
        round_type: roundForm.round_type,
        interviewer: roundForm.interviewer.trim() || null,
        status: roundForm.status,
        questions_asked: cleanQuestions,
        overall_feedback: roundForm.overall_feedback.trim() || null,
        overall_score: roundForm.overall_score
          ? parseInt(roundForm.overall_score, 10)
          : null,
      };

      const res = editingRound
        ? await updateRoundApi(editingRound.id, payload)
        : await createRoundApi(payload);

      if (res?.success) {
        toast.success(editingRound ? "Round updated" : "Round added");
        setShowRoundModal(false);
        setEditingRound(null);
        const updatedCand = await getCandidateByIdApi(selectedCandidate.id);
        if (updatedCand?.success)
          setSelectedCandidate(mapCandidateFromApi(updatedCand.data));
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRound = async (round) => {
    const ok = await confirmAction(
      "Delete Round",
      `Delete "${round.roundName}"?`,
    );
    if (!ok) return;
    try {
      const res = await deleteRoundApi(round.id);
      if (res?.success) {
        toast.success("Round deleted");
        const updatedCand = await getCandidateByIdApi(selectedCandidate.id);
        if (updatedCand?.success)
          setSelectedCandidate(mapCandidateFromApi(updatedCand.data));
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  const toggleRoundExpand = (id) => {
    setExpandedRounds((prev) => ({ ...prev, [id]: !prev[id] }));
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
  const roundStatusColors = {
    Pending: "bg-gray-100 text-gray-700 border-gray-200",
    Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
    Passed: "bg-green-100 text-green-700 border-green-200",
    Failed: "bg-red-100 text-red-700 border-red-200",
    "On Hold": "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  const qualityColors = {
    Poor: "bg-red-100 text-red-700",
    Average: "bg-yellow-100 text-yellow-700",
    Good: "bg-green-100 text-green-700",
    Excellent: "bg-emerald-100 text-emerald-700",
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
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmState.onConfirm?.(true)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
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

      {/* Job Details Modal */}
      {selectedJob && !showCandidateModal && (
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
                    {selectedJob.requirements.map((r, i) => (
                      <li key={i}>
                        {typeof r === "string" ? r : JSON.stringify(r)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedJob.screeningQuestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Screening Questions
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.screeningQuestions.map((q, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-800">
                          Q{i + 1}. {q.question}
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

      {/* ============================================
          CANDIDATE PROFILE MODAL (Tabbed)
          ============================================ */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
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

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-[73px] z-10">
              {[
                { key: "overview", label: "Overview" },
                { key: "screening", label: "Screening Answers" },
                {
                  key: "rounds",
                  label: `Rounds (${selectedCandidate.rounds.length})`,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCandidateTab(tab.key)}
                  className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${candidateTab === tab.key ? "border-emerald-600 text-emerald-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* ============ TAB: OVERVIEW ============ */}
              {candidateTab === "overview" && (
                <div className="space-y-6">
                  {/* Basic grid */}
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
                        label: "Current Company",
                        value: selectedCandidate.currentCompany,
                        icon: Building,
                      },
                      {
                        label: "Current Designation",
                        value: selectedCandidate.currentDesignation,
                        icon: Award,
                      },
                      {
                        label: "Notice Period",
                        value: selectedCandidate.noticePeriod,
                        icon: Calendar,
                      },
                      {
                        label: "Salary Expectation",
                        value: selectedCandidate.salaryExpectation,
                        icon: DollarSign,
                      },
                      {
                        label: "Status",
                        value: selectedCandidate.status,
                        icon: Circle,
                      },
                      {
                        label: "Stage",
                        value: selectedCandidate.stage,
                        icon: Users,
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                          <item.icon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{item.value || "—"}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Social Links */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Social & Professional Links
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.resume_url &&
                        selectedCandidate.resume_url !== "—" && (
                          <a
                            href={selectedCandidate.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                          >
                            <FileText className="w-3.5 h-3.5" /> Resume
                          </a>
                        )}
                      {selectedCandidate.linkedinUrl && (
                        <a
                          href={selectedCandidate.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                        >
                          LinkedIn
                        </a>
                      )}
                      {selectedCandidate.githubUrl && (
                        <a
                          href={selectedCandidate.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                        >
                          GitHub
                        </a>
                      )}
                      {selectedCandidate.portfolioUrl && (
                        <a
                          href={selectedCandidate.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100"
                        >
                          <Globe className="w-3.5 h-3.5" /> Portfolio
                        </a>
                      )}
                      {(!selectedCandidate.resume_url ||
                        selectedCandidate.resume_url === "—") &&
                        !selectedCandidate.linkedinUrl &&
                        !selectedCandidate.githubUrl &&
                        !selectedCandidate.portfolioUrl && (
                          <p className="text-xs text-gray-400 italic">
                            No links provided
                          </p>
                        )}
                    </div>
                  </div>

                  {/* HR Call */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">
                        HR Call Details
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roundStatusColors[selectedCandidate.hrCallStatus] || roundStatusColors.Pending}`}
                      >
                        {selectedCandidate.hrCallStatus}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedCandidate.hrCallNotes || "No notes added yet."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setCandidateTab("rounds");
                      }}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                    >
                      <UserCheck className="w-4 h-4" /> View All Rounds
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(selectedCandidate)}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {/* ============ TAB: SCREENING ============ */}
              {candidateTab === "screening" && (
                <div className="space-y-3">
                  {(!selectedJob?.screeningQuestions ||
                    selectedJob.screeningQuestions.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      This job has no screening questions.
                    </p>
                  )}
                  {selectedJob?.screeningQuestions?.map((q, idx) => {
                    const candidateAnswer =
                      selectedCandidate.screeningAnswers?.[q.question] || "";
                    const answered = candidateAnswer.trim() !== "";
                    const matchesExpected =
                      q.answer &&
                      candidateAnswer
                        .toLowerCase()
                        .includes(q.answer.toLowerCase());
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm text-gray-800 font-medium">
                            Q{idx + 1}. {q.question}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${answered ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                          >
                            {answered ? "Answered" : "Not answered"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 italic mb-2">
                          Expected: {q.answer || "—"}
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Candidate's Answer:
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {candidateAnswer || "—"}
                          </p>
                        </div>
                        {answered && q.answer && (
                          <p
                            className={`text-xs mt-2 font-medium ${matchesExpected ? "text-green-600" : "text-yellow-600"}`}
                          >
                            {matchesExpected
                              ? "✓ Matches expected criteria"
                              : "⚠ May not fully match expected criteria"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============ TAB: ROUNDS ============ */}
              {candidateTab === "rounds" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      All Rounds
                    </h4>
                    <button
                      onClick={handleOpenAddRound}
                      className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Round
                    </button>
                  </div>

                  {selectedCandidate.rounds.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No rounds added yet. Click "Add Round" to add HR call,
                      technical, etc.
                    </p>
                  )}

                  {selectedCandidate.rounds.map((round) => {
                    const isExpanded = !!expandedRounds[round.id];
                    return (
                      <div
                        key={round.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                          onClick={() => toggleRoundExpand(round.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center w-7 h-7 bg-emerald-600 text-white rounded-full text-xs font-bold flex-shrink-0">
                              {round.roundNumber}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {round.roundName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {round.roundType} •{" "}
                                {round.interviewer || "No interviewer"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roundStatusColors[round.status] || roundStatusColors.Pending}`}
                            >
                              {round.status}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 space-y-4 border-t border-gray-100">
                            {round.overallFeedback && (
                              <div className="bg-yellow-50 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">
                                  Overall Feedback:
                                </p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {round.overallFeedback}
                                </p>
                              </div>
                            )}
                            {round.overallScore != null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  Overall Score:
                                </span>
                                <span className="text-sm font-bold text-emerald-600">
                                  {round.overallScore}%
                                </span>
                              </div>
                            )}

                            {round.questionsAsked.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">
                                  Questions Asked ({round.questionsAsked.length}
                                  )
                                </p>
                                <div className="space-y-2">
                                  {round.questionsAsked.map((qa, qi) => (
                                    <div
                                      key={qi}
                                      className="bg-white border border-gray-100 rounded-lg p-3"
                                    >
                                      <p className="text-sm font-medium text-gray-800 mb-1">
                                        Q{qi + 1}. {qa.question}
                                      </p>
                                      {qa.expected_answer && (
                                        <p className="text-xs text-gray-500 italic mb-1">
                                          Expected: {qa.expected_answer}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-700 bg-gray-50 rounded p-2 mb-2 whitespace-pre-wrap">
                                        Answer: {qa.candidate_answer || "—"}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-medium ${qa.answered ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                        >
                                          {qa.answered
                                            ? "Answered"
                                            : "Not answered"}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-medium ${qualityColors[qa.quality] || qualityColors.Average}`}
                                        >
                                          Quality: {qa.quality}
                                        </span>
                                        {qa.score > 0 && (
                                          <span className="text-xs text-gray-500">
                                            Score: {qa.score}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleEditRound(round)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100"
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRound(round)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          ADD CANDIDATE MODAL
          ============================================ */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
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
                {/* Basic */}
                <div className="grid grid-cols-2 gap-3">
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
                      Salary Expectation
                    </label>
                    <input
                      type="text"
                      value={candidateForm.salary_expectation}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          salary_expectation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="e.g., 12 LPA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current Company
                    </label>
                    <input
                      type="text"
                      value={candidateForm.current_company}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          current_company: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current Designation
                    </label>
                    <input
                      type="text"
                      value={candidateForm.current_designation}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          current_designation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Links & Resume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Resume URL (or paste link)
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
                  <p className="text-xs text-gray-400 mt-1">
                    Tip: Upload to Drive/S3 first, paste the link here
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={candidateForm.linkedin_url}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          linkedin_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      GitHub
                    </label>
                    <input
                      type="url"
                      value={candidateForm.github_url}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          github_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Portfolio
                    </label>
                    <input
                      type="url"
                      value={candidateForm.portfolio_url}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          portfolio_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="portfolio.com"
                    />
                  </div>
                </div>

                {/* HR Call Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    HR Call Notes (Initial)
                  </label>
                  <textarea
                    rows="2"
                    value={candidateForm.hr_call_notes}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        hr_call_notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Notes from initial HR call..."
                  />
                </div>

                {/* Screening Answers */}
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
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
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

      {/* ============================================
          ADD / EDIT ROUND MODAL
          ============================================ */}
      {showRoundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {editingRound ? "Edit Round" : "Add Round"}
              </h2>
              <button
                onClick={() => {
                  setShowRoundModal(false);
                  setEditingRound(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={handleSubmitRound}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Round Number
                    </label>
                    <input
                      type="number"
                      value={roundForm.round_number}
                      onChange={(e) =>
                        setRoundForm({
                          ...roundForm,
                          round_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Round Name *
                    </label>
                    <input
                      type="text"
                      value={roundForm.round_name}
                      onChange={(e) =>
                        setRoundForm({
                          ...roundForm,
                          round_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      required
                      placeholder="e.g., HR Screening"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Round Type
                    </label>
                    <select
                      value={roundForm.round_type}
                      onChange={(e) =>
                        setRoundForm({
                          ...roundForm,
                          round_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="HR Call">HR Call</option>
                      <option value="Screening">Screening</option>
                      <option value="Technical">Technical</option>
                      <option value="Managerial">Managerial</option>
                      <option value="Final">Final</option>
                      <option value="Interview">Interview</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Interviewer
                    </label>
                    <input
                      type="text"
                      value={roundForm.interviewer}
                      onChange={(e) =>
                        setRoundForm({
                          ...roundForm,
                          interviewer: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Status
                    </label>
                    <select
                      value={roundForm.status}
                      onChange={(e) =>
                        setRoundForm({ ...roundForm, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Overall Score (0-100)
                    </label>
                    <input
                      type="number"
                      value={roundForm.overall_score}
                      onChange={(e) =>
                        setRoundForm({
                          ...roundForm,
                          overall_score: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Questions Asked
                    </label>
                    <button
                      type="button"
                      onClick={handleAddRoundQuestion}
                      className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Question
                    </button>
                  </div>
                  <div className="space-y-3">
                    {roundForm.questions_asked.map((qa, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-400 w-4">
                            Q{i + 1}
                          </span>
                          <input
                            type="text"
                            value={qa.question}
                            onChange={(e) =>
                              handleUpdateRoundQuestion(
                                i,
                                "question",
                                e.target.value,
                              )
                            }
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            placeholder="What was asked..."
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRoundQuestion(i)}
                            disabled={roundForm.questions_asked.length === 1}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={qa.expected_answer}
                          onChange={(e) =>
                            handleUpdateRoundQuestion(
                              i,
                              "expected_answer",
                              e.target.value,
                            )
                          }
                          className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          placeholder="Expected answer / criteria..."
                        />
                        <textarea
                          rows="2"
                          value={qa.candidate_answer}
                          onChange={(e) =>
                            handleUpdateRoundQuestion(
                              i,
                              "candidate_answer",
                              e.target.value,
                            )
                          }
                          className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          placeholder="Candidate's actual answer..."
                        />
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={qa.answered}
                              onChange={(e) =>
                                handleUpdateRoundQuestion(
                                  i,
                                  "answered",
                                  e.target.checked,
                                )
                              }
                            />
                            Answered
                          </label>
                          <select
                            value={qa.quality}
                            onChange={(e) =>
                              handleUpdateRoundQuestion(
                                i,
                                "quality",
                                e.target.value,
                              )
                            }
                            className="px-2 py-1 border border-gray-200 rounded text-xs"
                          >
                            <option value="Poor">Poor</option>
                            <option value="Average">Average</option>
                            <option value="Good">Good</option>
                            <option value="Excellent">Excellent</option>
                          </select>
                          <input
                            type="number"
                            value={qa.score}
                            onChange={(e) =>
                              handleUpdateRoundQuestion(
                                i,
                                "score",
                                e.target.value,
                              )
                            }
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-xs"
                            placeholder="Score"
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Overall Feedback
                  </label>
                  <textarea
                    rows="2"
                    value={roundForm.overall_feedback}
                    onChange={(e) =>
                      setRoundForm({
                        ...roundForm,
                        overall_feedback: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Overall round feedback..."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {submitting
                      ? "Saving..."
                      : editingRound
                        ? "Update Round"
                        : "Save Round"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoundModal(false);
                      setEditingRound(null);
                    }}
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
                    >
                      <option value="">Select</option>
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black"
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
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
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
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
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
    </div>
  );
};

export default HRJobs;
