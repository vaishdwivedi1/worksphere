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
import APIPATHS from "../utils/APIPATHS.js";

const router = express.Router();

router.get(APIPATHS.getAllMembers, getAllMember);

router.post(APIPATHS.addMember, addMember);

router.put(APIPATHS.updateMember, updateMember);

router.delete(APIPATHS.deleteMember, deleteMember);

router.put(APIPATHS.changeMemberStatus, changeStatusOfMember);

router.post(
  APIPATHS.generateMemberInvitationLink,
  generateMemberInvitationLink,
);

router.get(APIPATHS.verifyMemberInvitationLink, verifyMemberInvitationLink);

export default router;
