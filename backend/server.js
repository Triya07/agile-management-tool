const { protect } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const sprintRoutes = require("./routes/sprintRoutes");
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes");
const scrumUpdateRoutes = require("./routes/scrumUpdateRoutes");
const aiRoutes = require("./routes/aiRoutes");
const User = require("./models/User");


require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

function getAllowedOrigins() {
  const configured = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ];

  return [...new Set([...configured, ...defaults])];
}

const allowedOrigins = getAllowedOrigins();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (e.g., curl, Postman, same-origin server calls)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// MongoDB connection with index cleanup
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📊 Database connected successfully");
    
    // Clean up stale indexes on User collection
    try {
      const indexes = await User.collection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName.includes('username')) {
          await User.collection.dropIndex(indexName);
          console.log(`✅ Dropped stale index: ${indexName}`);
        }
      }
    } catch (err) {
      // Index might not exist, that's okay
    }
    
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

connectDatabase();

// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.get("/", (req, res) => {
  res.send("FlowBoard backend is running 🚀");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working perfectly", status: "success" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/sprints", sprintRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/scrum-updates", scrumUpdateRoutes);
app.use("/api/ai", aiRoutes);


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


