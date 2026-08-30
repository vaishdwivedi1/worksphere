import express from "express";

import {
  loginUser,
  createOrganization,
  verifyAndCreateOrganization,
  addMember,
  generateMemberInvitationLink,
  forgotPassword,
  changePassword,
  logout,
  refreshToken,
  profile,
} from "../controllers/auth/authControllers.js";

const router = express.Router();

router.post("/v1/auth/login", loginUser);
router.post("/v1/organization/create", createOrganization);
router.post("/v1/organization/verify-otp", verifyAndCreateOrganization);
router.post("/v1/organization/member/add", addMember);
router.post(
  "/v1/organization/member/generate-invitation-link",
  generateMemberInvitationLink,
);
router.post("/v1/auth/forgot-password", forgotPassword);
router.post("/v1/auth/change-password", changePassword);
router.post("/v1/auth/logout", logout);
router.post("/v1/auth/refresh-token", refreshToken);
router.get("/v1/auth/profile", profile);

export default router;
