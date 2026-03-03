const Project = require("../models/Project");

// CREATE PROJECT (Manager only)
exports.createProject = async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Only managers can create projects" });
    }

    const { name, description, type } = req.body;

    const project = await Project.create({
      name,
      description,
      type: type || "scrum",
      createdBy: req.user.id,
      members: [req.user.id]
    });

    res.status(201).json({
      message: "Project created",
      project: await project.populate(["createdBy", "members"])
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL PROJECTS (user-specific - only projects they're part of)
exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    })
      .populate("createdBy", "name role email")
      .populate("members", "name email role")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE PROJECT
exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId)
      .populate("createdBy", "name role email")
      .populate("members", "name email role");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Verify access
    const isAuthorized = project.createdBy._id.toString() === userId || 
                         project.members.some(m => m._id.toString() === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to access this project" });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADD MEMBER TO PROJECT (Manager only)
exports.addMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Only managers can add members" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Verify manager has access to this project
    if (project.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ message: "Only project creator can add members" });
    }

    if (!project.members.some(member => member.toString() === userId)) {
      project.members.push(userId);
      await project.save();
    }

    res.json({
      message: "Member added successfully",
      project: await project.populate(["createdBy", "members"])
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
