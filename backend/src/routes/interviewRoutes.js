import express from "express";
import * as interviewController from "../controllers/interviewController.js";
import APIPATHS from "../utils/APIPATHS.js";

const router = express.Router();

// POST   /v1/interviews/create
router.post(APIPATHS.createInterview, interviewController.createInterview);

// GET    /v1/interviews/candidate/:candidateId
router.get(
  APIPATHS.getInterviewsByCandidate,
  interviewController.getInterviewsByCandidate,
);

// PUT    /v1/interviews/update/:id
router.put(APIPATHS.updateInterview, interviewController.updateInterview);

// DELETE /v1/interviews/delete/:id
router.delete(APIPATHS.deleteInterview, interviewController.deleteInterview);

export default router;
