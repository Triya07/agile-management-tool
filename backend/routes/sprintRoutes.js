const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { createSprint, getAllSprints, getProjectSprints, getSprint, updateSprint, saveRetrospective, getSprintSummary } = require("../controllers/sprintController");

router.post("/create", protect, createSprint);
router.get("/", protect, getAllSprints);
router.get("/project", protect, getProjectSprints);
router.get("/:sprintId", protect, getSprint);
router.put("/:sprintId", protect, updateSprint);
router.post("/:sprintId/retrospective", protect, saveRetrospective);
router.get("/:sprintId/summary", protect, getSprintSummary);

module.exports = router;