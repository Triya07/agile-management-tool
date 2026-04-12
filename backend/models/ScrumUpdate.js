const mongoose = require("mongoose");

const scrumUpdateSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    yesterday: {
      type: String,
      required: true,
      trim: true
    },
    today: {
      type: String,
      required: true,
      trim: true
    },
    blockers: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ScrumUpdate", scrumUpdateSchema);
