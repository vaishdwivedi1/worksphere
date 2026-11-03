import express from "express";
import APIPATHS from "../utils/APIPATHS.js";
import {
  getAllLeaveTypes,
  getLeaveTypeById,
  updateLeaveType,
  deleteLeaveType,
  applyLeave,
  getAllLeaves,
  getLeaveById,
  approveLeave,
  rejectLeave,
  cancelLeave,
  updateLeave,
  createLeaveType,
} from "../controllers/leaveControllers.js";

const router = express.Router();

// ---- Leave Types ----
router.post(APIPATHS.createLeaveType, createLeaveType);
router.get(APIPATHS.getAllLeaveTypes, getAllLeaveTypes);
router.get(APIPATHS.getLeaveTypeById, getLeaveTypeById);
router.patch(APIPATHS.updateLeaveType, updateLeaveType);
router.delete(APIPATHS.deleteLeaveType, deleteLeaveType);

// ---- Leaves ----
router.post(APIPATHS.applyLeave, applyLeave);
router.get(APIPATHS.getAllLeaves, getAllLeaves);
router.get(APIPATHS.getLeaveById, getLeaveById);
router.patch(APIPATHS.updateLeave, updateLeave);
router.patch(APIPATHS.approveLeave, approveLeave);
router.patch(APIPATHS.rejectLeave, rejectLeave);
router.patch(APIPATHS.cancelLeave, cancelLeave);

export default router;
