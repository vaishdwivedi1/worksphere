const APIPATHS = {
  // auth
  verifyOrganization: "/worksphere/api/v1/organization/verify-otp",
  createOrganization: "/worksphere/api/v1/organization/create",
  login: "/worksphere/api/v1/auth/login",
  forgotPassword: "/worksphere/api/v1/auth/forgot-password",
  changePassword: "/worksphere/api/v1/auth/change-password",
  logout: "/worksphere/api/v1/auth/logout",

  // member
  getAllMember: "/worksphere/api/v1/organization/members",
  addMember: "/worksphere/api/v1/organization/member/add",
  updateMember: "/worksphere/api/v1/organization/member/update",
  deleteMember: "/worksphere/api/v1/organization/member/delete",
  changeStatusOfMember: "/worksphere/api/v1/organization/member/change-status",
  generateMemberInvitationLink:
    "/worksphere/api/v1/organization/member/generate-invitation-link",
};

export default APIPATHS;
