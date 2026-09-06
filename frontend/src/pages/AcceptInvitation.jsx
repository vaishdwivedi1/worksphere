import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  User,
  Building,
  Clock,
  ArrowRight,
  UserPlus,
  LogIn,
  Shield,
  XCircle,
  Calendar,
  Users,
  Briefcase,
} from "lucide-react";
import { api } from "../services/api";
import APIPATHS from "../utils/APIPATHS";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const orgId = searchParams.get("orgId");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitationData, setInvitationData] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Format time remaining
  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  // Verify invitation on mount
  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token || !orgId || !email) {
        setError("Invalid invitation link. Missing required parameters.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `${APIPATHS.verifyMemberInvitationLink}?token=${token}&orgId=${orgId}&email=${email}`,
        );

        if (response.success) {
          const member = response.data.member;

          // Set expiry to 7 days from now if not provided
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          setInvitationData({
            invitation: {
              organizationId: response.data.organizationId || orgId,
              organizationName: organizationName || "Organization",
              email: member.member_email || email,
              name: member.name || "User",
              phone: member.phone || "",
              role: member.role || "developer",
              createdAt: member.joined_at || new Date().toISOString(),
              expiresAt: expiresAt.toISOString(),
              invitationStatus: "pending",
            },
            user: {
              id: member.user_id,
              name: member.name,
              email: member.user_email,
              phone: member.phone,
              isActive: member.user_active,
            },
            status: {
              needsRegistration: false,
              isActive: member.member_status === "active",
              message:
                member.member_status === "active"
                  ? "You are ready to join the organization!"
                  : "Your account is pending activation.",
            },
          });

          const remaining = formatTimeRemaining(expiresAt.toISOString());
          setTimeRemaining(remaining);
        } else {
          setError(response.message || "Failed to verify invitation");
        }
      } catch (err) {
        console.error("Error verifying invitation:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Something went wrong. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    // Fetch organization name
    const fetchOrganizationName = async () => {
      if (!orgId) return;
      try {
        const response = await api.get(`${APIPATHS.getOrganization}/${orgId}`);
        if (response.success && response.data) {
          setOrganizationName(
            response.data.name || response.data.company_name || "Organization",
          );
        }
      } catch (err) {
        console.error("Error fetching organization:", err);
        setOrganizationName("Organization");
      }
    };

    verifyInvitation();
    fetchOrganizationName();
  }, [token, orgId, email]);

  // Update time remaining every minute
  useEffect(() => {
    if (!invitationData) return;

    const interval = setInterval(() => {
      const remaining = formatTimeRemaining(
        invitationData.invitation.expiresAt,
      );
      setTimeRemaining(remaining);
    }, 60000);

    return () => clearInterval(interval);
  }, [invitationData]);

  // Handle accept invitation
  const handleAcceptInvitation = async () => {
    setAccepting(true);
    setError("");

    try {
      const response = await api.post(APIPATHS.acceptMemberInvitation, {
        token: token,
        orgId: orgId,
        email: email,
        userId: invitationData?.user?.id || null,
      });

      if (response.success) {
        setAcceptSuccess(true);

        // Store organization info in localStorage
        const orgData = {
          id: response.data.organizationId || orgId,
          name: invitationData?.invitation?.organizationName || "Organization",
        };
        localStorage.setItem("org", JSON.stringify(orgData));

        // Store user info if available
        if (response.data.member) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              id: response.data.member.user_id,
              name: response.data.member.name,
              email: response.data.member.user_email,
              phone: response.data.member.phone,
              role: response.data.member.role,
            }),
          );
        }

        // ✅ Navigate to login page after 2 seconds
        setTimeout(() => {
          navigate("/login", {
            state: {
              message:
                "Invitation accepted successfully! Please login to continue.",
              email: email,
            },
          });
        }, 2000);
      } else {
        setError(response.message || "Failed to accept invitation");
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setAccepting(false);
    }
  };

  // Handle register and join
  const handleRegisterAndJoin = () => {
    navigate("/register", {
      state: {
        invitationData: invitationData,
        token: token,
        orgId: orgId,
        email: email,
        prefillData: {
          name: invitationData?.invitation?.name || "",
          email: invitationData?.invitation?.email || "",
          phone: invitationData?.invitation?.phone || "",
        },
      },
    });
  };

  // Handle login and accept
  const handleLoginAndAccept = () => {
    navigate("/login", {
      state: {
        redirectTo: "/accept-invitation",
        invitationData: {
          token: token,
          orgId: orgId,
          email: email,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping"></div>
              <div className="relative bg-emerald-50 rounded-full p-4">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Verifying Invitation
          </h2>
          <p className="text-gray-500 text-sm">
            Please wait while we verify your invitation...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 text-sm mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition-all duration-200"
              >
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (acceptSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Invitation Accepted! 🎉
          </h2>
          <p className="text-gray-600 text-sm mb-2">
            You have successfully joined{" "}
            <span className="font-semibold text-emerald-600">
              {invitationData?.invitation?.organizationName || "Organization"}
            </span>
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Please login to continue to your dashboard.
          </p>
          <p className="text-gray-400 text-xs">Redirecting to login...</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full animate-pulse"
              style={{ width: "100%" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Invitation Not Found
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            We couldn't find this invitation. It may have been removed or
            expired.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition-all duration-200"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { invitation, user, status } = invitationData;
  const isExpired = timeRemaining === "Expired";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transition-all duration-300 hover:shadow-3xl">
        {/* Organization Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <Building className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {invitation.organizationName || "Organization"}
              </h1>
              <p className="text-emerald-100 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Organization Invitation
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Member Info */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800">
                Invitation Details
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  Name
                </p>
                <p className="font-medium text-gray-800 mt-1">
                  {invitation.name}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  Role
                </p>
                <p className="font-medium text-gray-800 mt-1">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {invitation.role?.charAt(0).toUpperCase() +
                      invitation.role?.slice(1)}
                  </span>
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  Email
                </p>
                <p className="font-medium text-gray-800 mt-1 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  {invitation.email}
                </p>
              </div>
              {invitation.phone && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs uppercase tracking-wider">
                    Phone
                  </p>
                  <p className="font-medium text-gray-800 mt-1 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    {invitation.phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status & Expiry */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm border border-green-100">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Ready to Join</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {isExpired ? (
                  <span className="text-red-600 font-medium">Expired</span>
                ) : (
                  <span>
                    Expires in{" "}
                    <span className="font-semibold text-gray-800">
                      {timeRemaining}
                    </span>
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Status Message */}
          <div className="p-4 rounded-xl mb-6 border bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">
                {status.message || "You are ready to join the organization!"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isExpired && (
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Accept Invitation
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {isExpired && (
            <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="text-red-700 font-semibold text-lg mb-1">
                Invitation Expired
              </h3>
              <p className="text-red-600 text-sm">
                This invitation has expired. Please contact the organization
                admin for a new invitation.
              </p>
              <button
                onClick={() => navigate("/")}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium"
              >
                Go to Home
              </button>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">
                Secure Invitation
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Invited: {formatDate(invitation.createdAt)}</span>
              <span>Status: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            This is a secure invitation link. Do not share it with anyone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
