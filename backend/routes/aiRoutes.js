const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getAIStatus, chatWithAI } = require("../controllers/aiController");

router.get("/status", protect, getAIStatus);
router.post("/chat", protect, chatWithAI);

module.exports = router;
