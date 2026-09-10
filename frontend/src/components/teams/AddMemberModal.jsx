import { useState, useMemo, useRef, useEffect } from "react";

const AddMemberModal = ({
  team,
  members,
  existingMemberIds = [],
  onClose,
  onAdd,
}) => {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dropdownRef = useRef(null);

  // ============================================
  // NORMALIZE: har member mein `id` field add karo
  // ============================================
  const normalizedMembers = useMemo(
    () =>
      members.map((m) => ({
        ...m,
        id: m.member_id, // ← yahi key fix hai
        name: m.name || "Unnamed",
        email: m.member_email || m.user_email || "",
      })),
    [members],
  );

  // Jo already team mein hain, unhe hata do
  const availableMembers = useMemo(
    () => normalizedMembers.filter((m) => !existingMemberIds.includes(m.id)),
    [normalizedMembers, existingMemberIds],
  );

  // Search filter
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return availableMembers;
    const q = search.toLowerCase();
    return availableMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q),
    );
  }, [availableMembers, search]);

  const allSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedMembers.includes(m.id));

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      const filteredIds = new Set(filteredMembers.map((m) => m.id));
      setSelectedMembers((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      setSelectedMembers((prev) => {
        const existing = new Set(prev);
        filteredMembers.forEach((m) => existing.add(m.id));
        return Array.from(existing);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedMembers.length === 0) return;

    setSubmitting(true);
    try {
      await onAdd(selectedMembers);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const triggerLabel = useMemo(() => {
    if (selectedMembers.length === 0) return "-- Choose members --";
    if (
      selectedMembers.length === availableMembers.length &&
      availableMembers.length > 0
    ) {
      return `All members (${selectedMembers.length}) selected`;
    }
    if (selectedMembers.length === 1) {
      const m = availableMembers.find((x) => x.id === selectedMembers[0]);
      return m ? m.name : "1 member selected";
    }
    return `${selectedMembers.length} members selected`;
  }, [selectedMembers, availableMembers]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] min-h-[50vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold">Add Members to {team.name}</h2>
          <button
            type="button"
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-6 pb-4">
            <label className="block text-sm font-semibold mb-2">
              Select Members *
            </label>

            {/* ============ CUSTOM DROPDOWN ============ */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                disabled={availableMembers.length === 0}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white disabled:bg-gray-50 disabled:cursor-not-allowed text-left"
              >
                <span
                  className={
                    selectedMembers.length === 0
                      ? "text-gray-400"
                      : "text-gray-900 font-medium"
                  }
                >
                  {triggerLabel}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`flex-shrink-0 text-gray-400 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[320px] flex flex-col overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* Select all */}
                  {filteredMembers.length > 0 && (
                    <label className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 select-none">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-[12px] font-semibold text-gray-700">
                        {allSelected ? "Unselect all" : "Select all"}
                        {search && ` (filtered: ${filteredMembers.length})`}
                      </span>
                    </label>
                  )}

                  {/* Member list */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <p className="text-center text-gray-400 text-[12px] py-6 px-3">
                        {availableMembers.length === 0
                          ? "All org members are already part of this team."
                          : "No members match your search."}
                      </p>
                    ) : (
                      filteredMembers.map((m) => {
                        const checked = selectedMembers.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors select-none ${
                              checked ? "bg-blue-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMember(m.id)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer flex-shrink-0"
                            />
                            <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {m.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold truncate">
                                {m.name}
                              </div>
                              <div className="text-[11px] text-gray-500 truncate">
                                {m.email}
                              </div>
                            </div>
                            {m.role && (
                              <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-[2px] rounded capitalize font-semibold flex-shrink-0">
                                {m.role}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {availableMembers.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                All org members are already part of this team.
              </p>
            )}

            {selectedMembers.length > 0 && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                {selectedMembers.length === availableMembers.length &&
                availableMembers.length > 0
                  ? `All ${selectedMembers.length} members will be added`
                  : `${selectedMembers.length} member${
                      selectedMembers.length > 1 ? "s" : ""
                    } selected`}
              </p>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedMembers.length === 0 || submitting}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Adding..."
                : `Add ${selectedMembers.length || ""} Member${
                    selectedMembers.length > 1 ? "s" : ""
                  }`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
