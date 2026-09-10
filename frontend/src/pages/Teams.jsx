import React, { useState, useMemo, useEffect, useCallback } from "react";
import CreateTeamModal, {
  EditTeamModal,
} from "../components/teams/CreateTeamModal";
import AddMemberModal from "../components/teams/AddMemberModal";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";

const Teams = () => {
  const orgData = JSON.parse(localStorage.getItem("org"));
  const orgId = orgData.id;

  const [organizationPlan, setOrganizationPlan] = useState("FREE");

  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState(null);

  const canCreateCustomTeam =
    organizationPlan === "PRO" || organizationPlan === "PREMIUM";

  // ============================================
  // FETCH ALL TEAMS
  // ============================================
  const fetchTeams = useCallback(async () => {
    if (!orgId) {
      setError("Organization ID not found");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`${APIPATHS.getAllTeams}/${orgId}`);
      setTeams(response.data || []);
    } catch (err) {
      console.error("fetchTeams error:", err);
      setError(
        err?.response?.data?.message || err.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // ============================================
  // FETCH ORG MEMBERS (for AddMemberModal)
  // ============================================
  const fetchOrgMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      const response = await api.get(
        `${APIPATHS.getAllMember}/${orgId}?page=1&limit=100&status=active`,
      );
      if (response.success) {
        setMembers(response.data?.members || []);
      }
    } catch (err) {
      console.error("fetchOrgMembers error:", err);
    }
  }, [orgId]);

  // ============================================
  // FETCH SINGLE TEAM + ITS MEMBERS
  // ============================================
  const fetchTeamById = useCallback(
    async (teamId) => {
      if (!orgId || !teamId) return;
      setLoadingDetail(true);
      try {
        const response = await api.get(
          `${APIPATHS.getTeamById}/${orgId}/${teamId}`,
        );
        if (response.success) {
          setSelectedTeam(response.data);
        } else {
          setError(response.message || "Failed to fetch team");
        }
      } catch (err) {
        console.error("fetchTeamById error:", err);
        setError(
          err?.response?.data?.message || err.message || "Something went wrong",
        );
      } finally {
        setLoadingDetail(false);
      }
    },
    [orgId],
  );

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    fetchTeams();
    fetchOrgMembers();
  }, [fetchTeams, fetchOrgMembers]);

  // ============================================
  // FILTER (client-side)
  // ============================================
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (activeTab === "predefined" && !team.is_predefined) return false;
      if (activeTab === "custom" && team.is_predefined) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          team.name.toLowerCase().includes(q) ||
          (team.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teams, activeTab, searchQuery]);

  // ============================================
  // CREATE TEAM
  // ============================================
  const handleCreateTeam = async ({ name, description, color }) => {
    if (!orgId) return;
    try {
      const response = await api.post(`${APIPATHS.createTeam}`, {
        name,
        description,
        orgId,
      });
      if (response.success) {
        setTeams((prev) => [response.data, ...prev]);
        setShowCreateModal(false);
        toast.success("Team created successfully");
      } else {
        toast.error(response.message || "Failed to create team");
      }
    } catch (err) {
      console.error("createTeam error:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to create team",
      );
    }
  };

  // ============================================
  // UPDATE TEAM
  // ============================================
  const handleUpdateTeam = async ({ name, description }) => {
    if (!orgId || !editingTeam) return;
    try {
      const response = await api.put(`${APIPATHS.updateTeam}`, {
        name,
        description,
        orgId,
        teamId: editingTeam.id,
      });
      if (response.success) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === editingTeam.id ? { ...t, ...response.data } : t,
          ),
        );
        if (selectedTeam?.id === editingTeam.id) {
          setSelectedTeam((prev) => ({ ...prev, ...response.data }));
        }
        setShowEditModal(false);
        setEditingTeam(null);
        toast.success("Team updated successfully");
      } else {
        toast.error(response.message || "Failed to update team");
      }
    } catch (err) {
      console.error("updateTeam error:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to update team",
      );
    }
  };

  // ============================================
  // DELETE TEAM
  // ============================================
  const handleDeleteTeam = async (teamId) => {
    if (!orgId) return;
    try {
      const response = await api.delete(
        `${APIPATHS.deleteTeam}/${orgId}/${teamId}`,
      );
      if (response.success) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        if (selectedTeam?.id === teamId) setSelectedTeam(null);
        toast.success("Team deleted successfully");
      } else {
        toast.error(response.message || "Failed to delete team");
      }
    } catch (err) {
      console.error("deleteTeam error:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to delete team",
      );
    }
  };

  // ============================================
  // ADD MEMBER TO TEAM
  // ============================================
  const handleAddMember = async (memberIds) => {
    if (!orgId || !selectedTeam) return;
    try {
      const response = await api.post(`${APIPATHS.addTeamMember}`, {
        memberIds,
        orgId,
        teamId: selectedTeam.id,
      });
      if (response.success) {
        setShowAddMemberModal(false);
        await fetchTeamById(selectedTeam.id);
        const added = response.data?.added_count ?? memberIds.length;
        setTeams((prev) =>
          prev.map((t) =>
            t.id === selectedTeam.id
              ? { ...t, member_count: t.member_count + added }
              : t,
          ),
        );
        toast.success(
          `${added} member${added > 1 ? "s" : ""} added successfully`,
        );
      } else {
        toast.error(response.message || "Failed to add members");
      }
    } catch (err) {
      console.error("addTeamMember error:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to add members",
      );
    }
  };

  // ============================================
  // REMOVE MEMBER FROM TEAM
  // ============================================
  const handleRemoveMember = async (memberId) => {
    if (!orgId || !selectedTeam) return;
    try {
      const response = await api.delete(
        `${APIPATHS.removeTeamMember}/${orgId}/${selectedTeam.id}/${memberId}`,
      );
      if (response.success) {
        await fetchTeamById(selectedTeam.id);
        setTeams((prev) =>
          prev.map((t) =>
            t.id === selectedTeam.id
              ? { ...t, member_count: Math.max(t.member_count - 1, 0) }
              : t,
          ),
        );
        toast.success("Member removed successfully");
      } else {
        toast.error(response.message || "Failed to remove member");
      }
    } catch (err) {
      console.error("removeTeamMember error:", err);
      toast.error(
        err?.response?.data?.message ||
          err.message ||
          "Failed to remove member",
      );
    }
  };

  // ============================================
  // OPEN TEAM DETAIL
  // ============================================
  const handleTeamClick = (team) => {
    fetchTeamById(team.id);
  };

  // ============================================
  // CREATE BUTTON
  // ============================================
  const handleCreateTeamClick = () => {
    // if (!canCreateCustomTeam) {
    //   setShowUpgradeModal(true);
    //   return;
    // }
    setShowCreateModal(true);
  };

  const handleEditTeamClick = (team) => {
    setEditingTeam(team);
    setShowEditModal(true);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex flex-col flex-1 h-screen max-h-[calc(100dvh-57px)]">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-start gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3.5 py-2 min-w-[260px] text-gray-400">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none outline-none text-sm w-full bg-transparent text-gray-900 placeholder:text-gray-400"
          />
        </div>

        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          onClick={handleCreateTeamClick}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Custom Team
          {!canCreateCustomTeam && (
            <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px] ml-1">
              🔒 PRO
            </span>
          )}
        </button>
      </div>

      {/* ================= STATES ================= */}
      {loading && (
        <div className="text-center py-16 text-gray-500 text-sm">
          Loading teams...
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16 text-red-500 text-sm">{error}</div>
      )}

      {!loading && !error && filteredTeams.length === 0 && (
        <EmptyState onCreateClick={handleCreateTeamClick} />
      )}

      {/* ================= TEAMS GRID ================= */}
      {!loading && !error && filteredTeams.length > 0 && (
        <div className="flex flex-wrap flex-1 gap-4 overflow-y-auto mb-[40px]">
          {filteredTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onClick={() => handleTeamClick(team)}
              onDelete={() => {
                setConfirmState({
                  title: "Delete team?",
                  message: `Are you sure you want to delete "${team.name}"? This action cannot be undone.`,
                  confirmText: "Delete",
                  variant: "danger",
                  onConfirm: async () => {
                    setConfirmState((s) => ({ ...s, loading: true }));
                    await handleDeleteTeam(team.id);
                    setConfirmState(null);
                  },
                });
              }}
              onEdit={() => handleEditTeamClick(team)}
            />
          ))}
        </div>
      )}

      {/* ================= MODALS ================= */}
      {selectedTeam && (
        <TeamDetailDrawer
          team={selectedTeam}
          loading={loadingDetail}
          onClose={() => setSelectedTeam(null)}
          onAddMemberClick={() => setShowAddMemberModal(true)}
          onRemoveMember={(memberId, memberName) => {
            setConfirmState({
              title: "Remove member?",
              message: `Remove ${memberName || "this member"} from "${selectedTeam.name}"?`,
              confirmText: "Remove",
              variant: "danger",
              onConfirm: async () => {
                setConfirmState((s) => ({ ...s, loading: true }));
                await handleRemoveMember(memberId);
                setConfirmState(null);
              },
            });
          }}
          onEditClick={() => handleEditTeamClick(selectedTeam)}
        />
      )}

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTeam}
        />
      )}

      {showAddMemberModal && selectedTeam && (
        <AddMemberModal
          team={selectedTeam}
          members={members}
          existingMemberIds={selectedTeam.members?.map((m) => m.id) || []}
          onClose={() => setShowAddMemberModal(false)}
          onAdd={(memberId) => handleAddMember(memberId)}
        />
      )}

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}

      {showEditModal && editingTeam && (
        <EditTeamModal
          team={editingTeam}
          onClose={() => {
            setShowEditModal(false);
            setEditingTeam(null);
          }}
          onUpdate={handleUpdateTeam}
        />
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          variant={confirmState.variant}
          loading={confirmState.loading}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};

// ============================================
// TEAM CARD
// ============================================
const TeamCard = ({ team, onClick, onEdit, onDelete }) => {
  const color = getTeamColor(team);
  return (
    <div
      className="bg-white min-w-[18rem] max-w-[25rem] border border-gray-200 rounded-xl p-[18px] cursor-pointer transition-all flex flex-col gap-3 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center font-bold text-lg"
          style={{ background: `${color}20`, color }}
        >
          {team.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5">
          {team.is_predefined ? (
            <span className="text-[10px] font-bold px-2 py-[3px] rounded-md uppercase tracking-wide bg-blue-100 text-blue-800">
              Predefined
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-[3px] rounded-md uppercase tracking-wide bg-purple-100 text-purple-800">
              Custom
            </span>
          )}
          {!team.is_predefined && (
            <>
              <button
                className="p-1.5 rounded-md text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit team"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              <button
                className="p-1.5 rounded-md text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete team"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <h3 className="text-base font-bold">{team.name}</h3>
      <p className="text-[13px] text-gray-500 leading-snug flex-1">
        {team.description || "No description"}
      </p>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {team.member_count} members
        </div>
        <span className="text-[11px] text-gray-400 capitalize">
          {team.predefined_type || "custom"}
        </span>
      </div>
    </div>
  );
};

// ============================================
// COLOR MAPPER
// ============================================
const PREDEFINED_COLORS = {
  frontend: "#3B82F6",
  backend: "#10B981",
  devops: "#F59E0B",
  hr: "#EC4899",
  sales: "#8B5CF6",
  marketing: "#EF4444",
  designers: "#06B6D4",
  finance: "#84CC16",
  mobile: "#F97316",
  qa: "#14B8A6",
};

function getTeamColor(team) {
  if (team.is_predefined && PREDEFINED_COLORS[team.predefined_type]) {
    return PREDEFINED_COLORS[team.predefined_type];
  }
  const colors = [
    "#A855F7",
    "#F97316",
    "#EAB308",
    "#14B8A6",
    "#06B6D4",
    "#EF4444",
  ];
  let hash = 0;
  for (let i = 0; i < team.id.length; i++) {
    hash = team.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ============================================
// EMPTY STATE
// ============================================
const EmptyState = ({ onCreateClick }) => (
  <div className="text-center py-16 px-5 bg-white border border-dashed border-gray-200 rounded-xl">
    <div className="text-5xl mb-3">👥</div>
    <h3 className="text-lg font-semibold mb-2">No teams found</h3>
    <p className="text-gray-500 text-sm mb-5">
      Try adjusting your search or create a new custom team.
    </p>
    <button
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      onClick={onCreateClick}
    >
      Create Custom Team
    </button>
  </div>
);

// ============================================
// TEAM DETAIL DRAWER
// ============================================
const TeamDetailDrawer = ({
  team,
  loading,
  onClose,
  onAddMemberClick,
  onRemoveMember,
}) => {
  const color = getTeamColor(team);
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-white h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex gap-3.5 items-center">
            <div
              className="w-14 h-14 rounded-[10px] flex items-center justify-center font-bold text-[22px]"
              style={{ background: `${color}20`, color }}
            >
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold mb-1">{team.name}</h2>
              <p className="text-[13px] text-gray-500">
                {team.description || "No description"}
              </p>
            </div>
          </div>
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

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[15px] font-semibold">
              Team Members ({team.member_count})
            </h3>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors"
              onClick={onAddMemberClick}
            >
              + Add Member
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 text-[13px] py-6">
              Loading members...
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(team.members || []).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {m.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold">
                      {m.name || "Unnamed"}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {m.email}
                    </div>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-[3px] rounded-md capitalize font-semibold">
                    {m.role}
                  </span>
                  <button
                    className="p-1.5 rounded-md text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    onClick={() => onRemoveMember(m.id, m.name)}
                    title="Remove member"
                  >
                    <svg
                      width="14"
                      height="14"
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
              ))}
              {(!team.members || team.members.length === 0) && (
                <p className="text-center text-gray-400 text-[13px] py-6">
                  No members yet. Add your first member!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// UPGRADE MODAL
// ============================================
const UpgradeModal = ({ onClose }) => (
  <div
    className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl w-full max-w-[480px] p-6 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-5xl mb-3">🔒</div>
      <h2 className="text-xl font-bold mb-3">Upgrade to PRO</h2>
      <p className="text-gray-500 text-sm mb-4 leading-relaxed">
        Custom teams sirf <strong className="text-gray-900">PRO</strong> aur{" "}
        <strong className="text-gray-900">PREMIUM</strong> plans mein available
        hain. Aapke current plan mein sirf predefined teams use kar sakte hain.
      </p>
      <ul className="text-left text-sm mb-6 inline-block space-y-2">
        <li>✅ Unlimited custom teams</li>
        <li>✅ Advanced team analytics</li>
        <li>✅ Team-level permissions</li>
        <li>✅ Priority support</li>
      </ul>
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
        <button
          className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
          onClick={onClose}
        >
          Maybe Later
        </button>
        <button
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          onClick={onClose}
        >
          Upgrade Now →
        </button>
      </div>
    </div>
  </div>
);

export default Teams;
