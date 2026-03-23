const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { 
  createTask, 
  getTasks, 
  getProjectTasks,
  getTaskById,
  getUserTasks,
  getBacklogTasks,
  updateBacklogOrder,
  moveTaskToSprint,
  updateTaskStatus,
  updateTask,
  deleteTask,
  addComment,
  getActivityHistory,
  toggleBlocked
} = require("../controllers/taskController");

router.post("/create", protect, createTask);
router.get("/", protect, getTasks);
router.get("/project", protect, getProjectTasks);
router.get("/user/tasks", protect, getUserTasks);
router.get("/backlog", protect, getBacklogTasks);
router.get("/:taskId", protect, getTaskById);
router.get("/:taskId/activity", protect, getActivityHistory);
router.post("/:taskId/comments", protect, addComment);
router.patch("/:taskId/blocked", protect, toggleBlocked);
router.patch("/backlog/:projectId/rank", protect, updateBacklogOrder);
router.patch("/:taskId/move", protect, moveTaskToSprint);
router.patch("/:taskId/status", protect, updateTaskStatus);
router.put("/:taskId", protect, updateTask);
router.delete("/:taskId", protect, deleteTask);

module.exports = router;
