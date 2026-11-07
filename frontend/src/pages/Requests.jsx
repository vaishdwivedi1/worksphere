// src/pages/Requests.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Loader2,
  MessageSquare,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Filter,
  Edit3,
  Eye,
  Send,
  Calendar,
  User,
} from "lucide-react";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import { getStoredSession } from "../services/auth";

// Helper to replace :id style paths and append ?orgId=...
const buildPath = (path, params = {}, orgId) => {
  const filled = path.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
  if (!orgId) return filled;
  const sep = filled.includes("?") ? "&" : "?";
  return `${filled}${sep}orgId=${encodeURIComponent(orgId)}`;
};

const CATEGORIES = [
  "Leave",
  "Payroll",
  "Documents",
  "Equipment",
  "Policy",
  "IT Support",
  "General",
];
const STATUSES = [
  "Open",
  "Pending",
  "In Review",
  "Resolved",
  "Rejected",
  "Closed",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const statusStyles = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "In Review": "bg-purple-50 text-purple-700 border-purple-200",
  Resolved: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const priorityStyles = {
  Low: "text-gray-500",
  Medium: "text-blue-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const stored = getStoredSession();
  const orgId = stored?.organizationId;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General",
    priority: "Medium",
    assigned_to: "",
    status: "Open",
  });
  const [saving, setSaving] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("orgId", orgId);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (search.trim()) params.set("search", search.trim());

      const query = params.toString();
      const url = `${APIPATHS.getAllRequests}${query ? `?${query}` : ""}`;

      const response = await api.get(url);
      if (response.success) {
        setRequests(response.data || []);
      } else {
        setError(response.message || "Failed to load requests");
      }
    } catch (err) {
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, search, orgId]);

  useEffect(() => {
    const t = setTimeout(fetchRequests, 300);
    return () => clearTimeout(t);
  }, [fetchRequests]);

  const openCreateForm = () => {
    setEditingRequest(null);
    setFormData({
      title: "",
      description: "",
      category: "General",
      priority: "Medium",
      assigned_to: "",
      status: "Open",
    });
    setShowForm(true);
    setError("");
  };

  const openEditForm = (req) => {
    setEditingRequest(req);
    setFormData({
      title: req.title || "",
      description: req.description || "",
      category: req.category || "General",
      priority: req.priority || "Medium",
      assigned_to: req.assigned_to || "",
      status: req.status || "Open",
    });
    setShowForm(true);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!orgId) {
      setError("No active session. Please log in again.");
      return;
    }
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
      };

      const response = editingRequest
        ? await api.put(
            buildPath(APIPATHS.updateRequest, { id: editingRequest.id }, orgId),
            payload,
          )
        : await api.post(buildPath(APIPATHS.createRequest, {}, orgId), payload);

      if (response.success) {
        setShowForm(false);
        fetchRequests();
      } else {
        setError(response.message || "Failed to save request");
      }
    } catch (err) {
      setError(err.message || "Failed to save request");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this request?"))
      return;
    try {
      const response = await api.delete(
        buildPath(APIPATHS.deleteRequest, { id }, orgId),
      );
      if (response.success) {
        if (selectedRequest?.id === id) setSelectedRequest(null);
        fetchRequests();
      } else {
        setError(response.message || "Failed to delete");
      }
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  const handleClose = async (id) => {
    try {
      const response = await api.patch(
        buildPath(APIPATHS.closeRequest, { id }, orgId),
        {},
      );
      if (response.success) {
        fetchRequests();
        if (selectedRequest?.id === id) {
          setSelectedRequest((p) => ({ ...p, status: "Closed" }));
        }
      } else {
        setError(response.message || "Failed to close");
      }
    } catch (err) {
      setError(err.message || "Failed to close");
    }
  };

  const openDetails = async (req) => {
    setSelectedRequest(req);
    setNewComment("");
    try {
      const response = await api.get(
        buildPath(APIPATHS.getRequestById, { id: req.id }, orgId),
      );
      if (response.success) setSelectedRequest(response.data);
    } catch (err) {
      setError(err.message || "Failed to load details");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedRequest) return;
    setPostingComment(true);
    try {
      const response = await api.post(
        buildPath(
          APIPATHS.addRequestComment,
          { id: selectedRequest.id },
          orgId,
        ),
        { comment: newComment.trim() },
      );
      if (response.success) {
        setNewComment("");
        const updated = await api.get(
          buildPath(APIPATHS.getRequestById, { id: selectedRequest.id }, orgId),
        );
        if (updated.success) setSelectedRequest(updated.data);
      } else {
        setError(response.message || "Failed to add comment");
      }
    } catch (err) {
      setError(err.message || "Failed to add comment");
    } finally {
      setPostingComment(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full overflow-scroll h-[80dvh]">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage organizational requests across categories
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-black"
          >
            <option value="all">All Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-black"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No requests found</p>
          <button
            onClick={openCreateForm}
            className="mt-4 text-sm font-medium text-black hover:underline"
          >
            Create your first request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-black truncate">
                      {req.title}
                    </h3>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        statusStyles[req.status] || statusStyles.Open
                      }`}
                    >
                      {req.status}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        priorityStyles[req.priority] || ""
                      }`}
                    >
                      • {req.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {req.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {req.created_by_name || "Unknown"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(req.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      {req.category}
                    </span>
                    {Number(req.comment_count) > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {req.comment_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openDetails(req)}
                    title="View"
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(req)}
                    title="Edit"
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {req.status !== "Closed" && (
                    <button
                      onClick={() => handleClose(req.id)}
                      title="Close"
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(req.id)}
                    title="Delete"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-black">
                {editingRequest ? "Edit Request" : "New Request"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief summary of the request"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Provide details about the request..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingRequest && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingRequest ? "Update Request" : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRequest && !showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="min-w-0 pr-4">
                <h2 className="text-lg font-bold text-black truncate">
                  {selectedRequest.title}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Created {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    statusStyles[selectedRequest.status] || statusStyles.Open
                  }`}
                >
                  {selectedRequest.status}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {selectedRequest.category}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 ${
                    priorityStyles[selectedRequest.priority] || ""
                  }`}
                >
                  {selectedRequest.priority} priority
                </span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedRequest.description || "No description provided."}
                </p>
              </div>

              {selectedRequest.resolution && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1.5">
                    Resolution
                  </h4>
                  <p className="text-sm text-green-700 whitespace-pre-wrap bg-green-50 p-3 rounded-lg border border-green-100">
                    {selectedRequest.resolution}
                  </p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Comments (
                  {(selectedRequest.comments || []).length})
                </h4>

                <div className="space-y-3 mb-4">
                  {(selectedRequest.comments || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      No comments yet.
                    </p>
                  )}
                  {(selectedRequest.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="bg-gray-50 rounded-lg p-3 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-black text-xs">
                          {c.author_name || "Unknown User"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(c.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {c.comment}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                  <button
                    type="submit"
                    disabled={postingComment || !newComment.trim()}
                    className="px-3 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[44px]"
                  >
                    {postingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
