import express from "express";
import {
  addMember,
  updateMember,
  deleteMember,
  changeStatusOfMember,
  generateMemberInvitationLink,
  getAllMember,
  verifyMemberInvitationLink,
} from "../controllers/memberControllers.js";

const router = express.Router();

router.get("/v1/organization/members/:orgId", getAllMember);
router.post("/v1/organization/member/add", addMember);
router.post("/v1/organization/member/update", updateMember);
router.delete("/v1/organization/member/delete", deleteMember);
router.patch("/v1/organization/member/change-status", changeStatusOfMember);
router.post(
  "/v1/organization/member/generate-invitation-link",
  generateMemberInvitationLink,
);
router.get(
  "/v1/organization/member/verify-invitation-link",
  verifyMemberInvitationLink,
);

export default router;
