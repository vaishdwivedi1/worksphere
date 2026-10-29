import express from "express";
import * as candidateController from "../controllers/candidateController.js";
import APIPATHS from "../utils/APIPATHS.js";

const router = express.Router();

// POST   /v1/candidates/create
router.post(APIPATHS.createCandidate, candidateController.createCandidate);

// GET    /v1/candidates
router.get(APIPATHS.getAllCandidates, candidateController.getCandidates);

// GET    /v1/candidates/:id
router.get(APIPATHS.getCandidateById, candidateController.getCandidateById);

// PUT    /v1/candidates/update/:id
router.put(APIPATHS.updateCandidate, candidateController.updateCandidate);

// PATCH  /v1/candidates/update-status/:id
router.patch(
  APIPATHS.updateCandidateStatus,
  candidateController.updateCandidateStatus,
);

// DELETE /v1/candidates/delete/:id
router.delete(APIPATHS.deleteCandidate, candidateController.deleteCandidate);

export default router;
