const mongoose = require("mongoose");

const sprintSchema = new mongoose.Schema(
  {
    sprintName: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Sprint", sprintSchema);