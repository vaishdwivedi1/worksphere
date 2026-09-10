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
import APIPATHS from "../utils/APIPATHS.js";

const router = express.Router();

router.post(APIPATHS.login, loginUser);

router.post(APIPATHS.createOrganization, createOrganization);

router.post(APIPATHS.verifyOrganizationOTP, verifyAndCreateOrganization);

router.post(APIPATHS.forgotPassword, forgotPassword);

router.post(APIPATHS.changePassword, changePassword);

router.post(APIPATHS.logout, logout);

router.post(APIPATHS.refreshToken, refreshToken);

export default router;
