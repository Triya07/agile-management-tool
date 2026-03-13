const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { 
  createTask, 
  getTasks, 
  getProjectTasks,
  getUserTasks,
  updateTaskStatus,
  updateTask,
  deleteTask
} = require("../controllers/taskController");

router.post("/create", protect, createTask);
router.get("/", protect, getTasks);
router.get("/project", protect, getProjectTasks);
router.get("/user/tasks", protect, getUserTasks);
router.patch("/:taskId/status", protect, updateTaskStatus);
router.put("/:taskId", protect, updateTask);
router.delete("/:taskId", protect, deleteTask);

module.exports = router;