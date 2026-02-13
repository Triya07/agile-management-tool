const { protect } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");


require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "*", // Allow all origins during development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("📊 Database connected successfully"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// Routes
app.get("/", (req, res) => {
  res.send("FlowBoard backend is running 🚀");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working perfectly", status: "success" });
});

app.use("/api/auth", authRoutes);



//diff
app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "Access granted ✅",
    user: req.user
  });
});

app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);


// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlowBoard Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server...");
  await mongoose.connection.close();
  process.exit(0);
});

