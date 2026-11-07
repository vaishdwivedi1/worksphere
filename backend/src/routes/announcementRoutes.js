import express from "express";
import {
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  archiveAnnouncement,
  createAnnouncement,
} from "../controllers/announcementController.js";
import APIPATHS from "../utils/APIPATHS.js";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(verifyToken);

router.post(APIPATHS.createAnnouncement, createAnnouncement);
router.get(APIPATHS.getAllAnnouncements, getAllAnnouncements);
router.put(APIPATHS.updateAnnouncement, updateAnnouncement);
router.delete(APIPATHS.deleteAnnouncement, deleteAnnouncement);
router.patch(APIPATHS.archiveAnnouncement, archiveAnnouncement);

export default router;
