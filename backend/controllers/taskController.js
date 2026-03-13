const Task = require("../models/Task");
const Sprint = require("../models/Sprint");
const Project = require("../models/Project");

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const { 
      title, description, assignedTo, sprint, projectId, priority, dueDate, status,
      storyPoints, taskType, labels, acceptanceCriteria, estimate, startDate, dependsOn
    } = req.body;
    const userId = req.user.id;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(member => member.toString() === userId);
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
      startDate,
      status: status || "todo",
      createdBy: userId,
      reporter: userId,
      storyPoints: storyPoints || 0,
      taskType: taskType || "task",
      labels: labels || [],
      acceptanceCriteria: acceptanceCriteria || [],
      estimate: estimate || 0,
      dependsOn: dependsOn || [],
      activityHistory: [{
        action: "created",
        changedBy: userId,
        changedAt: new Date()
      }]
    });

    res.status(201).json({
      message: "Task created successfully",
      task: await task.populate(["assignedTo", "createdBy", "reporter", "dependsOn"])
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
                         project.members.some(member => member.toString() === userId);
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
                         project.members.some(member => member.toString() === userId);
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
                         project.members.some(member => member.toString() === userId);
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

// Update task (general)
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { 
      title, description, assignedTo, priority, dueDate, status, startDate,
      storyPoints, taskType, labels, isBlocked, blockedReason, 
      acceptanceCriteria, estimate, dependsOn
    } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Verify project access
    const project = await Project.findById(task.projectId);
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(member => member.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // Track changes in activity history
    const updates = [];
    
    if (title && title !== task.title) {
      updates.push({
        action: "updated",
        field: "title",
        oldValue: task.title,
        newValue: title,
        changedBy: userId,
        changedAt: new Date()
      });
      task.title = title;
    }
    
    if (description !== undefined && description !== task.description) {
      updates.push({
        action: "updated",
        field: "description",
        changedBy: userId,
        changedAt: new Date()
      });
      task.description = description;
    }
    
    if (status && status !== task.status) {
      updates.push({
        action: "status_changed",
        field: "status",
        oldValue: task.status,
        newValue: status,
        changedBy: userId,
        changedAt: new Date()
      });
      task.status = status;
    }
    
    if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
      updates.push({
        action: "assigned",
        oldValue: task.assignedTo?.toString(),
        newValue: assignedTo,
        changedBy: userId,
        changedAt: new Date()
      });
      task.assignedTo = assignedTo;
    }
    
    if (priority && priority !== task.priority) {
      updates.push({
        action: "updated",
        field: "priority",
        oldValue: task.priority,
        newValue: priority,
        changedBy: userId,
        changedAt: new Date()
      });
      task.priority = priority;
    }
    
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (startDate !== undefined) task.startDate = startDate;
    if (storyPoints !== undefined) task.storyPoints = storyPoints;
    if (taskType !== undefined) task.taskType = taskType;
    if (labels !== undefined) task.labels = labels;
    if (isBlocked !== undefined) task.isBlocked = isBlocked;
    if (blockedReason !== undefined) task.blockedReason = blockedReason;
    if (acceptanceCriteria !== undefined) task.acceptanceCriteria = acceptanceCriteria;
    if (estimate !== undefined) task.estimate = estimate;
    if (dependsOn !== undefined) task.dependsOn = dependsOn;

    // Add all updates to activity history
    if (updates.length > 0) {
      task.activityHistory.push(...updates);
    }

    await task.save();

    // Populate before returning
    const updatedTask = await task.populate(["assignedTo", "createdBy", "reporter", "dependsOn", "comments.author"]);

    res.json({
      message: "Task updated successfully",
      task: updatedTask
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
                         project.members.some(member => member.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error: error.message });
  }
};

// Add comment to task
exports.addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Verify project access
    const project = await Project.findById(task.projectId);
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(member => member.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to comment on this task" });
    }

    task.comments.push({
      author: userId,
      text,
      createdAt: new Date()
    });

    await task.save();

    const updatedTask = await task.populate("comments.author", "name email");

    res.json({
      message: "Comment added successfully",
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment", error: error.message });
  }
};

// Get task activity history
exports.getActivityHistory = async (req, res) => {
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
                         project.members.some(member => member.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to view this task" });
    }

    const history = await Task.findById(taskId).populate("activityHistory.changedBy", "name email");

    res.json(history.activityHistory);
  } catch (error) {
    res.status(500).json({ message: "Error fetching activity history", error: error.message });
  }
};

// Toggle task blocked state
exports.toggleBlocked = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { isBlocked, blockedReason } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Verify project access
    const project = await Project.findById(task.projectId);
    const isAuthorized = project.createdBy.toString() === userId || 
                         project.members.some(member => member.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    const oldState = task.isBlocked;
    task.isBlocked = isBlocked;
    task.blockedReason = blockedReason;

    task.activityHistory.push({
      action: "blocked_status_changed",
      oldValue: oldState.toString(),
      newValue: isBlocked.toString(),
      changedBy: userId,
      changedAt: new Date()
    });

    await task.save();

    res.json({
      message: "Task blocked state updated",
      task
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error: error.message });
  }
};
