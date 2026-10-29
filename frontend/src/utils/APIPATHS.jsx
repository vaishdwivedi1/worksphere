const APIPATHS = {
  // ============================================
  // AUTH (existing)
  // ============================================
  verifyOrganization: "/worksphere/api/v1/organization/verify-otp",
  createOrganization: "/worksphere/api/v1/organization/create",
  login: "/worksphere/api/v1/auth/login",
  forgotPassword: "/worksphere/api/v1/auth/forgot-password",
  changePassword: "/worksphere/api/v1/auth/change-password",
  logout: "/worksphere/api/v1/auth/logout",
  verifyMemberInvitationLink:
    "/worksphere/api/v1/organization/member/verify-invitation-link",

  // ============================================
  // MEMBERS (existing)
  // ============================================
  getAllMember: "/worksphere/api/v1/organization/members",
  addMember: "/worksphere/api/v1/organization/member/add",
  updateMember: "/worksphere/api/v1/organization/member/update",
  deleteMember: "/worksphere/api/v1/organization/member/delete",
  changeStatusOfMember: "/worksphere/api/v1/organization/member/change-status",
  generateMemberInvitationLink:
    "/worksphere/api/v1/organization/member/generate-invitation-link",

  // ============================================
  // TEAMS (existing)
  // ============================================
  getAllTeams: "/worksphere/api/v1/organization/teams",
  getTeamById: "/worksphere/api/v1/organization/team",
  createTeam: "/worksphere/api/v1/organization/team/create",
  updateTeam: "/worksphere/api/v1/organization/team/update",
  deleteTeam: "/worksphere/api/v1/organization/team/delete",
  getTeamMembers: "/worksphere/api/v1/organization/team/members",
  addTeamMember: "/worksphere/api/v1/organization/team/members/add",
  removeTeamMember: "/worksphere/api/v1/organization/team/members/remove",

  // ============================================
  // JOBS (NEW)
  // ============================================
  createJob: "/worksphere/api/v1/jobs/create",
  getAllJobs: "/worksphere/api/v1/jobs",
  getJobById: "/worksphere/api/v1/jobs", // append /:id
  updateJob: "/worksphere/api/v1/jobs/update", // append /:id
  updateJobStatus: "/worksphere/api/v1/jobs/update-status", // append /:id
  deleteJob: "/worksphere/api/v1/jobs/delete", // append /:id

  // ============================================
  // CANDIDATES (NEW)
  // ============================================
  createCandidate: "/worksphere/api/v1/candidates/create",
  getAllCandidates: "/worksphere/api/v1/candidates",
  getCandidateById: "/worksphere/api/v1/candidates", // append /:id
  updateCandidate: "/worksphere/api/v1/candidates/update", // append /:id
  updateCandidateStatus: "/worksphere/api/v1/candidates/update-status", // append /:id
  deleteCandidate: "/worksphere/api/v1/candidates/delete", // append /:id

  // ============================================
  // INTERVIEWS (NEW)
  // ============================================
  createInterview: "/worksphere/api/v1/interviews/create",
  getInterviewsByCandidate: "/worksphere/api/v1/interviews/candidate", // append /:candidateId
  updateInterview: "/worksphere/api/v1/interviews/update", // append /:id
  deleteInterview: "/worksphere/api/v1/interviews/delete", // append /:id
};

export default APIPATHS;
