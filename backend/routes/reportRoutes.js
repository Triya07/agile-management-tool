const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getProjectAgileMetrics } = require("../controllers/reportController");

router.get("/project/:projectId/agile-metrics", protect, getProjectAgileMetrics);

module.exports = router;
