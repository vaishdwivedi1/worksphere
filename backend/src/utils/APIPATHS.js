const APIPATHS = {
  // AUTH
  login: "/v1/auth/login",
  forgotPassword: "/v1/auth/forgot-password",
  changePassword: "/v1/auth/change-password",
  logout: "/v1/auth/logout",
  refreshToken: "/v1/auth/refresh-token",

  // ORGANIZATION
  createOrganization: "/v1/organization/create",
  verifyOrganizationOTP: "/v1/organization/verify-otp",

  // ORGANIZATION MEMBERS
  getAllMembers: "/v1/organization/members/:orgId",
  addMember: "/v1/organization/member/add",
  updateMember: "/v1/organization/member/update",
  deleteMember: "/v1/organization/member/delete",
  changeMemberStatus: "/v1/organization/member/change-status",
  generateMemberInvitationLink:
    "/v1/organization/member/generate-invitation-link",
  verifyMemberInvitationLink: "/v1/organization/member/verify-invitation-link",

  // TEAMS
  getTeams: "/v1/organization/teams/:orgId",
  getTeamById: "/v1/organization/team/:orgId/:teamId",
  createTeam: "/v1/organization/team/create",
  updateTeam: "/v1/organization/team/update",
  deleteTeam: "/v1/organization/team/delete/:orgId/:teamId",

  // TEAM MEMBERS
  getTeamMembers: "/v1/organization/team/members/:teamId",
  addTeamMember: "/v1/organization/team/members/add",
  removeTeamMember:
    "/v1/organization/team/members/remove/:orgId/:teamId/:memberId",

  // JOBS
  createJob: "/v1/jobs/create",
  getAllJobs: "/v1/jobs",
  getJobById: "/v1/jobs/:id",
  updateJob: "/v1/jobs/update/:id",
  updateJobStatus: "/v1/jobs/update-status/:id",
  deleteJob: "/v1/jobs/delete/:id",

  // CANDIDATES
  createCandidate: "/v1/candidates/create",
  getAllCandidates: "/v1/candidates",
  getCandidateById: "/v1/candidates/:id",
  updateCandidate: "/v1/candidates/update/:id",
  updateCandidateStatus: "/v1/candidates/update-status/:id",
  deleteCandidate: "/v1/candidates/delete/:id",

  // INTERVIEWS
  createInterview: "/v1/interviews/create",
  getInterviewsByCandidate: "/v1/interviews/candidate/:candidateId",
  updateInterview: "/v1/interviews/update/:id",
  deleteInterview: "/v1/interviews/delete/:id",
};

export default APIPATHS;
