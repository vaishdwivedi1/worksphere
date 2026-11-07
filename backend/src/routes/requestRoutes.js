import express from "express";
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  closeRequest,
  addComment,
  getComments,
} from "../controllers/requestController.js";
import APIPATHS from "../utils/APIPATHS.js";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();

// All request routes require auth
router.use(verifyToken);

router.post(APIPATHS.createRequest, createRequest);
router.get(APIPATHS.getAllRequests, getRequests);
router.get(APIPATHS.getRequestById, getRequestById);
router.put(APIPATHS.updateRequest, updateRequest);
router.delete(APIPATHS.deleteRequest, deleteRequest);
router.patch(APIPATHS.closeRequest, closeRequest);

router.post(APIPATHS.addRequestComment, addComment);
router.get(APIPATHS.getRequestComments, getComments);

export default router;
