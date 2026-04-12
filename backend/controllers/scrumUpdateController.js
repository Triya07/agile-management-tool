const Project = require("../models/Project");
const ScrumUpdate = require("../models/ScrumUpdate");

async function getAccessibleProjectIds(userId) {
  const projects = await Project.find({
    $or: [{ createdBy: userId }, { members: userId }]
  }).select("_id");

  return projects.map(project => project._id);
}

exports.getScrumUpdates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query;

    let projectIds = await getAccessibleProjectIds(userId);

    if (projectId) {
      const matches = projectIds.some(id => id.toString() === projectId);
      if (!matches) {
        return res.status(403).json({ message: "Not authorized to access updates for this project" });
      }
      projectIds = [projectId];
    }

    const updates = await ScrumUpdate.find({ projectId: { $in: projectIds } })
      .populate("author", "name role email")
      .populate("projectId", "name type")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: "Error fetching scrum updates", error: error.message });
  }
};

exports.createScrumUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, yesterday, today, blockers } = req.body;

    if (!projectId || !yesterday?.trim() || !today?.trim()) {
      return res.status(400).json({ message: "projectId, yesterday, and today are required" });
    }

    const projectIds = await getAccessibleProjectIds(userId);
    const hasAccess = projectIds.some(id => id.toString() === projectId);

    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized to post updates for this project" });
    }

    const update = await ScrumUpdate.create({
      projectId,
      author: userId,
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers?.trim() || ""
    });

    const populatedUpdate = await update.populate([
      { path: "author", select: "name role email" },
      { path: "projectId", select: "name type" }
    ]);

    res.status(201).json({
      message: "Scrum update posted successfully",
      update: populatedUpdate
    });
  } catch (error) {
    res.status(500).json({ message: "Error posting scrum update", error: error.message });
  }
};
