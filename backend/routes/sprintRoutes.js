const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { createSprint, getAllSprints, getProjectSprints } = require("../controllers/sprintController");

router.post("/create", protect, createSprint);
router.get("/", protect, getAllSprints);
router.get("/project", protect, getProjectSprints);

module.exports = router;