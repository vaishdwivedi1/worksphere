import express from "express";
import {
  addMember,
  generateMemberInvitationLink,
} from "../controllers/memberControllers";

const router = express.Router();

router.post("/v1/organization/member/add", addMember);
router.post(
  "/v1/organization/member/generate-invitation-link",
  generateMemberInvitationLink,
);
