const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { register, login, changePassword, deleteAccount } = require("../controllers/authController");

router.post("/signup", register);
router.post("/login", login);
router.patch("/change-password", protect, changePassword);
router.delete("/me", protect, deleteAccount);

module.exports = router;
