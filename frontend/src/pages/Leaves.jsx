import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  Edit,
  FileText,
  Layers,
  Loader2,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import { getStoredSession, refreshSession } from "../services/auth";

// ---------- helpers ----------
const mapLeaveType = (lt) => ({
  id: lt.id,
  name: lt.name || "",
  description: lt.description || "",
  max_days_per_year: Number(lt.max_days_per_year) || 0,
  carry_forward_allowed: !!lt.carry_forward_allowed,
  is_paid: lt.is_paid ?? true,
  requires_approval: lt.requires_approval ?? true,
  is_active: lt.is_active ?? true,
});

const mapLeave = (l) => ({
  id: l.id,
  employeeId: l.employee_id,
  employeeName: l.employee_name || l.employee_email || "Unknown",
  employeeEmail: l.employee_email || "—",
  employeeAvatar: l.employee_avatar || null,
  employeeRole: l.employee_role || "—",
  leaveTypeId: l.leave_type_id,
  leaveTypeName: l.leave_type_name || "—",
  isPaid: l.is_paid,
  startDate: l.start_date ? String(l.start_date).slice(0, 10) : "",
  endDate: l.end_date ? String(l.end_date).slice(0, 10) : "",
  numberOfDays: Number(l.number_of_days) || 0,
  isHalfDay: !!l.is_half_day,
  halfDaySession: l.half_day_session || "",
  isWfh: !!l.is_wfh,
  reason: l.reason || "",
  status: l.status || "Pending",
  appliedDate: l.applied_date
    ? new Date(l.applied_date).toLocaleDateString()
    : "—",
  approvalComment: l.approval_comment || "",
  approvedByName: l.approved_by_name || null,
  rejectedByName: l.rejected_by_name || null,
  attachments: Array.isArray(l.attachments) ? l.attachments : [],
  actionedAt: l.actioned_at
    ? new Date(l.actioned_at).toLocaleDateString()
    : null,
});

const emptyLeaveTypeForm = () => ({
  name: "",
  description: "",
  max_days_per_year: 0,
  carry_forward_allowed: false,
  is_paid: true,
  requires_approval: true,
  is_active: true,
});

const emptyLeaveForm = () => ({
  leave_type_id: "",
  start_date: "",
  end_date: "",
  is_half_day: false,
  half_day_session: "",
  is_wfh: false,
  reason: "",
});

// Accept both DB style and UI style
const normalizeSessionForDb = (uiSession) => {
  const s = String(uiSession || "").trim();
  if (s === "Morning" || s === "AM") return "AM";
  if (s === "Afternoon" || s === "PM") return "PM";
  return "";
};

const displaySession = (dbSession) => {
  if (dbSession === "AM") return "Morning";
  if (dbSession === "PM") return "Afternoon";
  return dbSession || "";
};

