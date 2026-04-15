const { GoogleGenAI } = require("@google/genai");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const User = require("../models/User");

let geminiClient = null;

function hasRealGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return false;
  const normalized = key.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("your_gemini_api_key") || normalized.includes("change_this") || normalized.includes("placeholder")) {
    return false;
  }
  return true;
}

function isGeminiConfigured() {
  return hasRealGeminiKey();
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
    : { $or: [{ assignedTo: userId }, { assignedUsers: userId }, { createdBy: userId }] };

  if (activeSprint) {
    taskFilter.sprint = activeSprint._id;
  }

  const tasks = await Task.find(taskFilter)
    .populate("assignedTo", "name")
    .populate("assignedUsers", "name")
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
    assignedTo: (Array.isArray(task.assignedUsers) && task.assignedUsers.length > 0)
      ? task.assignedUsers.map((user) => user.name).join(", ")
      : (task.assignedTo ? task.assignedTo.name : "Unassigned"),
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

function formatItems(items, max = 3) {
  if (!Array.isArray(items) || items.length === 0) return "none";
  return items.slice(0, max).map((item) => `- ${item.title || item.name || item}`).join("\n");
}

function generateLocalFallbackReply(messages, contextSnapshot) {
  const userMessage = Array.isArray(messages) && messages.length
    ? messages[messages.length - 1].content.toLowerCase()
    : "";

  const projectName = contextSnapshot.activeProject?.name || null;
  const stats = contextSnapshot.taskStats || { total: 0, todo: 0, inprogress: 0, blocked: 0, review: 0, done: 0 };
  const tasks = Array.isArray(contextSnapshot.recentTasks) ? contextSnapshot.recentTasks : [];
  const sprint = contextSnapshot.activeSprint;
  const allProjects = Array.isArray(contextSnapshot.accessibleProjects) ? contextSnapshot.accessibleProjects : [];

  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "inprogress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const lines = [];

  // Summarize sprint progress
  if (
    userMessage.includes("sprint") &&
    (userMessage.includes("progress") || userMessage.includes("status") || userMessage.includes("summary"))
  ) {
    if (!projectName && allProjects.length > 0) {
      lines.push(`📊 No project selected. Available projects:`);
      allProjects.forEach((p) => {
        lines.push(`  • ${p.name} (${p.type})`);
      });
      lines.push(`\nTry asking about a specific project.`);
      return lines.join("\n");
    }

    if (sprint) {
      lines.push(`📊 Sprint Progress: "${sprint.name}"`);
      lines.push(`Status: ${sprint.status}`);
      lines.push(`Period: ${sprint.startDate} to ${sprint.endDate}`);
      if (sprint.goal) lines.push(`Goal: ${sprint.goal}`);
      lines.push("");
      lines.push(`Task breakdown:`);
      lines.push(`  • Todo: ${stats.todo}`);
      lines.push(`  • In Progress: ${stats.inprogress}`);
      lines.push(`  • Blocked: ${stats.blocked}`);
      lines.push(`  • Done: ${stats.done}`);
      lines.push(`  • Completion: ${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%`);
    } else if (projectName) {
      lines.push(`📊 No active sprint in "${projectName}"`);
      if (contextSnapshot.activeProjectSprints && contextSnapshot.activeProjectSprints.length > 0) {
        lines.push(`\nAvailable sprints:`);
        contextSnapshot.activeProjectSprints.slice(0, 5).forEach((s) => {
          lines.push(`  • ${s.name} (${s.status})`);
        });
      } else {
        lines.push(`\nNo sprints found. You may need to create one.`);
      }
      
      if (stats.total > 0) {
        lines.push(`\nBacklog tasks: ${stats.total}`);
        lines.push(`  • Todo: ${stats.todo}`);
        lines.push(`  • In Progress: ${stats.inprogress}`);
        lines.push(`  • Blocked: ${stats.blocked}`);
      }
    } else {
      lines.push("No project selected. Please select a project first.");
    }
    return lines.join("\n");
  }

  // Show blocked tasks
  if (userMessage.includes("blocked") || userMessage.includes("stuck") || userMessage.includes("blocker")) {
    if (blockedTasks.length > 0) {
      lines.push(`🚫 Blocked Tasks (${blockedTasks.length}):`);
      blockedTasks.forEach((t) => {
        lines.push(`  • ${t.title}`);
        if (t.blockedReason) lines.push(`    Reason: ${t.blockedReason}`);
        if (t.assignedTo) lines.push(`    Assigned to: ${t.assignedTo}`);
      });
    } else {
      lines.push("✅ No blocked tasks! Great work!");
    }
    return lines.join("\n");
  }

  // Summarize tasks / my work / what I'm doing
  if (
    userMessage.includes("task") ||
    userMessage.includes("what am i working on") ||
    userMessage.includes("what should") ||
    userMessage.includes("my work") ||
    userMessage.includes("assignment") ||
    (userMessage.includes("summarize") && !userMessage.includes("sprint")) ||
    (userMessage.includes("show") && !userMessage.includes("sprint"))
  ) {
    lines.push(`📋 Your Tasks`);
    if (projectName) lines.push(`Project: ${projectName}`);
    lines.push("");
    
    if (stats.total === 0) {
      lines.push("No tasks assigned or created yet.");
      return lines.join("\n");
    }

    lines.push(`Total: ${stats.total} tasks`);
    lines.push(`  • Todo: ${stats.todo}`);
    lines.push(`  • In Progress: ${stats.inprogress}`);
    lines.push(`  • Blocked: ${stats.blocked}`);
    lines.push(`  • Done: ${stats.done}`);
    lines.push("");

    if (inProgressTasks.length > 0) {
      lines.push(`Currently Working On (${inProgressTasks.length}):`);
      inProgressTasks.slice(0, 5).forEach((t) => {
        lines.push(`  • ${t.title}${t.priority ? ` [${t.priority}]` : ""}`);
      });
      lines.push("");
    }

    if (todoTasks.length > 0) {
      lines.push(`To Do (${todoTasks.length}):`);
      todoTasks.slice(0, 5).forEach((t) => {
        lines.push(`  • ${t.title}${t.priority ? ` [${t.priority}]` : ""}`);
      });
      lines.push("");
    }

    if (blockedTasks.length > 0) {
      lines.push(`Issues (${blockedTasks.length}):`);
      blockedTasks.slice(0, 3).forEach((t) => {
        lines.push(`  ⚠️ ${t.title}${t.blockedReason ? ` - ${t.blockedReason}` : ""}`);
      });
    }

    return lines.join("\n");
  }

  // Suggest priorities / recommendations
  if (
    userMessage.includes("priorit") ||
    userMessage.includes("next") ||
    userMessage.includes("recommend") ||
    userMessage.includes("what should i do") ||
    userMessage.includes("suggest")
  ) {
    lines.push(`🎯 Recommended Priorities:`);
    lines.push("");

    if (blockedTasks.length > 0) {
      lines.push("1️⃣ URGENT - Unblock these tasks:");
      blockedTasks.slice(0, 3).forEach((t) => {
        lines.push(`   • ${t.title}${t.blockedReason ? ` (${t.blockedReason})` : ""}`);
      });
      lines.push("");
    }

    if (todoTasks.length > 0) {
      lines.push("2️⃣ Start these tasks:");
      todoTasks.slice(0, 3).forEach((t) => {
        lines.push(`   • ${t.title}${t.priority ? ` [${t.priority}]` : ""}`);
      });
      lines.push("");
    }

    if (inProgressTasks.length > 0) {
      lines.push("3️⃣ Finish these tasks:");
      inProgressTasks.slice(0, 3).forEach((t) => {
        lines.push(`   • ${t.title}${t.assignedTo ? ` (${t.assignedTo})` : ""}`);
      });
    }

    if (blockedTasks.length === 0 && todoTasks.length === 0 && inProgressTasks.length === 0) {
      lines.push("All tasks are complete! Great job! 🎉");
    }
    return lines.join("\n");
  }

  // Project status
  if (userMessage.includes("project") || userMessage.includes("status")) {
    if (projectName) {
      lines.push(`📌 Project: ${projectName}`);
      if (contextSnapshot.activeProject) {
        lines.push(`Type: ${contextSnapshot.activeProject.type || "unknown"}`);
        lines.push(`Team size: ${contextSnapshot.activeProject.memberCount || 0}`);
      }
    } else {
      lines.push("No active project. Available projects:");
      allProjects.slice(0, 5).forEach((p) => {
        lines.push(`  • ${p.name} (${p.type})`);
      });
      lines.push("");
      lines.push("Select a project to view its details.");
      return lines.join("\n");
    }

    if (sprint) {
      lines.push(`\nActive Sprint: ${sprint.name}`);
      lines.push(`Status: ${sprint.status}`);
    } else {
      lines.push("\nNo active sprint.");
    }

    lines.push(`\nTask Statistics:`);
    lines.push(`  • Total: ${stats.total}`);
    lines.push(`  • Done: ${stats.done} (${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%)`);
    lines.push(`  • In Progress: ${stats.inprogress}`);
    lines.push(`  • Blocked: ${stats.blocked}`);
    return lines.join("\n");
  }

  // Team performance / velocity
  if (userMessage.includes("team") || userMessage.includes("velocity") || userMessage.includes("progress")) {
    lines.push(`👥 Team Progress`);
    if (projectName) lines.push(`Project: ${projectName}`);
    lines.push("");
    lines.push(`Completion Rate: ${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%`);
    lines.push(`Tasks Completed: ${stats.done} / ${stats.total}`);
    lines.push(`Currently Working: ${stats.inprogress} tasks`);
    lines.push(`Blockers: ${stats.blocked} tasks`);

    if (stats.total > 0) {
      const completionRate = Math.round((stats.done / stats.total) * 100);
      if (completionRate > 80) {
        lines.push("\n✨ Excellent progress! Keep it up!");
      } else if (completionRate > 50) {
        lines.push("\n📈 Good pace. Focus on unblocking any stuck tasks.");
      } else {
        lines.push("\n⏱️ There's still work to do. Prioritize blocked tasks.");
      }
    }
    return lines.join("\n");
  }

  // Default intelligent response - handle ANY question
  if (!projectName && allProjects.length > 0) {
    lines.push(`Hi! 👋 I'm your FlowBoard AI Assistant.`);
    lines.push(`\nI can help with your agile projects. You have ${allProjects.length} project(s):`);
    allProjects.forEach((p) => {
      lines.push(`  • ${p.name} (${p.type})`);
    });
    lines.push(`\nTry mentioning a project name in your question, or I can help with:`);
    lines.push(`  • Sprint progress and goals`);
    lines.push(`  • Blocked tasks and issues`);
    lines.push(`  • Your priority tasks `);
    lines.push(`  • Team performance`);
    return lines.join("\n");
  }

  lines.push(`📊 Project Summary`);
  if (projectName) {
    lines.push(`Project: ${projectName}`);
  }
  lines.push("");
  
  if (stats.total === 0) {
    lines.push("No tasks in this project yet. Try creating some!");
  } else {
    lines.push(`Tasks: ${stats.total} total`);
    lines.push(`  ✅ Done: ${stats.done}`);
    lines.push(`  🔄 In Progress: ${stats.inprogress}`);
    lines.push(`  📝 Todo: ${stats.todo}`);
    lines.push(`  🚫 Blocked: ${stats.blocked}`);
    lines.push(`  👀 Review: ${stats.review}`);
    
    const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    lines.push(`\n📈 Progress: ${completionRate}%`);
  }

  if (sprint) {
    lines.push(`\n📌 Active Sprint: ${sprint.name}`);
  } else if (contextSnapshot.activeProjectSprints && contextSnapshot.activeProjectSprints.length > 0) {
    lines.push(`\n📌 Available sprints: ${contextSnapshot.activeProjectSprints.slice(0, 3).map((s) => s.name).join(", ")}`);
  }

  lines.push("");
  lines.push("I can help with:");
  lines.push("  📅 Sprint progress");
  lines.push("  🚫 Blocked tasks");
  lines.push("  ⭐ Priorities");
  lines.push("  👥 Team status");

  return lines.join("\n");
}


exports.getAIStatus = async (req, res) => {
  const configured = isGeminiConfigured();
  res.json({
    enabled: true,
    provider: configured ? "gemini" : "local-fallback",
    model: configured ? (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite") : "fallback"
  });
};

exports.chatWithAI = async (req, res) => {
  let contextSnapshot = {};
  try {
    const { messages, context } = req.body || {};

    let resolvedContext = { ...context };
    if (!resolvedContext.projectId && messages?.length) {
      const lastMsg = messages[messages.length - 1].content.toLowerCase();
      const allProjects = await loadAccessibleProjects(req.user.id);

      const mentioned = allProjects.find((p) =>
        lastMsg.includes(p.name.toLowerCase())
      );
      if (mentioned) resolvedContext.projectId = mentioned._id.toString();
    }

    contextSnapshot = await buildContextSnapshot(req.user.id, resolvedContext);

    if (!isGeminiConfigured()) {
      const reply = generateLocalFallbackReply(messages, contextSnapshot);
      return res.json({
        reply,
        provider: "local-fallback",
        model: "fallback"
      });
    }

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
    const { messages } = req.body || {};
    const fallbackReply = generateLocalFallbackReply(messages, contextSnapshot);

    res.json({
      reply: fallbackReply,
      provider: "local-fallback",
      model: "fallback",
      error: error.message
    });
  }
};
