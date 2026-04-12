const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getScrumUpdates, createScrumUpdate } = require("../controllers/scrumUpdateController");

router.get("/", protect, getScrumUpdates);
router.post("/", protect, createScrumUpdate);

module.exports = router;
