const Sprint = require("../models/Sprint");

// Create a new sprint
const createSprint = async (req, res) => {
  try {
    const { sprintName, startDate, endDate } = req.body;

    const sprint = new Sprint({
      sprintName,
      startDate,
      endDate
    });

    await sprint.save();

    res.status(201).json({
      message: "Sprint created successfully",
      sprint
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating sprint",
      error
    });
  }
};
// Get all sprints
const getAllSprints = async (req, res) => {
  try {
    const sprints = await Sprint.find().sort({ createdAt: -1 });

    res.status(200).json(sprints);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching sprints",
      error
    });
  }
};

module.exports = {
  createSprint,
  getAllSprints
};