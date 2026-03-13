const mongoose = require("mongoose");

const sprintSchema = new mongoose.Schema(
  {
    sprintName: {
      type: String,
      required: true
    },
    sprintGoal: {
      type: String,
      default: ""
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    status: {
      type: String,
      enum: ["planning", "active", "completed"],
      default: "planning"
    },
    retrospective: {
      good: String,
      bad: String,
      improve: String,
      feedback: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Sprint", sprintSchema);