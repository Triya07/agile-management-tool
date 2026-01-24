const express = require("express");
const router = express.Router();

const { createSprint, getAllSprints } = require("../controllers/sprintController");

router.post("/create", createSprint);
router.get("/", getAllSprints);

module.exports = router;
