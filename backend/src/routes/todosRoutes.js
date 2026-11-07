import express from "express";

import APIPATHS from "../utils/APIPATHS.js";
import verifyToken from "../middlewares/authMiddleware.js";
import {
  createTodo,
  getAllTodo,
  getTodoById,
  updateTodo,
  deleteTodo,
} from "../controllers/todoControllers.js";

const router = express.Router();

// All request routes require auth
router.use(verifyToken);

router.post(APIPATHS.createTodo, createTodo);
router.get(APIPATHS.getAllTodo, getAllTodo);
router.get(APIPATHS.getTodoById, getTodoById);
router.put(APIPATHS.updateTodo, updateTodo);
router.delete(APIPATHS.deleteTodo, deleteTodo);

export default router;
