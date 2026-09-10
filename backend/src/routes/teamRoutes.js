import express from "express";
import APIPATHS from "../utils/APIPATHS.js";
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from "../controllers/teamControllers.js";

const router = express.Router();

router.get(APIPATHS.getTeams, getTeams);
router.get(APIPATHS.getTeamById, getTeamById);
router.post(APIPATHS.createTeam, createTeam);
router.put(APIPATHS.updateTeam, updateTeam);
router.delete(APIPATHS.deleteTeam, deleteTeam);
router.get(APIPATHS.getTeamMembers, getTeamMembers);
router.post(APIPATHS.addTeamMember, addTeamMember);
router.delete(APIPATHS.removeTeamMember, removeTeamMember);

export default router;
