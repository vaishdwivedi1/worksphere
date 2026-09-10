import { useState } from "react";
const CreateTeamModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim() });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5 animate-[fadeIn_0.15s]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold">Create Custom Team</h2>
          <button
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            onClick={onClose}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2">
              Team Name *
            </label>
            <input
              type="text"
              placeholder="e.g., AI Research, Mobile Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2">
              Description
            </label>
            <textarea
              placeholder="What does this team do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;

export const EditTeamModal = ({ team, onClose, onUpdate }) => {
  const [name, setName] = useState(team.name || "");
  const [description, setDescription] = useState(team.description || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Agar kuch change hi nahi hua toh skip
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (trimmedName === team.name && trimmedDesc === (team.description || "")) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onUpdate({ name: trimmedName, description: trimmedDesc });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold">Edit Team</h2>
          <button
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            onClick={onClose}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2">
              Team Name *
            </label>
            <input
              type="text"
              placeholder="e.g., AI Research, Mobile Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2">
              Description
            </label>
            <textarea
              placeholder="What does this team do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
