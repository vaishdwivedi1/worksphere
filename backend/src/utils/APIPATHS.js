const APIPATHS = {
  // Auth
  login: "/v1/auth/login",
  forgotPassword: "/v1/auth/forgot-password",
  changePassword: "/v1/auth/change-password",
  logout: "/v1/auth/logout",
  refreshToken: "/v1/auth/refresh-token",

  // Organization
  createOrganization: "/v1/organization/create",
  verifyOrganizationOTP: "/v1/organization/verify-otp",

  // Organization Members
  getAllMembers: "/v1/organization/members/:orgId",
  addMember: "/v1/organization/member/add",
  updateMember: "/v1/organization/member/update",
  deleteMember: "/v1/organization/member/delete",
  changeMemberStatus: "/v1/organization/member/change-status",
  generateMemberInvitationLink:
    "/v1/organization/member/generate-invitation-link",
  verifyMemberInvitationLink: "/v1/organization/member/verify-invitation-link",

  // Teams
  getTeams: "/v1/organization/teams/:orgId",
  getTeamById: "/v1/organization/team/:orgId/:teamId",
  createTeam: "/v1/organization/team/create",
  updateTeam: "/v1/organization/team/update",
  deleteTeam: "/v1/organization/team/delete/:orgId/:teamId",

  // Team member
  getTeamMembers: "/v1/organization/team/members/:teamId",
  addTeamMember: "/v1/organization/team/members/add",
  removeTeamMember:
    "/v1/organization/team/members/remove/:orgId/:teamId/:memberId",
};

export default APIPATHS;
