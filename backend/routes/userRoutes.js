const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  getUserDashboard,
  updateUserProfile,
  getUserProjects,
  getUserActivity,
  getMemberDirectory
} = require("../controllers/userController");

// Protected routes - require authentication
router.get("/profile", protect, getUserProfile);
router.get("/dashboard", protect, getUserDashboard);
router.patch("/profile", protect, updateUserProfile);
router.get("/projects", protect, getUserProjects);
router.get("/activity", protect, getUserActivity);
router.get("/members", protect, getMemberDirectory);

module.exports = router;
