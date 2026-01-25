const Project = require("../models/Project");

// CREATE PROJECT (Manager only)
exports.createProject = async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Only managers can create projects" });
    }

    const { name, description } = req.body;

    const project = await Project.create({
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({
      message: "Project created",
      project
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL PROJECTS
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate("createdBy", "name role");
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
