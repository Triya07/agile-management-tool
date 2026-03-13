require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Project = require("./models/Project");
const Sprint = require("./models/Sprint");
const Task = require("./models/Task");

async function clearAllData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Delete all documents
    await User.deleteMany({});
    await Project.deleteMany({});
    await Sprint.deleteMany({});
    await Task.deleteMany({});

    console.log("🧹 All dummy data CLEARED!");
    console.log("✨ Database is now clean and empty");
    console.log("📝 You can now add your own data through the app");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

clearAllData();
