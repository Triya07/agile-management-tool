require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Project = require("./models/Project");
const Sprint = require("./models/Sprint");
const Task = require("./models/Task");

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📊 Connected to database");

    // Drop entire collections to remove all stale indexes
    try {
      await User.collection.drop();
      console.log("✅ Dropped Users collection");
    } catch (err) {
      // Collection might not exist, that's okay
    }

    try {
      await Project.collection.drop();
      console.log("✅ Dropped Projects collection");
    } catch (err) {
      // Collection might not exist, that's okay
    }

    try {
      await Sprint.collection.drop();
      console.log("✅ Dropped Sprints collection");
    } catch (err) {
      // Collection might not exist, that's okay
    }

    try {
      await Task.collection.drop();
      console.log("✅ Dropped Tasks collection");
    } catch (err) {
      // Collection might not exist, that's okay
    }

    console.log("\n🎉 Database cleared successfully!");
    console.log("You can now sign up with a fresh account.\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:", error.message);
    process.exit(1);
  }
}

clearDatabase();
