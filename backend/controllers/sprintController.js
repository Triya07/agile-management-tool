const Sprint = require("../models/Sprint");
const Project = require("../models/Project");
const Task = require("../models/Task");

// Create a new sprint
const createSprint = async (req, res) => {
  try {
    const { sprintName, sprintGoal, startDate, endDate, projectId } = req.body;
    const userId = req.user.id;

    // Verify user has access to the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(member => member.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this project" });
    }

    const sprint = new Sprint({
      sprintName,
      sprintGoal,
      startDate,
      endDate,
      projectId,
      status: "active"
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
                         project.members.some(member => member.toString() === userId);
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

// Get single sprint
const getSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const userId = req.user.id;

    const sprint = await Sprint.findById(sprintId).populate("projectId");
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found" });
    }

    // Verify access
    const project = await Project.findById(sprint.projectId);
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(m => m._id.toString() === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this sprint" });
    }

    res.status(200).json(sprint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update sprint (name, goal, dates, status)
const updateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { sprintName, sprintGoal, startDate, endDate, status } = req.body;
    const userId = req.user.id;

    const sprint = await Sprint.findById(sprintId).populate("projectId");
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found" });
    }

    // Verify access
    const project = sprint.projectId;
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(m => m._id.toString() === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this sprint" });
    }

    if (sprintName) sprint.sprintName = sprintName;
    if (sprintGoal) sprint.sprintGoal = sprintGoal;
    if (startDate) sprint.startDate = startDate;
    if (endDate) sprint.endDate = endDate;
    if (status) sprint.status = status;

    await sprint.save();

    res.status(200).json({
      message: "Sprint updated successfully",
      sprint
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Save retrospective
const saveRetrospective = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { good, bad, improve, feedback } = req.body;
    const userId = req.user.id;

    const sprint = await Sprint.findById(sprintId).populate("projectId");
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found" });
    }

    // Verify access
    const project = sprint.projectId;
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(m => m._id.toString() === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this sprint" });
    }

    sprint.retrospective = { good, bad, improve, feedback };
    await sprint.save();

    res.status(200).json({
      message: "Retrospective saved successfully",
      sprint
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get sprint tasks with counts
const getSprintSummary = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const userId = req.user.id;

    const sprint = await Sprint.findById(sprintId).populate("projectId");
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found" });
    }

    // Verify access
    const project = sprint.projectId;
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(m => m._id.toString() === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this sprint" });
    }

    // Get task counts by status
    const tasks = await Task.find({ sprint: sprintId });
    const summary = {
      sprint,
      totalTasks: tasks.length,
      tasksByStatus: {
        todo: tasks.filter(t => t.status === "todo").length,
        inprogress: tasks.filter(t => t.status === "inprogress").length,
        done: tasks.filter(t => t.status === "done").length
      },
      tasks
    };

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSprint,
  getProjectSprints,
  getAllSprints,
  getSprint,
  updateSprint,
  saveRetrospective,
  getSprintSummary
};