const APIPATHS = {
  // auth
  verifyOrganization: "/worksphere/api/v1/organization/verify-otp",
  createOrganization: "/worksphere/api/v1/organization/create",
  login: "/worksphere/api/v1/auth/login",
  forgotPassword: "/worksphere/api/v1/auth/forgot-password",
  changePassword: "/worksphere/api/v1/auth/change-password",
  logout: "/worksphere/api/v1/auth/logout",
  verifyMemberInvitationLink:
    "/worksphere/api/v1/organization/member/verify-invitation-link",

  // member
  getAllMember: "/worksphere/api/v1/organization/members",
  addMember: "/worksphere/api/v1/organization/member/add",
  updateMember: "/worksphere/api/v1/organization/member/update",
  deleteMember: "/worksphere/api/v1/organization/member/delete",
  changeStatusOfMember: "/worksphere/api/v1/organization/member/change-status",
  generateMemberInvitationLink:
    "/worksphere/api/v1/organization/member/generate-invitation-link",

  // teams
  getAllTeams: "/worksphere/api/v1/organization/teams",
  getTeamById: "/worksphere/api/v1/organization/team",
  createTeam: "/worksphere/api/v1/organization/team/create",
  updateTeam: "/worksphere/api/v1/organization/team/update",
  deleteTeam: "/worksphere/api/v1/organization/team/delete",
  getTeamMembers: "/worksphere/api/v1/organization/team/members",
  addTeamMember: "/worksphere/api/v1/organization/team/members/add",
  removeTeamMember: "/worksphere/api/v1/organization/team/members/remove",
};

export default APIPATHS;