// ============================================
// MAIN COMPONENT
// ============================================
const Leaves = () => {
  const [activeTab, setActiveTab] = useState("requests");

  const [organizationId, setOrganizationId] = useState(null);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Mount: read localStorage (fast), then re-hydrate via /auth/me (correct)
  useEffect(() => {
    const stored = getStoredSession();
    setOrganizationId(stored.organizationId);
    setCurrentMemberId(stored.memberId);
    setAuthReady(true);

    (async () => {
      const fresh = await refreshSession();
      if (fresh) {
        const org = fresh.org || {};
        const member = fresh.member || {};
        setOrganizationId(org.id || org.organization_id || null);
        setCurrentMemberId(member.id || member.member_id || null);
      }
    })();
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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

  // ---------- Leave Types state ----------
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState(emptyLeaveTypeForm());

  const fetchLeaveTypesApi = useCallback(async () => {
    if (!organizationId) {
      setTypesError("Organization not found. Please re-login.");
      return;
    }
    setTypesLoading(true);
    setTypesError("");
    try {
      const res = await api.get(
        `${APIPATHS.getAllLeaveTypes}?orgId=${organizationId}`,
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setLeaveTypes(list.map(mapLeaveType));
    } catch (err) {
      const msg = err?.message || "Failed to load leave types";
      setTypesError(msg);
      toast.error(msg);
    } finally {
      setTypesLoading(false);
    }
  }, [organizationId]);

  const createLeaveTypeApi = (payload) =>
    api.post(APIPATHS.createLeaveType, payload);
  const updateLeaveTypeApi = (id, payload) =>
    api.patch(APIPATHS.updateLeaveType.replace(":id", id), payload);
  const deleteLeaveTypeApi = (id) =>
    api.delete(APIPATHS.deleteLeaveType.replace(":id", id));

  const openCreateType = () => {
    setEditingType(null);
    setTypeForm(emptyLeaveTypeForm());
    setShowTypeModal(true);
  };

  const openEditType = (lt) => {
    setEditingType(lt);
    setTypeForm({
      name: lt.name,
      description: lt.description,
      max_days_per_year: lt.max_days_per_year,
      carry_forward_allowed: lt.carry_forward_allowed,
      is_paid: lt.is_paid,
      requires_approval: lt.requires_approval,
      is_active: lt.is_active,
    });
    setShowTypeModal(true);
  };

  const handleSubmitLeaveType = async (e) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organization not found.");
    if (!typeForm.name.trim()) return toast.error("Name is required");
    setSubmitting(true);
    try {
      const payload = {
        organization_id: organizationId,
        name: typeForm.name.trim(),
        description: typeForm.description.trim() || null,
        max_days_per_year: Number(typeForm.max_days_per_year) || 0,
        carry_forward_allowed: typeForm.carry_forward_allowed,
        is_paid: typeForm.is_paid,
        requires_approval: typeForm.requires_approval,
        is_active: typeForm.is_active,
      };
      const res = editingType
        ? await updateLeaveTypeApi(editingType.id, payload)
        : await createLeaveTypeApi(payload);
      if (res?.success) {
        toast.success(
          editingType ? "Leave type updated" : "Leave type created",
        );
        setShowTypeModal(false);
        setEditingType(null);
        setTypeForm(emptyLeaveTypeForm());
        fetchLeaveTypesApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeaveType = async (lt) => {
    const ok = await confirmAction(
      "Delete Leave Type",
      `Delete "${lt.name}"? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      const res = await deleteLeaveTypeApi(lt.id);
      if (res?.success) {
        toast.success("Leave type deleted");
        fetchLeaveTypesApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  // ---------- Leaves state ----------
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leavesError, setLeavesError] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dayTypeFilter, setDayTypeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [leaveForm, setLeaveForm] = useState(emptyLeaveForm());

  const [detailLeave, setDetailLeave] = useState(null);
  const [detailComment, setDetailComment] = useState("");

  const fetchLeavesApi = useCallback(async () => {
    if (!organizationId) {
      setLeavesError("Organization not found. Please re-login.");
      return;
    }
    setLeavesLoading(true);
    setLeavesError("");
    try {
      const params = new URLSearchParams();
      params.append("orgId", organizationId);
      params.append("page", page);
      params.append("limit", pagination.limit || 10);
      if (statusFilter) params.append("status", statusFilter);
      if (dayTypeFilter) params.append("dayType", dayTypeFilter);
      if (startDateFilter) params.append("startDate", startDateFilter);
      if (endDateFilter) params.append("endDate", endDateFilter);
      if (debouncedSearch.trim())
        params.append("search", debouncedSearch.trim());

      const res = await api.get(
        `${APIPATHS.getAllLeaves}?${params.toString()}`,
      );
      const list = Array.isArray(res?.data?.leaves) ? res.data?.leaves : [];
      setLeaves(list.map(mapLeave));
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      const msg = err?.message || "Failed to load leaves";
      setLeavesError(msg);
      toast.error(msg);
    } finally {
      setLeavesLoading(false);
    }
  }, [
    organizationId,
    page,
    pagination.limit,
    statusFilter,
    dayTypeFilter,
    startDateFilter,
    endDateFilter,
    debouncedSearch,
  ]);

  const applyLeaveApi = (payload) => api.post(APIPATHS.applyLeave, payload);
  const updateLeaveApi = (id, payload) =>
    api.patch(APIPATHS.updateLeave.replace(":id", id), payload);
  const approveLeaveApi = (id, payload) =>
    api.patch(APIPATHS.approveLeave.replace(":id", id), payload);
  const rejectLeaveApi = (id, payload) =>
    api.patch(APIPATHS.rejectLeave.replace(":id", id), payload);
  const cancelLeaveApi = (id, payload) =>
    api.patch(APIPATHS.cancelLeave.replace(":id", id), payload);
  const getLeaveByIdApi = (id) =>
    api.get(APIPATHS.getLeaveById.replace(":id", id));

  // ---------- fetches ----------
  useEffect(() => {
    if (authReady && organizationId) fetchLeaveTypesApi();
  }, [authReady, organizationId, fetchLeaveTypesApi]);

  useEffect(() => {
    if (authReady && activeTab === "requests") fetchLeavesApi();
  }, [authReady, activeTab, fetchLeavesApi]);

  // ---------- Leave handlers ----------
  const openApplyLeave = () => {
    setEditingLeave(null);
    setLeaveForm(emptyLeaveForm());
    setShowLeaveModal(true);
  };

  const openEditLeave = (leave) => {
    setEditingLeave(leave);
    setLeaveForm({
      leave_type_id: leave.leaveTypeId,
      start_date: leave.startDate,
      end_date: leave.endDate,
      is_half_day: leave.isHalfDay,
      half_day_session: displaySession(leave.halfDaySession),
      is_wfh: leave.isWfh,
      reason: leave.reason,
    });
    setShowLeaveModal(true);
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organization not found.");
    if (!leaveForm.leave_type_id)
      return toast.error("Please select a leave type");
    if (!leaveForm.start_date || !leaveForm.end_date)
      return toast.error("Start and end dates are required");
    if (!leaveForm.reason.trim()) return toast.error("Reason is required");
    if (leaveForm.is_half_day && !leaveForm.half_day_session)
      return toast.error("Please select a half-day session");

    setSubmitting(true);
    try {
      const dbSession = leaveForm.is_half_day
        ? normalizeSessionForDb(leaveForm.half_day_session)
        : "";

      if (editingLeave) {
        const res = await updateLeaveApi(editingLeave.id, {
          ...leaveForm,
          half_day_session: dbSession,
        });
        if (res?.success) {
          toast.success("Leave updated");
          setShowLeaveModal(false);
          setEditingLeave(null);
          fetchLeavesApi();
        } else toast.error(res?.message || "Failed");
      } else {
        if (!currentMemberId)
          return toast.error("Employee record not found. Please re-login.");
        const payload = {
          organization_id: organizationId,
          employee_id: currentMemberId,
          leave_type_id: leaveForm.leave_type_id,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          is_half_day: leaveForm.is_half_day,
          half_day_session: dbSession,
          is_wfh: leaveForm.is_wfh,
          reason: leaveForm.reason,
        };
        const res = await applyLeaveApi(payload);
        if (res?.success) {
          toast.success("Leave request submitted");
          setShowLeaveModal(false);
          fetchLeavesApi();
        } else toast.error(res?.message || "Failed");
      }
    } catch (err) {
      toast.error(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewLeave = async (leave) => {
    setDetailLeave(leave);
    setDetailComment(leave.approvalComment || "");
    try {
      const res = await getLeaveByIdApi(leave.id);
      if (res?.success && res.data) {
        const d = res.data;
        setDetailLeave({
          ...leave,
          approvalComment: d.approval_comment || "",
          approvedByName: d.approved_by_name || null,
          rejectedByName: d.rejected_by_name || null,
          attachments: Array.isArray(d.attachments) ? d.attachments : [],
          actionedAt: d.actioned_at
            ? new Date(d.actioned_at).toLocaleDateString()
            : null,
        });
      }
    } catch {
      /* ignore */
    }
  };

  const handleApprove = async (leave, comment) => {
    try {
      const res = await approveLeaveApi(leave.id, {
        member_id: currentMemberId,
        comment: comment || "",
      });
      if (res?.success) {
        toast.success("Leave approved");
        setDetailLeave(null);
        fetchLeavesApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  const handleReject = async (leave, comment) => {
    try {
      const res = await rejectLeaveApi(leave.id, {
        member_id: currentMemberId,
        comment: comment || "",
      });
      if (res?.success) {
        toast.success("Leave rejected");
        setDetailLeave(null);
        fetchLeavesApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  const handleCancel = async (leave, comment) => {
    const ok = await confirmAction(
      "Cancel Leave",
      `Cancel this leave request from ${leave.employeeName}?`,
    );
    if (!ok) return;
    try {
      const res = await cancelLeaveApi(leave.id, {
        member_id: currentMemberId,
        comment: comment || "",
      });
      if (res?.success) {
        toast.success("Leave cancelled");
        setDetailLeave(null);
        fetchLeavesApi();
      } else toast.error(res?.message || "Failed");
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  // ============================================
  // STYLING HELPERS
  // ============================================
  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
    Cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="w-3 h-3" />;
      case "Rejected":
        return <XCircle className="w-3 h-3" />;
      case "Cancelled":
        return <Ban className="w-3 h-3" />;
      case "Pending":
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const activeLeaveTypes = useMemo(
    () => leaveTypes.filter((lt) => lt.is_active),
    [leaveTypes],
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="w-full overflow-scroll h-[80dvh]">
      {/* Confirm Modal */}
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

      {/* Header Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "requests"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Leave Requests
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "types"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Layers className="w-4 h-4" /> Leave Types
          </button>
        </div>
      </div>

      {/* ========== TAB: LEAVE REQUESTS ========== */}
      {activeTab === "requests" && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search employee..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              value={dayTypeFilter}
              onChange={(e) => {
                setDayTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Day Types</option>
              <option value="Full Day">Full Day</option>
              <option value="Half Day">Half Day</option>
              <option value="WFH">WFH</option>
              <option value="Multiple Days">Multiple Days</option>
            </select>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
            />
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={openApplyLeave}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Apply Leave
            </button>
          </div>

          {leavesError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {leavesError}
            </div>
          )}

          {leavesLoading && (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading leaves…
            </div>
          )}

          {!leavesLoading && leaves.length === 0 && !leavesError && (
            <div className="text-center py-16 text-gray-500 text-sm">
              No leave requests found.
            </div>
          )}

          {!leavesLoading && leaves.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        "Employee",
                        "Leave Type",
                        "Dates",
                        "Days",
                        "Flags",
                        "Status",
                        "Applied",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaves.map((lv) => (
                      <tr key={lv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                              {(lv.employeeName || "?").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">
                                {lv.employeeName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {lv.employeeEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {lv.leaveTypeName}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {lv.startDate} → {lv.endDate}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {lv.numberOfDays}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {lv.isHalfDay && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                                Half
                                {lv.halfDaySession
                                  ? ` (${displaySession(lv.halfDaySession)})`
                                  : ""}
                              </span>
                            )}
                            {lv.isWfh && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                WFH
                              </span>
                            )}
                            {!lv.isHalfDay && !lv.isWfh && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${
                              statusColors[lv.status] || statusColors.Pending
                            }`}
                          >
                            {getStatusIcon(lv.status)}
                            {lv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {lv.appliedDate}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewLeave(lv)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-medium hover:bg-emerald-100"
                            >
                              View
                            </button>
                            {lv.status === "Pending" &&
                              lv.employeeId === currentMemberId && (
                                <button
                                  onClick={() => openEditLeave(lv)}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-600">
                  <span>
                    Showing {leaves.length} of {pagination.total} · Page{" "}
                    {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========== TAB: LEAVE TYPES ========== */}
      {activeTab === "types" && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              Define leave categories available to employees in your
              organization.
            </p>
            <button
              onClick={openCreateType}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New Leave Type
            </button>
          </div>

          {typesError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {typesError}
            </div>
          )}

          {typesLoading && (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading leave
              types…
            </div>
          )}

          {!typesLoading && leaveTypes.length === 0 && !typesError && (
            <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl text-sm">
              No leave types yet. Create one to get started.
            </div>
          )}

          {!typesLoading && leaveTypes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveTypes.map((lt) => (
                <div
                  key={lt.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-base font-semibold text-gray-800">
                      {lt.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        lt.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {lt.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {lt.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                      {lt.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {lt.max_days_per_year} days/yr
                    </span>
                    {lt.is_paid && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                        Paid
                      </span>
                    )}
                    {lt.carry_forward_allowed && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        Carry Forward
                      </span>
                    )}
                    {lt.requires_approval && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                        Approval
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 mt-auto">
                    <button
                      onClick={() => openEditType(lt)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-medium"
                    >
                      <Edit className="w-3.5 h-3.5 inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLeaveType(lt)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== MODAL: Create / Edit Leave Type ========== */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">
                {editingType ? "Edit Leave Type" : "New Leave Type"}
              </h3>
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  setEditingType(null);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeaveType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Annual Leave"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={typeForm.description}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description of this leave type"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Days Per Year
                </label>
                <input
                  type="number"
                  min={0}
                  value={typeForm.max_days_per_year}
                  onChange={(e) =>
                    setTypeForm((f) => ({
                      ...f,
                      max_days_per_year: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ["carry_forward_allowed", "Carry Forward Allowed"],
                  ["is_paid", "Paid Leave"],
                  ["requires_approval", "Requires Approval"],
                  ["is_active", "Active"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={!!typeForm[key]}
                      onChange={(e) =>
                        setTypeForm((f) => ({
                          ...f,
                          [key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTypeModal(false);
                    setEditingType(null);
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingType ? "Save Changes" : "Create Leave Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: Apply / Edit Leave ========== */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">
                {editingLeave ? "Edit Leave Request" : "Apply for Leave"}
              </h3>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setEditingLeave(null);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={leaveForm.leave_type_id}
                  onChange={(e) =>
                    setLeaveForm((f) => ({
                      ...f,
                      leave_type_id: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a leave type</option>
                  {activeLeaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) =>
                      setLeaveForm((f) => ({
                        ...f,
                        start_date: e.target.value,
                        end_date: f.is_half_day
                          ? e.target.value
                          : f.end_date || e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    min={leaveForm.start_date || undefined}
                    onChange={(e) =>
                      setLeaveForm((f) => ({ ...f, end_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={leaveForm.is_half_day}
                    onChange={(e) =>
                      setLeaveForm((f) => ({
                        ...f,
                        is_half_day: e.target.checked,
                        half_day_session: e.target.checked
                          ? f.half_day_session || "Morning"
                          : "",
                        end_date: e.target.checked ? f.start_date : f.end_date,
                      }))
                    }
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">Half Day</span>
                </label>

                {leaveForm.is_half_day ? (
                  <select
                    value={leaveForm.half_day_session}
                    onChange={(e) =>
                      setLeaveForm((f) => ({
                        ...f,
                        half_day_session: e.target.value,
                      }))
                    }
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Session</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                  </select>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={leaveForm.is_wfh}
                      onChange={(e) =>
                        setLeaveForm((f) => ({
                          ...f,
                          is_wfh: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">
                      Work From Home
                    </span>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  placeholder="Briefly describe the reason for leave"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveModal(false);
                    setEditingLeave(null);
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingLeave ? "Save Changes" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: Leave Detail ========== */}
      {detailLeave && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Leave Request Details
              </h3>
              <button
                onClick={() => setDetailLeave(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                {(detailLeave.employeeName || "?").charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {detailLeave.employeeName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {detailLeave.employeeEmail} · {detailLeave.employeeRole}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <p className="text-xs text-gray-500">Leave Type</p>
                <p className="text-gray-800 font-medium">
                  {detailLeave.leaveTypeName}
                  {detailLeave.isPaid ? (
                    <span className="ml-1 text-xs text-green-600">(Paid)</span>
                  ) : (
                    <span className="ml-1 text-xs text-gray-500">(Unpaid)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    statusColors[detailLeave.status] || statusColors.Pending
                  }`}
                >
                  {getStatusIcon(detailLeave.status)}
                  {detailLeave.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dates</p>
                <p className="text-gray-800">
                  {detailLeave.startDate} → {detailLeave.endDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Days</p>
                <p className="text-gray-800">
                  {detailLeave.numberOfDays}
                  {detailLeave.isHalfDay && (
                    <span className="text-xs text-purple-600 ml-1">
                      ({displaySession(detailLeave.halfDaySession) || "Half"})
                    </span>
                  )}
                  {detailLeave.isWfh && (
                    <span className="text-xs text-blue-600 ml-1">(WFH)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Applied On</p>
                <p className="text-gray-800">{detailLeave.appliedDate}</p>
              </div>
              {detailLeave.actionedAt && (
                <div>
                  <p className="text-xs text-gray-500">Actioned On</p>
                  <p className="text-gray-800">{detailLeave.actionedAt}</p>
                </div>
              )}
              {detailLeave.approvedByName && (
                <div>
                  <p className="text-xs text-gray-500">Approved By</p>
                  <p className="text-gray-800">{detailLeave.approvedByName}</p>
                </div>
              )}
              {detailLeave.rejectedByName && (
                <div>
                  <p className="text-xs text-gray-500">Rejected By</p>
                  <p className="text-gray-800">{detailLeave.rejectedByName}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Reason</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                {detailLeave.reason || "—"}
              </p>
            </div>

            {detailLeave.attachments?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {detailLeave.attachments.map((att, i) => {
                    const url =
                      typeof att === "string" ? att : att?.url || att?.file_url;
                    const name =
                      typeof att === "string"
                        ? att.split("/").pop()
                        : att?.name || att?.file_name || `Attachment ${i + 1}`;
                    if (!url) return null;
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {name}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {detailLeave.approvalComment && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Approval Comment</p>
                <p className="text-sm text-gray-800 bg-amber-50 border border-amber-100 rounded-lg p-3 whitespace-pre-wrap">
                  {detailLeave.approvalComment}
                </p>
              </div>
            )}

            {detailLeave.status === "Pending" && (
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">
                  Comment (optional)
                </label>
                <textarea
                  value={detailComment}
                  onChange={(e) => setDetailComment(e.target.value)}
                  placeholder="Add a comment for your decision…"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setDetailLeave(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>

              {detailLeave.status === "Pending" && (
                <>
                  {detailLeave.employeeId === currentMemberId && (
                    <button
                      onClick={() => handleCancel(detailLeave, detailComment)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1.5"
                    >
                      <Ban className="w-4 h-4" /> Cancel
                    </button>
                  )}
                  {detailLeave.employeeId !== currentMemberId && (
                    <>
                      <button
                        onClick={() => handleReject(detailLeave, detailComment)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1.5"
                      >
                        <ThumbsDown className="w-4 h-4" /> Reject
                      </button>
                      <button
                        onClick={() =>
                          handleApprove(detailLeave, detailComment)
                        }
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                      >
                        <ThumbsUp className="w-4 h-4" /> Approve
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
