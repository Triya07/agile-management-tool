const Task = require("../models/Task");

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, sprint, status } = req.body;

    const task = await Task.create({
      title,
      description,
      assignedTo,
      sprint,
      status
    });

    res.status(201).json({
      message: "Task created successfully",
      task
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating task",
      error: error.message
    });
  }
};