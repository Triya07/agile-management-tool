const Task = require("../models/Task");
const Sprint = require("../models/Sprint");
const Project = require("../models/Project");

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, sprint, projectId, priority, dueDate, status } = req.body;
    const userId = req.user.id;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to create tasks in this project" });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      sprint,
      projectId,
      priority: priority || "medium",
      dueDate,
      status: status || "todo",
      createdBy: userId
    });

    res.status(201).json({
      message: "Task created successfully",
      task: await task.populate(["assignedTo", "createdBy"])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating task",
      error: error.message
    });
  }
};

// Get tasks for a sprint (user-specific)
exports.getTasks = async (req, res) => {
  try {
    const { sprintId, projectId } = req.query;
    const userId = req.user.id;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this project" });
    }

    const tasks = await Task.find({ sprint: sprintId, projectId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
};

// Get all tasks for a project (user-specific)
exports.getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.query;
    const userId = req.user.id;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this project" });
    }

    const tasks = await Task.find({ projectId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("sprint", "sprintName")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
};

// Get tasks assigned to current user
exports.getUserTasks = async (req, res) => {
  try {
    const userId = req.user.id;

    const tasks = await Task.find({ assignedTo: userId })
      .populate("sprint", "sprintName")
      .populate("projectId", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Verify project access
    const project = await Project.findById(task.projectId);
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    task.status = status;
    await task.save();

    res.json({
      message: "Task status updated successfully",
      task
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Verify project access
    const project = await Project.findById(task.projectId);
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.includes(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error: error.message });
  }
};
