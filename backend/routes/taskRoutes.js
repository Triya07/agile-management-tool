const express = require("express");
const router = express.Router();

const { createTask } = require("../controllers/taskController");

router.post("/create", createTask);

module.exports = router;