const Sprint = require("../models/Sprint");
const Project = require("../models/Project");
const Task = require("../models/Task");
const { requireNonEmptyString, validateEnum } = require("../utils/requestValidation");
const VALID_SPRINT_STATUSES = ["planning", "active", "completed"];

function isProjectMember(project, userId) {
  return project.createdBy.toString() === userId ||
    project.members.some((member) => member.toString() === userId);
}

function canManageSprint(project, userId, userRole) {
  return userRole === "manager" && project.createdBy.toString() === userId;
}

function parseSprintDates(startDate, endDate) {
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    return { error: "Sprint start and end dates must be valid dates." };
  }

  if (parsedStartDate > parsedEndDate) {
    return { error: "Sprint start date must be before or equal to the end date." };
  }

  return { parsedStartDate, parsedEndDate };
}

async function validateSprintGovernance({
  projectId,
  startDate,
  endDate,
  status,
  excludeSprintId = null
}) {
  const managedStatuses = ["planning", "active"];
  if (!managedStatuses.includes(status)) {
    return null;
  }

  const overlapQuery = {
    projectId,
    status: { $in: managedStatuses },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };

  if (excludeSprintId) {
    overlapQuery._id = { $ne: excludeSprintId };
  }

  const overlappingSprint = await Sprint.findOne(overlapQuery);
  if (overlappingSprint) {
    return "Sprint dates overlap with another planning or active sprint in this project.";
  }

  if (status === "active") {
    const activeSprintQuery = {
      projectId,
      status: "active"
    };

    if (excludeSprintId) {
      activeSprintQuery._id = { $ne: excludeSprintId };
    }

    const anotherActiveSprint = await Sprint.findOne(activeSprintQuery);
    if (anotherActiveSprint) {
      return "Only one active sprint is allowed per project.";
    }
  }

  return null;
}

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

    if (!canManageSprint(project, userId, req.user.role)) {
      return res.status(403).json({ message: "Only the project manager can create sprints" });
    }

    if (!sprintName || !startDate || !endDate) {
      return res.status(400).json({ message: "Sprint name, start date, and end date are required" });
    }

    const validatedName = requireNonEmptyString(sprintName, "Sprint name");
    if (validatedName.error) {
      return res.status(400).json({ message: validatedName.error });
    }

    const { parsedStartDate, parsedEndDate, error } = parseSprintDates(startDate, endDate);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const governanceError = await validateSprintGovernance({
      projectId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status: "planning"
    });
    if (governanceError) {
      return res.status(400).json({ message: governanceError });
    }

    const sprint = new Sprint({
      sprintName: validatedName.value,
      sprintGoal,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
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

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    // Verify user has access to the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = isProjectMember(project, userId);
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
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = isProjectMember(project, userId);
    
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
    if (!canManageSprint(project, userId, req.user.role)) {
      return res.status(403).json({ message: "Only the project manager can update sprints" });
    }

    const nextSprintName = sprintName !== undefined ? String(sprintName).trim() : sprint.sprintName;
    const nextStartDate = startDate ? new Date(startDate) : sprint.startDate;
    const nextEndDate = endDate ? new Date(endDate) : sprint.endDate;
    const nextStatus = status || sprint.status;

    const statusValidation = validateEnum(status, VALID_SPRINT_STATUSES, "sprint status");
    if (statusValidation.error) {
      return res.status(400).json({ message: statusValidation.error });
    }

    if (!nextSprintName) {
      return res.status(400).json({ message: "Sprint name is required" });
    }

    const { parsedStartDate, parsedEndDate, error } = parseSprintDates(nextStartDate, nextEndDate);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const governanceError = await validateSprintGovernance({
      projectId: project._id,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status: nextStatus,
      excludeSprintId: sprint._id
    });
    if (governanceError) {
      return res.status(400).json({ message: governanceError });
    }

    if (sprintName) sprint.sprintName = sprintName;
    if (sprintGoal) sprint.sprintGoal = sprintGoal;
    if (startDate) sprint.startDate = parsedStartDate;
    if (endDate) sprint.endDate = parsedEndDate;
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
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = isProjectMember(project, userId);
    
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
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = isProjectMember(project, userId);
    
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
