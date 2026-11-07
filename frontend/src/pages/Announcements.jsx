import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Loader2,
  Megaphone,
  Trash2,
  Archive,
  Edit3,
  AlertCircle,
  Filter,
  Calendar,
  User,
  Users,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import { getStoredSession } from "../services/auth";

const buildPath = (path, params = {}, orgId) => {
  const filled = path.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
  if (!orgId) return filled;
  const sep = filled.includes("?") ? "&" : "?";
  return `${filled}${sep}orgId=${encodeURIComponent(orgId)}`;
};

const TYPES = [
  "General",
  "HR",
  "Holiday",
  "Policy Update",
  "Event",
  "Emergency",
];
const RECIPIENTS = [
  "Entire Organization",
  "Department",
  "Team",
  "Individual Employees",
];

const typeStyles = {
  General: "bg-gray-100 text-gray-700 border-gray-200",
  HR: "bg-purple-50 text-purple-700 border-purple-200",
  Holiday: "bg-green-50 text-green-700 border-green-200",
  "Policy Update": "bg-blue-50 text-blue-700 border-blue-200",
  Event: "bg-orange-50 text-orange-700 border-orange-200",
  Emergency: "bg-red-50 text-red-700 border-red-200",
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active"); // 'Active' or 'Archived'

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const stored = getStoredSession();
  const orgId = stored?.organizationId;

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "General",
    recipient_type: "Entire Organization",
    target_department: "",
    target_team_id: "",
    target_member_ids: [], // In a real app, this would be a multi-select of members
  });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("orgId", orgId);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search.trim()) params.set("search", search.trim());

      const query = params.toString();
      const url = `${APIPATHS.getAllAnnouncements}?${query}`;

      const response = await api.get(url);
      if (response.success) {
        setAnnouncements(response.data || []);
      } else {
        setError(response.message || "Failed to load announcements");
      }
    } catch (err) {
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search, orgId]);

  useEffect(() => {
    const t = setTimeout(fetchAnnouncements, 300);
    return () => clearTimeout(t);
  }, [fetchAnnouncements]);

  const openCreateForm = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: "",
      description: "",
      type: "General",
      recipient_type: "Entire Organization",
      target_department: "",
      target_team_id: "",
      target_member_ids: [],
    });
    setShowForm(true);
    setError("");
  };

  const openEditForm = (item) => {
    setEditingAnnouncement(item);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      type: item.type || "General",
      recipient_type: item.recipient_type || "Entire Organization",
      target_department: item.target_department || "",
      target_team_id: item.target_team_id || "",
      target_member_ids: item.target_member_ids || [],
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
    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and Description are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...formData };

      // Clean up unused target fields based on recipient type
      if (payload.recipient_type !== "Department")
        payload.target_department = null;
      if (payload.recipient_type !== "Team") payload.target_team_id = null;
      if (payload.recipient_type !== "Individual Employees")
        payload.target_member_ids = [];

      const response = editingAnnouncement
        ? await api.put(
            buildPath(
              APIPATHS.updateAnnouncement,
              { id: editingAnnouncement.id },
              orgId,
            ),
            payload,
          )
        : await api.post(
            buildPath(APIPATHS.createAnnouncement, {}, orgId),
            payload,
          );

      if (response.success) {
        setShowForm(false);
        fetchAnnouncements();
      } else {
        setError(response.message || "Failed to save");
      }
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this announcement?",
      )
    )
      return;
    try {
      const response = await api.delete(
        buildPath(APIPATHS.deleteAnnouncement, { id }, orgId),
      );
      if (response.success) fetchAnnouncements();
      else setError(response.message || "Failed to delete");
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  const handleArchive = async (id) => {
    if (
      !window.confirm(
        "Archive this announcement? It will be hidden from active lists.",
      )
    )
      return;
    try {
      const response = await api.patch(
        buildPath(APIPATHS.archiveAnnouncement, { id }, orgId),
        {},
      );
      if (response.success) fetchAnnouncements();
      else setError(response.message || "Failed to archive");
    } catch (err) {
      setError(err.message || "Failed to archive");
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="w-full overflow-scroll h-[80dvh] p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <Megaphone className="w-6 h-6" /> Announcements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Broadcast messages to your organization
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-black"
          >
            <option value="Active">Active Only</option>
            <option value="Archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No announcements found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-black truncate">
                      {item.title}
                    </h3>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${typeStyles[item.type] || typeStyles.General}`}
                    >
                      {item.type}
                    </span>
                    {item.status === "Archived" && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-gray-100 text-gray-500">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" /> By{" "}
                      {item.created_by_name || "Unknown"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {formatDate(item.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3" /> {item.recipient_type}
                      {item.target_department
                        ? ` (${item.target_department})`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditForm(item)}
                    title="Edit"
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {item.status !== "Archived" && (
                    <button
                      onClick={() => handleArchive(item.id)}
                      title="Archive"
                      className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-black">
                {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
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
                  placeholder="Announcement Title"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Details here..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Recipients
                  </label>
                  <select
                    name="recipient_type"
                    value={formData.recipient_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    {RECIPIENTS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Recipient Fields */}
              {formData.recipient_type === "Department" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Department Name
                  </label>
                  <input
                    type="text"
                    name="target_department"
                    value={formData.target_department}
                    onChange={handleChange}
                    placeholder="e.g. Engineering"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  />
                </div>
              )}
              {formData.recipient_type === "Team" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Team ID / Name
                  </label>
                  <input
                    type="text"
                    name="target_team_id"
                    value={formData.target_team_id}
                    onChange={handleChange}
                    placeholder="e.g. Frontend Team UUID"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  />
                </div>
              )}
              {formData.recipient_type === "Individual Employees" && (
                <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm">
                  <ShieldAlert className="w-4 h-4 inline mr-1" />
                  In a full production app, this would be a multi-select
                  dropdown of member IDs. For now, this will broadcast to
                  specific IDs if provided in the API.
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
                  {editingAnnouncement ? "Update" : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
