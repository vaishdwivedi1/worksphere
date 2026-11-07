import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Loader2,
  CheckSquare,
  Trash2,
  Edit3,
  AlertCircle,
  Calendar,
  Flag,
  FileText,
  Paperclip,
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

const STATUSES = ["Pending", "In Progress", "Completed", "Draft"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const statusStyles = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
};

const priorityStyles = {
  Low: "text-gray-500",
  Medium: "text-blue-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

const Todos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  const stored = getStoredSession();
  const orgId = stored?.organizationId;

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    due_date: "",
    status: "Pending",
    notes: "",
    attachments: [], // Array of strings/URLs
  });
  const [saving, setSaving] = useState(false);

  const fetchTodos = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const url = `${APIPATHS.getAllTodos}?orgId=${orgId}`;
      const response = await api.get(url);
      if (response.success) {
        setTodos(response.data || []);
      } else {
        setError(response.message || "Failed to load todos");
      }
    } catch (err) {
      setError(err.message || "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const openCreateForm = () => {
    setEditingTodo(null);
    setFormData({
      title: "",
      description: "",
      priority: "Medium",
      due_date: "",
      status: "Pending",
      notes: "",
      attachments: [],
    });
    setShowForm(true);
    setError("");
  };

  const openEditForm = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title || "",
      description: todo.description || "",
      priority: todo.priority || "Medium",
      due_date: todo.due_date
        ? new Date(todo.due_date).toISOString().split("T")[0]
        : "",
      status: todo.status || "Pending",
      notes: todo.notes || "",
      attachments: todo.attachments || [],
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
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...formData };
      if (!payload.due_date) payload.due_date = null;

      const response = editingTodo
        ? await api.put(
            buildPath(APIPATHS.updateTodo, { id: editingTodo.id }, orgId),
            payload,
          )
        : await api.post(buildPath(APIPATHS.createTodo, {}, orgId), payload);

      if (response.success) {
        setShowForm(false);
        fetchTodos();
      } else {
        setError(response.message || "Failed to save todo");
      }
    } catch (err) {
      setError(err.message || "Failed to save todo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this todo?")) return;
    try {
      const response = await api.delete(
        buildPath(APIPATHS.deleteTodo, { id }, orgId),
      );
      if (response.success) fetchTodos();
      else setError(response.message || "Failed to delete");
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  // Quick action from the list view
  const toggleStatus = async (todo) => {
    const nextStatus = todo.status === "Completed" ? "Pending" : "Completed";
    try {
      const response = await api.put(
        buildPath(APIPATHS.updateTodo, { id: todo.id }, orgId),
        { status: nextStatus },
      );
      if (response.success) fetchTodos();
    } catch (err) {
      setError(err.message || "Failed to update status");
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

  // Filtering
  const displayedTodos = todos.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description &&
        t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full overflow-scroll h-[80dvh] p-2">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <CheckSquare className="w-6 h-6" /> My Todos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your tasks and action items
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all"
        >
          <Plus className="w-4 h-4" /> New Todo
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
            placeholder="Search todos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-black"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : displayedTodos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No todos found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTodos.map((todo) => (
            <div
              key={todo.id}
              className={`bg-white border rounded-xl p-4 transition-colors ${todo.status === "Completed" ? "border-green-200 bg-green-50/30" : "border-gray-200 hover:border-gray-300"}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left Side: Checkbox and Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleStatus(todo)}
                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${todo.status === "Completed" ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-black"}`}
                  >
                    {todo.status === "Completed" && (
                      <CheckSquare className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3
                        className={`font-semibold truncate ${todo.status === "Completed" ? "text-gray-500 line-through" : "text-black"}`}
                      >
                        {todo.title}
                      </h3>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusStyles[todo.status] || statusStyles.Pending}`}
                      >
                        {todo.status}
                      </span>
                    </div>

                    {todo.description && (
                      <p
                        className={`text-sm line-clamp-2 ${todo.status === "Completed" ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {todo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${priorityStyles[todo.priority]}`}
                      >
                        <Flag className="w-3 h-3" /> {todo.priority}
                      </span>
                      {todo.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due:{" "}
                          {formatDate(todo.due_date)}
                        </span>
                      )}
                      {todo.notes && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Has Notes
                        </span>
                      )}
                      {todo.attachments && todo.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />{" "}
                          {todo.attachments.length} Files
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditForm(todo)}
                    title="Edit"
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
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
                {editingTodo ? "Edit Todo" : "New Todo"}
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
                  placeholder="Task summary"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
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
                  rows={3}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Additional context, links, etc..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>

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
                  {editingTodo ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Todos;
