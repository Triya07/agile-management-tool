const User = require("../models/User");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const mongoose = require("mongoose");

function normalizeSkills(skills) {
  const rawSkills = Array.isArray(skills) ? skills : (skills ? [skills] : []);
  const seen = new Set();

  return rawSkills
    .flatMap((skill) => String(skill || "").split(","))
    .map((skill) => String(skill || "").trim().replace(/\s+/g, " "))
    .filter((skill) => {
      if (!skill) return false;

      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

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

    // Compute sprint statistics for each sprint
    const sprintsWithStats = await Promise.all(
      sprints.map(async (sprint) => {
        // Get total tasks in this sprint
        const totalTasks = await Task.countDocuments({ sprint: sprint._id });
        
        // Get completed tasks in this sprint
        const completedTasks = await Task.countDocuments({ 
          sprint: sprint._id, 
          status: "done" 
        });
        
        // Get tasks assigned to user in this sprint
        const userTaskCount = await Task.countDocuments({ 
          sprint: sprint._id, 
          $or: [{ assignedTo: userId }, { assignedUsers: userId }]
        });
        
        // Get completed tasks assigned to user in this sprint
        const userCompletedCount = await Task.countDocuments({ 
          sprint: sprint._id, 
          $or: [{ assignedTo: userId }, { assignedUsers: userId }],
          status: "done" 
        });
        
        return {
          ...sprint.toObject(),
          totalTasks,
          completedTasks,
          userTaskCount,
          userCompletedCount
        };
      })
    );

    // Get tasks assigned to user
    const assignedTasks = await Task.find({ $or: [{ assignedTo: userId }, { assignedUsers: userId }] })
      .populate("projectId", "name")
      .populate("sprint", "sprintName")
      .populate("assignedUsers", "name email")
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
            { assignedUsers: new mongoose.Types.ObjectId(userId) },
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
      sprints: sprintsWithStats,
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

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) userToUpdate.name = name;
    if (email !== undefined) userToUpdate.email = email;
    if (phone !== undefined) userToUpdate.phone = phone;
    if (jobTitle !== undefined) userToUpdate.jobTitle = jobTitle;
    if (department !== undefined) userToUpdate.department = department;
    if (bio !== undefined) userToUpdate.bio = bio;
    if (skills !== undefined) {
      userToUpdate.skills = normalizeSkills(skills);
    }
    if (startDate !== undefined) userToUpdate.startDate = startDate;
    if (avatar !== undefined) userToUpdate.avatar = avatar;

    await userToUpdate.save();
    
    const user = await User.findById(userId).select("-password");

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
        const sprints = project.type === "scrum"
          ? await Sprint.countDocuments({ projectId: project._id })
          : 0;
        const tasks = await Task.countDocuments({ projectId: project._id });
        const tasksAssignedToUser = await Task.countDocuments({
          projectId: project._id,
          $or: [{ assignedTo: userId }, { assignedUsers: userId }]
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
    const accessibleProjects = await Project.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    }).select("_id");

    const projectIds = accessibleProjects.map((project) => project._id);

    // Get recent tasks assigned to user
    const recentAssignedTasks = await Task.find({
      $or: [{ assignedTo: userId }, { assignedUsers: userId }],
      projectId: { $in: projectIds }
    })
      .populate("projectId", "name")
      .populate("createdBy", "name")
      .populate("assignedUsers", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent tasks created by user
    const recentCreatedTasks = await Task.find({
      createdBy: userId,
      projectId: { $in: projectIds }
    })
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get active sprints user is part of
    const activeSprints = await Sprint.find({
      status: "active",
      projectId: { $in: projectIds }
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

// Get all assignable users for assignment UI (all users except current user)
exports.getMemberDirectory = async (req, res) => {
  try {
    if (req.user.role === "manager") {
      const members = await User.find({
        role: "member",
        isDeleted: { $ne: true },
        _id: { $ne: req.user.id }
      })
        .select("name email role department jobTitle createdAt")
        .sort({ name: 1 });

      return res.json({
        message: "Member directory fetched successfully",
        members
      });
    }

    const sharedProjects = await Project.find({
      $or: [
        { createdBy: req.user.id },
        { members: req.user.id }
      ]
    }).select("createdBy members");

    const memberIds = new Set();
    sharedProjects.forEach((project) => {
      if (project.createdBy) {
        memberIds.add(String(project.createdBy));
      }

      (project.members || []).forEach((memberId) => {
        memberIds.add(String(memberId));
      });
    });

    memberIds.delete(String(req.user.id));

    const members = await User.find({
      _id: { $in: Array.from(memberIds) },
      role: "member",
      isDeleted: { $ne: true }
    })
      .select("name email role department jobTitle createdAt")
      .sort({ name: 1 });

    res.json({
      message: "Member directory fetched successfully",
      members
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching member directory",
      error: error.message
    });
  }
};
