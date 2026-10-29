import express from "express";
import * as jobController from "../controllers/jobsController.js";
import APIPATHS from "../utils/APIPATHS.js";

const router = express.Router();

router.post(APIPATHS.createJob, jobController.createJob);

router.get(APIPATHS.getAllJobs, jobController.getJobs);

router.get(APIPATHS.getJobById, jobController.getJobById);

router.put(APIPATHS.updateJob, jobController.updateJob);

router.patch(APIPATHS.updateJobStatus, jobController.updateJobStatus);

router.delete(APIPATHS.deleteJob, jobController.deleteJob);

export default router;
