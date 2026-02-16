const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProject,
  addMember
} = require("../controllers/projectController");

router.post("/", protect, createProject);
router.get("/", protect, getProjects);
router.get("/:projectId", protect, getProject);
router.post("/:projectId/members", protect, addMember);

module.exports = router;
