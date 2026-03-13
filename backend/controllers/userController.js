const User = require("../models/User");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const mongoose = require("mongoose");

// Get current user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User profile fetched successfully",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user profile",
      error: error.message
    });
  }
};

// Get user dashboard with personalized data
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's projects
    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    })
      .populate("createdBy", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    // Get sprints for user's projects
    const projectIds = projects.map(p => p._id);
    const sprints = await Sprint.find({ projectId: { $in: projectIds } })
      .populate("projectId", "name type")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get tasks assigned to user
    const assignedTasks = await Task.find({ assignedTo: userId })
      .populate("projectId", "name")
      .populate("sprint", "sprintName")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get tasks created by user
    const createdTasks = await Task.find({ createdBy: userId })
      .populate("projectId", "name")
      .populate("sprint", "sprintName")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get projects by type
    const scrumProjects = projects.filter(p => p.type === "scrum");
    const kanbanProjects = projects.filter(p => p.type === "kanban");

    // Get task statistics
    const tasksStats = await Task.aggregate([
      {
        $match: {
          $or: [
            { assignedTo: new mongoose.Types.ObjectId(userId) },
            { createdBy: new mongoose.Types.ObjectId(userId) }
          ],
          projectId: { $in: projectIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const tasksByStatus = {
      todo: 0,
      inprogress: 0,
      done: 0,
      review: 0
    };

    tasksStats.forEach(stat => {
      if (tasksByStatus.hasOwnProperty(stat._id)) {
        tasksByStatus[stat._id] = stat.count;
      }
    });

    res.json({
      message: "Dashboard data fetched successfully",
      user,
      stats: {
        totalProjects: projects.length,
        scrumProjects: scrumProjects.length,
        kanbanProjects: kanbanProjects.length,
        tasksByStatus
      },
      projects,
      sprints,
      assignedTasks,
      createdTasks
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard",
      error: error.message
    });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, email, phone, jobTitle, department, bio, skills, startDate, avatar
    } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (department !== undefined) updateData.department = department;
    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) updateData.skills = skills;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating profile",
      error: error.message
    });
  }
};

// Get user's projects with details
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    })
      .populate("createdBy", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const sprints = await Sprint.countDocuments({ projectId: project._id });
        const tasks = await Task.countDocuments({ projectId: project._id });
        const tasksAssignedToUser = await Task.countDocuments({
          projectId: project._id,
          assignedTo: userId
        });

        return {
          ...project.toObject(),
          stats: {
            sprints,
            tasks,
            tasksAssignedToUser
          }
        };
      })
    );

    res.json({
      message: "Projects fetched successfully",
      projects: projectsWithStats
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching projects",
      error: error.message
    });
  }
};

// Get user's activity summary
exports.getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recent tasks assigned to user
    const recentAssignedTasks = await Task.find({ assignedTo: userId })
      .populate("projectId", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent tasks created by user
    const recentCreatedTasks = await Task.find({ createdBy: userId })
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get active sprints user is part of
    const activeSprints = await Sprint.find({
      status: "active"
    })
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      message: "Activity fetched successfully",
      recentAssignedTasks,
      recentCreatedTasks,
      activeSprints
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching activity",
      error: error.message
    });
  }
};
