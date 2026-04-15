const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");

function toPoints(task) {
  return Number(task.storyPoints) > 0 ? Number(task.storyPoints) : 1;
}

function createDateRange(startDate, endDate) {
  const days = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  cursor.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function sumTaskPoints(tasks) {
  return tasks.reduce((sum, task) => sum + toPoints(task), 0);
}

async function verifyProjectAccess(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) {
    return { error: { status: 404, message: "Project not found" } };
  }

  const isAuthorized = project.createdBy.toString() === userId ||
    project.members.some(member => member.toString() === userId);

  if (!isAuthorized) {
    return { error: { status: 403, message: "Not authorized to access this project" } };
  }

  return { project };
}

exports.getProjectAgileMetrics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const access = await verifyProjectAccess(projectId, userId);
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const [sprints, tasks] = await Promise.all([
      Sprint.find({ projectId }).sort({ startDate: 1 }),
      Task.find({ projectId })
    ]);

    const backlogTasks = tasks.filter(task => !task.sprint);
    const totalBacklogPoints = backlogTasks.reduce((sum, task) => sum + toPoints(task), 0);
    const statusBreakdown = {
      todo: tasks.filter(task => task.status === "todo").length,
      inprogress: tasks.filter(task => task.status === "inprogress").length,
      review: tasks.filter(task => task.status === "review").length,
      blocked: tasks.filter(task => task.status === "blocked" || task.isBlocked).length,
      done: tasks.filter(task => task.status === "done").length
    };

    const sprintSummaries = sprints.map(sprint => {
      const sprintTasks = tasks.filter(task => String(task.sprint) === String(sprint._id));
      const committedPoints = sumTaskPoints(sprintTasks);
      const completedTasks = sprintTasks.filter(task => {
        if (task.status !== "done") {
          return false;
        }
        const doneDate = task.completedAt ? new Date(task.completedAt) : new Date(task.updatedAt);
        return doneDate <= new Date(sprint.endDate);
      });

      const completedPoints = sumTaskPoints(completedTasks);

      const carryOverPoints = Math.max(committedPoints - completedPoints, 0);
      const completionRate = committedPoints > 0
        ? Math.round((completedPoints / committedPoints) * 100)
        : 0;

      const dayRange = createDateRange(sprint.startDate, sprint.endDate);
      const burndown = dayRange.map(day => {
        const remainingPoints = sprintTasks.reduce((sum, task) => {
          const doneDate = task.status === "done"
            ? new Date(task.completedAt || task.updatedAt)
            : null;

          const isDoneByDay = doneDate && doneDate <= day;
          return isDoneByDay ? sum : sum + toPoints(task);
        }, 0);

        return {
          date: day.toISOString().split("T")[0],
          remainingPoints
        };
      });

      return {
        sprintId: sprint._id,
        sprintName: sprint.sprintName,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        totalTasks: sprintTasks.length,
        completedTaskCount: completedTasks.length,
        committedPoints,
        completedPoints,
        carryOverPoints,
        completionRate,
        burndown
      };
    });

    const completedSprintSummaries = sprintSummaries.filter(summary => summary.status === "completed");
    const velocityHistory = completedSprintSummaries.map(summary => ({
      sprintId: summary.sprintId,
      sprintName: summary.sprintName,
      completedPoints: summary.completedPoints,
      committedPoints: summary.committedPoints
    }));

    const totalVelocity = completedSprintSummaries.reduce((sum, summary) => sum + summary.completedPoints, 0);
    const averageVelocity = completedSprintSummaries.length > 0
      ? Number((totalVelocity / completedSprintSummaries.length).toFixed(2))
      : 0;

    const activeSprint = sprintSummaries.find(summary => summary.status === "active") || null;
    const latestSprint = sprintSummaries.length > 0 ? sprintSummaries[sprintSummaries.length - 1] : null;
    const latestCompletedSprint = completedSprintSummaries.length > 0
      ? completedSprintSummaries[completedSprintSummaries.length - 1]
      : null;

    let projectedVelocity = 0;
    if (activeSprint) {
      const sprintStart = new Date(activeSprint.startDate);
      const sprintEnd = new Date(activeSprint.endDate);
      const today = new Date();
      const totalSprintDays = Math.max(Math.ceil((sprintEnd - sprintStart) / (1000 * 60 * 60 * 24)) + 1, 1);
      const elapsedDays = Math.min(
        totalSprintDays,
        Math.max(Math.ceil((today - sprintStart) / (1000 * 60 * 60 * 24)) + 1, 1)
      );
      projectedVelocity = Number(((activeSprint.completedPoints / elapsedDays) * totalSprintDays).toFixed(2));
    }

    const completionRateOverall = tasks.length > 0
      ? Math.round((tasks.filter(task => task.status === "done").length / tasks.length) * 100)
      : 0;

    return res.json({
      projectId,
      generatedAt: new Date().toISOString(),
      overview: {
        totalTasks: tasks.length,
        totalSprints: sprints.length,
        completionRate: completionRateOverall,
        completedTasks: tasks.filter(task => task.status === "done").length,
        inProgressTasks: tasks.filter(task => task.status === "inprogress").length,
        blockedTasks: tasks.filter(task => task.status === "blocked" || task.isBlocked).length,
        statusBreakdown
      },
      backlog: {
        totalItems: backlogTasks.length,
        totalPoints: totalBacklogPoints,
        prioritizedItems: backlogTasks.filter(task => task.backlogRank !== null).length
      },
      velocity: {
        averageVelocity,
        history: velocityHistory,
        latestCompletedSprintName: latestCompletedSprint ? latestCompletedSprint.sprintName : null,
        latestCompletedSprintVelocity: velocityHistory.length > 0
          ? velocityHistory[velocityHistory.length - 1].completedPoints
          : 0,
        projectedVelocity,
        completedSprintCount: completedSprintSummaries.length
      },
      activeSprint,
      latestSprint,
      sprints: sprintSummaries
    });
  } catch (error) {
    return res.status(500).json({ message: "Error generating metrics", error: error.message });
  }
};
