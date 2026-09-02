import express from "express";

import {
  changePassword,
  createOrganization,
  forgotPassword,
  loginUser,
  logout,
  refreshToken,
  verifyAndCreateOrganization,
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/v1/auth/login", loginUser);
router.post("/v1/organization/create", createOrganization);
router.post("/v1/organization/verify-otp", verifyAndCreateOrganization);
router.post("/v1/auth/forgot-password", forgotPassword);
router.post("/v1/auth/change-password", changePassword);
router.post("/v1/auth/logout", logout);
router.post("/v1/auth/refresh-token", refreshToken);

export default router;
