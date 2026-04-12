const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProject,
  addMember,
  updateProject
} = require("../controllers/projectController");

router.post("/", protect, createProject);
router.get("/", protect, getProjects);
router.get("/:projectId", protect, getProject);
router.put("/:projectId", protect, updateProject);
router.post("/:projectId/members", protect, addMember);

module.exports = router;
