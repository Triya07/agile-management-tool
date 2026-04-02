const { GoogleGenAI } = require("@google/genai");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const User = require("../models/User");

let geminiClient = null;

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getGeminiClient() {
  if (geminiClient) return geminiClient;

  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  return geminiClient;
}

async function loadAccessibleProject(projectId, userId) {
  if (!projectId) return null;

  const project = await Project.findById(projectId)
    .populate("createdBy", "name email role")
    .populate("members", "name email role");

  if (!project) return null;

  const isAuthorized = project.createdBy._id.toString() === userId ||
    project.members.some((member) => member._id.toString() === userId);

  return isAuthorized ? project : null;
}

async function loadAccessibleProjects(userId) {
  return Project.find({
    $or: [
      { createdBy: userId },
      { members: userId }
    ]
  })
    .populate("createdBy", "name email role")
    .populate("members", "name email role")
    .sort({ updatedAt: -1, createdAt: -1 });
}

async function buildContextSnapshot(userId, context = {}) {
  const user = await User.findById(userId).select("name email role");
  const activeProject = await loadAccessibleProject(context.projectId, userId);
  const accessibleProjects = activeProject
    ? [activeProject]
    : await loadAccessibleProjects(userId);

  let activeSprint = null;
  if (context.sprintId && activeProject) {
    activeSprint = await Sprint.findOne({
      _id: context.sprintId,
      projectId: activeProject._id
    });
  }

  const accessibleProjectIds = accessibleProjects.map((project) => project._id);
  const taskFilter = accessibleProjectIds.length > 0
    ? { projectId: { $in: accessibleProjectIds } }
    : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

  if (activeSprint) {
    taskFilter.sprint = activeSprint._id;
  }

  const tasks = await Task.find(taskFilter)
    .populate("assignedTo", "name")
    .populate("createdBy", "name")
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30);

  const activeProjectSprints = activeProject
    ? await Sprint.find({ projectId: activeProject._id })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(8)
    : [];

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    inprogress: tasks.filter((task) => task.status === "inprogress").length,
    review: tasks.filter((task) => task.status === "review").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    done: tasks.filter((task) => task.status === "done").length
  };

  const recentTasks = tasks.slice(0, 12).map((task) => ({
    title: task.title,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId ? task.projectId.toString() : null,
    assignedTo: task.assignedTo ? task.assignedTo.name : "Unassigned",
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    blockedReason: task.blockedReason || null
  }));

  const accessibleProjectSummaries = accessibleProjects.slice(0, 10).map((project) => ({
    id: project._id.toString(),
    name: project.name,
    type: project.type,
    memberCount: project.members.length
  }));

  return {
    user: user
      ? { name: user.name, email: user.email, role: user.role }
      : null,
    currentPage: context.currentPage || null,
    activeProject: activeProject
      ? {
          id: activeProject._id.toString(),
          name: activeProject.name,
          description: activeProject.description || "",
          type: activeProject.type,
          memberCount: activeProject.members.length
        }
      : null,
    accessibleProjects: accessibleProjectSummaries,
    activeSprint: activeSprint
      ? {
          id: activeSprint._id.toString(),
          name: activeSprint.sprintName,
          goal: activeSprint.sprintGoal || "",
          status: activeSprint.status,
          startDate: activeSprint.startDate ? activeSprint.startDate.toISOString().slice(0, 10) : null,
          endDate: activeSprint.endDate ? activeSprint.endDate.toISOString().slice(0, 10) : null
        }
      : null,
    activeProjectSprints: activeProjectSprints.map((sprint) => ({
      id: sprint._id.toString(),
      name: sprint.sprintName,
      status: sprint.status,
      startDate: sprint.startDate ? sprint.startDate.toISOString().slice(0, 10) : null,
      endDate: sprint.endDate ? sprint.endDate.toISOString().slice(0, 10) : null
    })),
    taskStats,
    recentTasks
  };
}

function buildPrompt(messages, contextSnapshot) {
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((message) => message && typeof message.content === "string")
        .slice(-10)
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content.trim()
        }))
        .filter((message) => message.content)
    : [];

  const transcript = safeMessages.length
    ? safeMessages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n\n")
    : "USER: Hello";

  return `
You are FlowBoard's Gemini assistant for an agile management application.

Rules:
- Answer using only the provided application context and the user's question.
- If the context does not include the answer, say that clearly and suggest a practical next step.
- Be concise, accurate, and helpful.
- Do not invent tasks, users, dates, sprint status, or project details.
- When summarizing work, call out blocked tasks and urgent priorities first.

Application context:
${JSON.stringify(contextSnapshot, null, 2)}

Conversation:
${transcript}

Reply as the assistant.
`.trim();
}

function extractReply(response) {
  if (!response) return "";
  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text;
}

exports.getAIStatus = async (req, res) => {
  res.json({
    enabled: isGeminiConfigured(),
    provider: isGeminiConfigured() ? "gemini" : null,
    model: isGeminiConfigured() ? (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite") : null
  });
};

exports.chatWithAI = async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({
        message: "Gemini chatbot is not configured. Add GEMINI_API_KEY to the backend .env file."
      });
    }

    const { messages, context } = req.body || {};
    const contextSnapshot = await buildContextSnapshot(req.user.id, context || {});
    const prompt = buildPrompt(messages, contextSnapshot);
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model,
      contents: prompt
    });

    const reply = extractReply(response) || "I could not generate a response.";

    res.json({
      reply,
      provider: "gemini",
      model
    });
  } catch (error) {
    const status = error.status || error.code || 500;
    let message = "Gemini chat request failed";

    if (error.message && error.message.includes("GEMINI_API_KEY")) {
      message = "Gemini API key is missing or invalid.";
    } else if (status === 429) {
      message = "Gemini rate limit reached. Please try again in a moment.";
    } else if (status === 400) {
      message = "Gemini rejected the request. Please try a shorter message.";
    } else if (error.message) {
      message = error.message;
    }

    res.status(typeof status === "number" ? status : 500).json({ message });
  }
};
