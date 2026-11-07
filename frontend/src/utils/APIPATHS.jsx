const APIPATHS = {
  // AUTH
  verifyOrganization: "/worksphere/api/v1/organization/verify-otp",
  createOrganization: "/worksphere/api/v1/organization/create",
  login: "/worksphere/api/v1/auth/login",
  forgotPassword: "/worksphere/api/v1/auth/forgot-password",
  changePassword: "/worksphere/api/v1/auth/change-password",
  logout: "/worksphere/api/v1/auth/logout",
  verifyMemberInvitationLink:
    "/worksphere/api/v1/organization/member/verify-invitation-link",

  // MEMBERS
  getAllMember: "/worksphere/api/v1/organization/members",
  addMember: "/worksphere/api/v1/organization/member/add",
  updateMember: "/worksphere/api/v1/organization/member/update",
  deleteMember: "/worksphere/api/v1/organization/member/delete",
  changeStatusOfMember: "/worksphere/api/v1/organization/member/change-status",
  generateMemberInvitationLink:
    "/worksphere/api/v1/organization/member/generate-invitation-link",

  // TEAMS
  getAllTeams: "/worksphere/api/v1/organization/teams",
  getTeamById: "/worksphere/api/v1/organization/team",
  createTeam: "/worksphere/api/v1/organization/team/create",
  updateTeam: "/worksphere/api/v1/organization/team/update",
  deleteTeam: "/worksphere/api/v1/organization/team/delete",
  getTeamMembers: "/worksphere/api/v1/organization/team/members",
  addTeamMember: "/worksphere/api/v1/organization/team/members/add",
  removeTeamMember: "/worksphere/api/v1/organization/team/members/remove",

  // JOBS
  createJob: "/worksphere/api/v1/jobs/create",
  getAllJobs: "/worksphere/api/v1/jobs",
  getJobById: "/worksphere/api/v1/jobs/:id",
  updateJob: "/worksphere/api/v1/jobs/update/:id",
  updateJobStatus: "/worksphere/api/v1/jobs/update-status/:id",
  deleteJob: "/worksphere/api/v1/jobs/delete/:id",

  // CANDIDATES
  createCandidate: "/worksphere/api/v1/candidates/create",
  getAllCandidates: "/worksphere/api/v1/candidates",
  getCandidateById: "/worksphere/api/v1/candidates/:id",
  updateCandidate: "/worksphere/api/v1/candidates/update/:id",
  updateCandidateStatus: "/worksphere/api/v1/candidates/update-status/:id",
  deleteCandidate: "/worksphere/api/v1/candidates/delete/:id",

  // CANDIDATE ROUNDS
  createRound: "/worksphere/api/v1/candidates/round/create",
  updateRound: "/worksphere/api/v1/candidates/round/update/:id",
  deleteRound: "/worksphere/api/v1/candidates/round/delete/:id",

  // INTERVIEWS
  createInterview: "/worksphere/api/v1/interviews/create",
  getInterviewsByCandidate:
    "/worksphere/api/v1/interviews/candidate/:candidateId",
  updateInterview: "/worksphere/api/v1/interviews/update/:id",
  deleteInterview: "/worksphere/api/v1/interviews/delete/:id",

  // LEAVES
  createLeaveType: "/worksphere/api/v1/leaves/types/create",
  getAllLeaveTypes: "/worksphere/api/v1/leaves/types",
  getLeaveTypeById: "/worksphere/api/v1/leaves/types/:id",
  updateLeaveType: "/worksphere/api/v1/leaves/types/update/:id",
  deleteLeaveType: "/worksphere/api/v1/leaves/types/delete/:id",

  applyLeave: "/worksphere/api/v1/leaves/apply",
  getAllLeaves: "/worksphere/api/v1/leaves",
  getLeaveById: "/worksphere/api/v1/leaves/:id",
  approveLeave: "/worksphere/api/v1/leaves/approve/:id",
  rejectLeave: "/worksphere/api/v1/leaves/reject/:id",
  cancelLeave: "/worksphere/api/v1/leaves/cancel/:id",
  updateLeave: "/worksphere/api/v1/leaves/update/:id",

  // REQUESTS
  createRequest: "/worksphere/api/v1/requests/create",
  getAllRequests: "/worksphere/api/v1/requests",
  getRequestById: "/worksphere/api/v1/requests/:id",
  updateRequest: "/worksphere/api/v1/requests/update/:id",
  deleteRequest: "/worksphere/api/v1/requests/delete/:id",
  closeRequest: "/worksphere/api/v1/requests/close/:id",
  addRequestComment: "/worksphere/api/v1/requests/:id/comments",
  getRequestComments: "/worksphere/api/v1/requests/:id/comments",

  // ANNOUNCEMENTS
  createAnnouncement: "/worksphere/api/v1/announcements/create",
  getAllAnnouncements: "/worksphere/api/v1/announcements",
  updateAnnouncement: "/worksphere/api/v1/announcements/update/:id",
  deleteAnnouncement: "/worksphere/api/v1/announcements/delete/:id",
  archiveAnnouncement: "/worksphere/api/v1/announcements/archive/:id",
};

export default APIPATHS;
