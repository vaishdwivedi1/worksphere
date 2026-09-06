import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Copy,
  Edit,
  Link,
  Loader2,
  Mail,
  Phone,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMemberData, setNewMemberData] = useState(null);
  const [invitationLink, setInvitationLink] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [inviteModalData, setInviteModalData] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef(null);
  const lastMemberRef = useRef(null);

  // Form States
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "developer",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    role: "developer",
  });

  // Phone state with country validation
  const [phone, setPhone] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // ============================================
  // DEBOUNCE SEARCH TERM
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ============================================
  // GET ORGANIZATION ID ON COMPONENT MOUNT
  // ============================================
  useEffect(() => {
    try {
      const orgData = JSON.parse(localStorage.getItem("org"));
      if (orgData?.id) {
        setOrgId(orgData.id);
      } else {
        setError("Organization not found. Please login again.");
      }
    } catch (err) {
      setError("Failed to get organization data");
    }
  }, []);

  // ============================================
  // FETCH MEMBERS WITH PAGINATION
  // ============================================
  const fetchMembers = async (pageNum = 1, append = false) => {
    if (!orgId) {
      setError("Organization ID not found");
      return;
    }

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const params = new URLSearchParams();

      params.append("page", pageNum.toString());
      params.append("limit", "20");

      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
        params.append("searchText", debouncedSearchTerm.trim());
      }

      if (filterRole && filterRole !== "all") {
        params.append("role", filterRole);
      }

      if (filterStatus && filterStatus !== "all") {
        params.append("status", filterStatus);
      }

      const url = `${APIPATHS.getAllMember}/${orgId}?${params.toString()}`;

      console.log("Fetching members with URL:", url);

      const response = await api.get(url);

      console.log("Response from backend:", response);

      if (response.success) {
        const newMembers = response.data.members || [];
        const pagination = response.pagination || {};

        setTotalCount(pagination.total || newMembers.length);

        if (append) {
          setMembers((prev) => [...prev, ...newMembers]);
        } else {
          setMembers(newMembers);
        }

        const hasMoreData = pagination.hasNextPage || false;
        setHasMore(hasMoreData);
        setPage(pageNum);
      } else {
        setError(response.message || "Failed to fetch members");
      }
    } catch (err) {
      console.error("Error fetching members:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ============================================
  // INITIAL FETCH ON FILTER CHANGE
  // ============================================
  useEffect(() => {
    if (orgId) {
      setPage(1);
      setMembers([]);
      setHasMore(true);
      fetchMembers(1, false);
    }
  }, [debouncedSearchTerm, filterRole, filterStatus, orgId]);

  // ============================================
  // INFINITE SCROLL SETUP
  // ============================================
  useEffect(() => {
    if (loading || loadingMore || !hasMore || !orgId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchMembers(page + 1, true);
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    if (lastMemberRef.current) {
      observer.observe(lastMemberRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      observer.disconnect();
    };
  }, [members, hasMore, loadingMore, loading, page, orgId]);

  // ============================================
  // ADD MEMBER
  // ============================================
  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate phone if provided
    if (phone && phone.length < 10) {
      setError("Please enter a valid phone number");
      setLoading(false);
      return;
    }

    try {
      // Get sender ID from localStorage
      const userData = JSON.parse(localStorage.getItem("user"));
      const senderId = userData?.id;

      const payload = {
        memberEmail: formData.email,
        memberName: formData.name,
        memberPhone: phone || "",
        memberRole: formData.role,
        orgId: orgId,
        senderId: senderId || null,
      };

      const response = await api.post(APIPATHS.addMember, payload);

      if (response.success) {
        setSuccess("Member added successfully!");
        setShowAddModal(false);

        // Store new member data for invitation
        setNewMemberData({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          memberId: response.data?.member?.id || response.data?.id,
        });

        // Show success modal with invitation option
        setShowAddSuccessModal(true);

        // Reset form
        setFormData({
          email: "",
          name: "",
          phone: "",
          role: "developer",
        });
        setPhone("");
        setPage(1);
        setMembers([]);
        setHasMore(true);
        fetchMembers(1, false);
      } else {
        setError(response.message || "Failed to add member");
      }
    } catch (err) {
      console.error("Error adding member:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GENERATE INVITATION FOR NEW MEMBER
  // ============================================
  const handleGenerateInviteForNewMember = async () => {
    setLoading(true);
    setError("");
    setInvitationLink("");
    setCopySuccess(false);

    try {
      const payload = {
        orgId: orgId,
        memberEmail: newMemberData?.email,
        memberPhone: newMemberData?.phone || "",
        memberRole: newMemberData?.role || "developer",
        memberName: newMemberData?.name,
        senderId: JSON.parse(localStorage.getItem("user"))?.id || null,
      };

      const response = await api.post(
        APIPATHS.generateMemberInvitationLink,
        payload,
      );

      if (response.success) {
        setInvitationLink(response.data.link || response.data.data?.link);
        setInviteModalData({
          email: newMemberData?.email,
          name: newMemberData?.name,
          isUserActive: response.data.data?.isUserActive || false,
          needsRegistration: response.data.data?.needsRegistration || false,
        });
        setShowAddSuccessModal(false);
        setShowInviteModal(true);
      } else {
        setError(response.message || "Failed to generate invitation link");
      }
    } catch (err) {
      console.error("Error generating invite:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GENERATE INVITATION FOR EXISTING MEMBER
  // ============================================
  const handleGenerateInvite = async (member = null) => {
    setLoading(true);
    setError("");
    setInvitationLink("");
    setCopySuccess(false);

    try {
      const targetMember = member || selectedMember;

      const payload = {
        orgId: orgId,
        memberEmail: targetMember?.member_email || targetMember?.email,
        memberPhone: targetMember?.phone || "",
        memberRole: targetMember?.role || "developer",
        memberName: targetMember?.name,
        senderId: JSON.parse(localStorage.getItem("user"))?.id || null,
      };

      const response = await api.post(
        APIPATHS.generateMemberInvitationLink,
        payload,
      );

      if (response.success) {
        setInvitationLink(response.data.link || response.data.data?.link);
        setInviteModalData({
          email: targetMember?.member_email || targetMember?.email,
          name: targetMember?.name,
          isUserActive: response.data.data?.isUserActive || false,
          needsRegistration: response.data.data?.needsRegistration || false,
          status: targetMember?.member_status || targetMember?.status,
        });
        setShowInviteModal(true);
      } else {
        setError(response.message || "Failed to generate invitation link");
      }
    } catch (err) {
      console.error("Error generating invite:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // COPY TO CLIPBOARD
  // ============================================
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      setError("Failed to copy link");
    }
  };

  // ============================================
  // UPDATE MEMBER
  // ============================================
  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate edit phone if provided
    if (editPhone && editPhone.length < 10) {
      setError("Please enter a valid phone number");
      setLoading(false);
      return;
    }

    try {
      const memberId = selectedMember?.member_id || selectedMember?.id;
      const response = await api.put(`${APIPATHS.updateMember}/${memberId}`, {
        name: editFormData.name,
        phone: editPhone || "",
        role: editFormData.role,
      });

      if (response.success) {
        setSuccess("Member updated successfully!");
        setShowEditModal(false);
        setSelectedMember(null);
        setEditPhone("");
        setPage(1);
        setMembers([]);
        setHasMore(true);
        fetchMembers(1, false);
      } else {
        setError(response.message || "Failed to update member");
      }
    } catch (err) {
      console.error("Error updating member:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DELETE MEMBER
  // ============================================
  const handleDeleteMember = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const memberId = selectedMember?.member_id || selectedMember?.id;
      const response = await api.delete(`${APIPATHS.deleteMember}/${memberId}`);

      if (response.success) {
        setSuccess("Member deleted successfully!");
        setShowDeleteModal(false);
        setSelectedMember(null);
        setPage(1);
        setMembers([]);
        setHasMore(true);
        fetchMembers(1, false);
      } else {
        setError(response.message || "Failed to delete member");
      }
    } catch (err) {
      console.error("Error deleting member:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CHANGE MEMBER STATUS
  // ============================================
  const handleChangeStatus = async (memberId, currentStatus) => {
    let newStatus;
    if (currentStatus === "active") {
      newStatus = "inactive";
    } else if (currentStatus === "inactive") {
      newStatus = "active";
    } else if (currentStatus === "pending") {
      newStatus = "active";
    } else {
      newStatus = "active";
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(APIPATHS.changeStatusOfMember, {
        memberId,
        status: newStatus,
      });

      if (response.success) {
        setSuccess(
          `Member ${newStatus === "active" ? "activated" : "deactivated"} successfully!`,
        );
        setPage(1);
        setMembers([]);
        setHasMore(true);
        fetchMembers(1, false);
      } else {
        setError(response.message || "Failed to change status");
      }
    } catch (err) {
      console.error("Error changing status:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // OPEN EDIT MODAL
  // ============================================
  const openEditModal = (member) => {
    setSelectedMember(member);
    setEditFormData({
      name: member.name || "",
      phone: member.phone || "",
      role: member.role || "developer",
    });
    setEditPhone(member.phone || "");
    setShowEditModal(true);
  };

  // ============================================
  // OPEN DELETE MODAL
  // ============================================
  const openDeleteModal = (member) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  // ============================================
  // OPEN INVITE MODAL FOR EXISTING MEMBER
  // ============================================
  const openInviteModal = (member) => {
    setSelectedMember(member);
    handleGenerateInvite(member);
  };

  // ============================================
  // GET ROLE BADGE
  // ============================================
  const getRoleBadge = (role) => {
    const badges = {
      owner: "bg-purple-100 text-purple-700 border-purple-200",
      admin: "bg-blue-100 text-blue-700 border-blue-200",
      hr: "bg-emerald-100 text-emerald-700 border-emerald-200",
      manager: "bg-orange-100 text-orange-700 border-orange-200",
      developer: "bg-indigo-100 text-indigo-700 border-indigo-200",
      sales: "bg-cyan-100 text-cyan-700 border-cyan-200",
      marketing: "bg-pink-100 text-pink-700 border-pink-200",
      member: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return badges[role] || badges.member;
  };

  // ============================================
  // GET STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    const badges = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-red-100 text-red-700 border-red-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      suspended: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return badges[status] || badges.pending;
  };

  // ============================================
  // FORMAT DATE
  // ============================================
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all min-w-[140px]"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="developer">Developer</option>
              <option value="sales">Sales</option>
              <option value="marketing">Marketing</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleGenerateInvite()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
            >
              <Link className="w-4 h-4" />
              Invite Member
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SUCCESS/ERROR MESSAGES */}
      {/* ============================================ */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ============================================ */}
      {/* MEMBERS TABLE */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && members.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">
              No members found
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm || filterRole !== "all" || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "Start by adding your first member"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member, index) => {
                  const isLastItem = index === members.length - 1;
                  const memberId = member.member_id || member.id;
                  const status = member.member_status || member.status;

                  return (
                    <tr
                      key={memberId || index}
                      ref={isLastItem ? lastMemberRef : null}
                      className="hover:bg-gray-50 transition-all"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-semibold text-sm">
                            {member.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-black text-sm">
                              {member.name || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.member_email || member.email}
                            </p>
                            {member.phone && (
                              <p className="text-xs text-gray-400">
                                {member.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadge(
                            member.role,
                          )}`}
                        >
                          {member.role?.charAt(0).toUpperCase() +
                            member.role?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                            status,
                          )}`}
                        >
                          {status?.charAt(0).toUpperCase() + status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(member.joined_at || member.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Invite Button - Show for inactive users or users who haven't joined */}
                          {(status === "inactive" || status === "pending") && (
                            <button
                              onClick={() => openInviteModal(member)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
                              title="Send Invitation Link"
                            >
                              <Link className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleChangeStatus(memberId, status)}
                            className={`p-1.5 rounded-lg transition-all ${
                              status === "active"
                                ? "text-green-600 hover:bg-green-50"
                                : status === "pending"
                                  ? "text-yellow-600 hover:bg-yellow-50"
                                  : "text-red-600 hover:bg-red-50"
                            }`}
                            title={
                              status === "active" ? "Deactivate" : "Activate"
                            }
                          >
                            {status === "active" ? (
                              <UserCheck className="w-4 h-4" />
                            ) : status === "pending" ? (
                              <UserPlus className="w-4 h-4" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openDeleteModal(member)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loadingMore && (
              <div className="flex items-center justify-center py-4 bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading more members...
                </span>
              </div>
            )}

            {!hasMore &&
              members.length > 0 &&
              members.length === totalCount && (
                <div className="text-center py-4 border-t border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-400">
                    No more members to load • {totalCount} members total
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* ADD MEMBER MODAL */}
      {/* ============================================ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Add Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone
                </label>
                <PhoneInput
                  international
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={setPhone}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role *
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all appearance-none"
                    required
                  >
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="owner">Owner</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ADD MEMBER SUCCESS MODAL */}
      {/* ============================================ */}
      {showAddSuccessModal && newMemberData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-black mb-2">
                Member Added Successfully!
              </h2>
              <p className="text-gray-500 text-sm mb-2">
                <span className="font-semibold text-black">
                  {newMemberData.name}
                </span>{" "}
                has been added as{" "}
                <span className="font-semibold text-black">
                  {newMemberData.role}
                </span>
              </p>
              <p className="text-gray-400 text-xs mb-6">
                Email: {newMemberData.email}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGenerateInviteForNewMember}
                  className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  Send Invitation Link
                </button>
                <button
                  onClick={() => {
                    setShowAddSuccessModal(false);
                    setNewMemberData(null);
                  }}
                  className="w-full bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* EDIT MEMBER MODAL */}
      {/* ============================================ */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Edit Member</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone
                </label>
                <PhoneInput
                  international
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                  value={editPhone}
                  onChange={setEditPhone}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 text-black text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role *
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all appearance-none"
                    required
                  >
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="owner">Owner</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    Update Member
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DELETE CONFIRM MODAL */}
      {/* ============================================ */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-black mb-2">
                Delete Member
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-black">
                  {selectedMember.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMember}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* INVITATION LINK MODAL */}
      {/* ============================================ */}
      {showInviteModal && invitationLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Invitation Link</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInvitationLink("");
                  setInviteModalData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {inviteModalData && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">To:</span>{" "}
                    {inviteModalData.name}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Email:</span>{" "}
                    {inviteModalData.email}
                  </p>
                  {inviteModalData.needsRegistration && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        ⚠️ This user doesn't have an account yet. They will need
                        to register first.
                      </p>
                    </div>
                  )}
                  {inviteModalData.status &&
                    inviteModalData.status !== "active" && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">
                          ℹ️ This invitation will help this user complete their
                          registration.
                        </p>
                      </div>
                    )}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                  Share this link with the member
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black font-mono focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-gray-600"
                    title="Copy link"
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-xs text-green-600 mt-2">
                    Link copied to clipboard!
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInvitationLink("");
                  setInviteModalData(null);
                }}
                className="w-full bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
