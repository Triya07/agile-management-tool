const Sprint = require("../models/Sprint");
const Project = require("../models/Project");

// Create a new sprint
const createSprint = async (req, res) => {
  try {
    const { sprintName, startDate, endDate, projectId } = req.body;
    const userId = req.user.id;

    // Verify user has access to the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this project" });
    }

    const sprint = new Sprint({
      sprintName,
      startDate,
      endDate,
      projectId,
      status: "planning"
    });

    await sprint.save();

    res.status(201).json({
      message: "Sprint created successfully",
      sprint
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating sprint",
      error: error.message
    });
  }
};

// Get all sprints for a project (user-specific)
const getProjectSprints = async (req, res) => {
  try {
    const { projectId } = req.query;
    const userId = req.user.id;

    // Verify user has access to the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this project" });
    }

    const sprints = await Sprint.find({ projectId }).sort({ createdAt: -1 });
    res.status(200).json(sprints);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching sprints",
      error: error.message
    });
  }
};

// Get all sprints (for user's projects only)
const getAllSprints = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all projects where user is a member or creator
    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    });

    const projectIds = projects.map(p => p._id);

    // Get sprints for these projects
    const sprints = await Sprint.find({ projectId: { $in: projectIds } })
      .populate("projectId")
      .sort({ createdAt: -1 });

    res.status(200).json(sprints);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching sprints",
      error: error.message
    });
  }
};

module.exports = {
  createSprint,
  getProjectSprints,
  getAllSprints
};