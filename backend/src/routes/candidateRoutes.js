import express from "express";
import * as candidateController from "../controllers/candidateController.js";
import APIPATHS from "../utils/APIPATHS.js";

const router = express.Router();

// Candidates
router.post(APIPATHS.createCandidate, candidateController.createCandidate);
router.get(APIPATHS.getAllCandidates, candidateController.getCandidates);
router.get(APIPATHS.getCandidateById, candidateController.getCandidateById);
router.put(APIPATHS.updateCandidate, candidateController.updateCandidate);
router.patch(
  APIPATHS.updateCandidateStatus,
  candidateController.updateCandidateStatus,
);
router.delete(APIPATHS.deleteCandidate, candidateController.deleteCandidate);

// Rounds
router.post(APIPATHS.createRound, candidateController.createRound);
router.put(APIPATHS.updateRound, candidateController.updateRound);
router.delete(APIPATHS.deleteRound, candidateController.deleteRound);

export default router;
