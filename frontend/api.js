// API utility functions for authenticated requests

// Theme Initialization
(function() {
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = storedTheme || (prefersDark ? 'dark' : 'light');

  if (theme === 'dark') {
    document.documentElement.style.background = '#0f172a';
    if (document.body) {
      document.body.classList.add('dark');
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.classList.add('dark'));
    }
  }
})();
const PRIMARY_API_BASE_URL = (() => {
  const fromStorage = localStorage.getItem("API_BASE_URL");
  if (fromStorage && /^https?:\/\//i.test(fromStorage)) {
    return fromStorage.replace(/\/+$/, "");
  }

  const { protocol, hostname, port, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal) {
    if (port === "5000") return `${origin}/api`;
    return `${protocol}//${hostname}:5000/api`;
  }

  return `${origin}/api`;
})();

function getApiBaseCandidates() {
  const candidates = [
    PRIMARY_API_BASE_URL,
    "http://localhost:5000/api",
    "http://127.0.0.1:5000/api"
  ];

  return [...new Set(candidates)];
}

// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// Get current user from localStorage
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// Unified project/sprint context helpers
function getActiveContext() {
  return {
    projectId: localStorage.getItem("currentProjectId") || localStorage.getItem("activeProject") || null,
    sprintId: localStorage.getItem("currentSprintId") || localStorage.getItem("activeSprint") || null,
    projectType: localStorage.getItem("currentProjectType") || null
  };
}

function setActiveContext({ projectId = null, sprintId = null, projectType = null } = {}) {
  if (projectId) {
    localStorage.setItem("currentProjectId", projectId);
    localStorage.setItem("activeProject", projectId);
  }

  if (sprintId) {
    localStorage.setItem("currentSprintId", sprintId);
    localStorage.setItem("activeSprint", sprintId);
  }

  if (projectType) {
    localStorage.setItem("currentProjectType", projectType);
  }
}

function normalizeUserRole(role) {
  if (role === "admin" || role === "manager") return "manager";
  if (role === "member" || role === "worker") return "member";
  return "member";
}

function getCanonicalSidebarItems(role) {
  if (role === "manager") {
    return [
      { label: "Dashboard", page: "dashboard.html" },
      { label: "Projects", page: "projects.html" },
      { label: "Backlog", page: "backlog.html" },
      { label: "Sprints", page: "sprint.html" },
      { label: "Kanban Board", page: "kanban-board.html" },
      { label: "Team", page: "team.html" },
      { label: "Reports", page: "reports.html" },
      { label: "Profile", page: "user-profile.html" },
      { label: "Settings", page: "settings.html" }
    ];
  }

  return [
    { label: "Dashboard", page: "dashboard-team.html" },
    { label: "My Tasks", page: "my-tasks.html" },
    { label: "Sprint Overview", page: "sprint-overview.html" },
    { label: "Scrum Updates", page: "scrum-updates.html" },
    { label: "Sprints", page: "sprint.html" },
    { label: "Kanban Board", page: "kanban-board.html" },
    { label: "Profile", page: "user-profile.html" },
    { label: "Settings", page: "settings.html" }
  ];
}

function applyRoleBasedSidebarNav() {
  const user = getCurrentUser();
  const role = normalizeUserRole(user && user.role);

  const nav = document.querySelector(".sidebar .sidebar-nav");
  if (!nav) return;

  const currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();
  const items = getCanonicalSidebarItems(role);

  nav.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.className = "sidebar-btn" + (currentPage === item.page.toLowerCase() ? " active" : "");
    button.textContent = item.label;
    button.setAttribute("onclick", `window.location.href='${item.page}'`);
    nav.appendChild(button);
  });

  const logoutButton = document.createElement("button");
  logoutButton.className = "sidebar-btn";
  logoutButton.textContent = "Logout";
  logoutButton.setAttribute("onclick", "logout()");
  nav.appendChild(logoutButton);
}

if (typeof window !== "undefined") {
  if (typeof window.navigateTo !== "function") {
    window.navigateTo = function (page) {
      window.location.href = page;
    };
  }

  if (typeof window.logout !== "function") {
    window.logout = function () {
      localStorage.clear();
      window.location.href = "login.html";
    };
  }
}

function applySidebarContentOffset() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"), 10) || sidebar.offsetWidth || 300;
  const mainContainer = document.querySelector(".main-container");
  if (mainContainer) {
    mainContainer.style.marginLeft = `${width}px`;
    mainContainer.style.width = `calc(100% - ${width}px)`;
  }
}

function getUserInitials(user) {
  const base = (user && user.name) || localStorage.getItem("currentUser") || (user && user.email) || "User";
  const clean = String(base).trim();
  if (!clean) return "U";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}

function rectanglesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function adjustGlobalUserAvatarPosition(button) {
  if (!button) return;

  const rootStyles = getComputedStyle(document.documentElement);
  const cssTop = parseInt(rootStyles.getPropertyValue("--global-avatar-top"), 10);
  const cssRight = parseInt(rootStyles.getPropertyValue("--global-avatar-right"), 10);

  let top = Number.isFinite(cssTop) ? cssTop : (window.innerWidth <= 640 ? 12 : 16);
  let right = Number.isFinite(cssRight) ? cssRight : (window.innerWidth <= 640 ? 12 : 20);
  const maxTop = Math.max(16, Math.floor(window.innerHeight * 0.45));

  button.style.top = `${top}px`;
  button.style.right = `${right}px`;

  const interactiveNodes = Array.from(document.querySelectorAll("button, a, input, select, textarea, [role='button'], .btn"));
  let checks = 0;

  while (checks < 8) {
    const avatarRect = button.getBoundingClientRect();
    const hasCollision = interactiveNodes.some((node) => {
      if (!node || node === button || button.contains(node) || node.contains(button)) return false;
      const nodeRect = node.getBoundingClientRect();
      if (nodeRect.width === 0 || nodeRect.height === 0) return false;

      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }

      return rectanglesOverlap(avatarRect, nodeRect);
    });

    if (!hasCollision || top >= maxTop) break;

    top += 56;
    button.style.top = `${top}px`;
    checks += 1;
  }
}

function injectGlobalUserAvatar() {
  const currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();
  if (currentPage === "login.html" || currentPage === "signup.html" || currentPage === "index.html" || currentPage === "user-profile.html") {
    return;
  }

  if (!getToken()) return;

  // Remove legacy per-page avatar buttons so only one consistent control remains.
  document.querySelectorAll(".user-avatar-btn").forEach((node) => node.remove());

  const existing = document.getElementById("global-user-avatar-btn");
  const user = getCurrentUser();
  const initials = getUserInitials(user);
  const fullName = (user && user.name) || localStorage.getItem("currentUser") || "User";

  if (existing) {
    existing.textContent = initials;
    existing.setAttribute("title", `${fullName} - Open profile`);
    adjustGlobalUserAvatarPosition(existing);
    return;
  }

  if (!document.getElementById("global-user-avatar-style")) {
    const style = document.createElement("style");
    style.id = "global-user-avatar-style";
    style.textContent = `
      #global-user-avatar-btn {
        position: fixed;
        top: 16px;
        right: 20px;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.8);
        background: linear-gradient(135deg, #34A0A4, #168AAD);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        cursor: pointer;
        z-index: 1200;
        box-shadow: 0 8px 24px rgba(22, 138, 173, 0.35);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      #global-user-avatar-btn:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow: 0 10px 28px rgba(22, 138, 173, 0.45);
      }

      #global-user-avatar-btn:focus-visible {
        outline: 3px solid rgba(52, 160, 164, 0.35);
        outline-offset: 2px;
      }

      @media (max-width: 640px) {
        #global-user-avatar-btn {
          top: 12px;
          right: 12px;
          width: 42px;
          height: 42px;
          font-size: 0.88rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const button = document.createElement("button");
  button.id = "global-user-avatar-btn";
  button.type = "button";
  button.textContent = initials;
  button.setAttribute("aria-label", "Open profile");
  button.setAttribute("title", `${fullName} - Open profile`);
  button.addEventListener("click", () => {
    window.location.href = "user-profile.html";
  });

  document.body.appendChild(button);
  adjustGlobalUserAvatarPosition(button);

  if (!window.__globalAvatarResizeBound) {
    window.addEventListener("resize", () => {
      const avatar = document.getElementById("global-user-avatar-btn");
      adjustGlobalUserAvatarPosition(avatar);
    });
    window.__globalAvatarResizeBound = true;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    applyRoleBasedSidebarNav();
    applySidebarContentOffset();
    injectGlobalUserAvatar();
  });
}

// Generic fetch wrapper with auth
function clearSessionState() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentProjectId");
  localStorage.removeItem("currentSprintId");
  localStorage.removeItem("activeProject");
  localStorage.removeItem("activeSprint");
  localStorage.removeItem("currentProjectType");
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const apiBases = getApiBaseCandidates();
  let lastError = null;

  for (const apiBase of apiBases) {
    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers
      });

      const raw = await response.text();
      let data = null;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { message: raw };
        }
      }

      if (response.status === 401) {
        clearSessionState();
        const currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();
        if (currentPage !== "login.html" && currentPage !== "signup.html" && currentPage !== "index.html") {
          window.location.href = "login.html";
        }
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error((data && data.message) || `API error (${response.status})`);
      }

      try {
        if (localStorage.getItem("API_BASE_URL") !== apiBase) {
          localStorage.setItem("API_BASE_URL", apiBase);
        }
      } catch (_) {
        // Ignore localStorage write issues and keep the successful response.
      }

      return data;
    } catch (error) {
      lastError = error;
      const isNetworkError = error && (error.name === "TypeError" || String(error.message || "").includes("Failed to fetch"));
      if (!isNetworkError) {
        console.error("API Error:", error);
        throw error;
      }
      // Try next base URL candidate on network-level failure.
    }
  }

  const message = "Cannot reach backend API. Please ensure backend is running on port 5000 and then refresh.";
  console.error("API Error:", lastError || message);
  throw new Error(message);
}

// PROJECT ENDPOINTS
async function getProjects() {
  return apiCall("/projects");
}

async function getProject(projectId) {
  return apiCall(`/projects/${projectId}`);
}

async function createProject(name, description, type = "scrum", memberIds = []) {
  return apiCall("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description, type, memberIds })
  });
}

async function addProjectMember(projectId, userId) {
  return apiCall(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId })
  });
}

async function updateProject(projectId, name, description, type) {
  return apiCall(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, type })
  });
}

// SPRINT ENDPOINTS
async function getProjectSprints(projectId) {
  return apiCall(`/sprints/project?projectId=${projectId}`);
}

async function getAllSprints() {
  return apiCall("/sprints");
}

async function createSprint(sprintName, sprintGoal, startDate, endDate, projectId) {
  return apiCall("/sprints/create", {
    method: "POST",
    body: JSON.stringify({ sprintName, sprintGoal, startDate, endDate, projectId })
  });
}

async function getSprint(sprintId) {
  return apiCall(`/sprints/${sprintId}`);
}

async function updateSprint(sprintId, sprintName, sprintGoal, startDate, endDate, status) {
  return apiCall(`/sprints/${sprintId}`, {
    method: "PUT",
    body: JSON.stringify({ sprintName, sprintGoal, startDate, endDate, status })
  });
}

async function saveSprintRetrospective(sprintId, good, bad, improve, feedback) {
  return apiCall(`/sprints/${sprintId}/retrospective`, {
    method: "POST",
    body: JSON.stringify({ good, bad, improve, feedback })
  });
}

async function getSprintSummary(sprintId) {
  return apiCall(`/sprints/${sprintId}/summary`);
}

// TASK ENDPOINTS
async function getSprintTasks(sprintId, projectId) {
  return apiCall(`/tasks?sprintId=${sprintId}&projectId=${projectId}`);
}

async function getProjectTasks(projectId) {
  return apiCall(`/tasks/project?projectId=${projectId}`);
}

async function getBacklogTasks(projectId) {
  return apiCall(`/tasks/backlog?projectId=${projectId}`);
}

async function getTask(taskId) {
  return apiCall(`/tasks/${taskId}`);
}

async function getUserTasks() {
  return apiCall("/tasks/user/tasks");
}

async function createTask(title, description, assignedTo, sprint, projectId, priority = "medium", dueDate = null, status = "todo") {
  return apiCall("/tasks/create", {
    method: "POST",
    body: JSON.stringify({
      title,
      description,
      assignedTo,
      sprint,
      projectId,
      priority,
      dueDate,
      status
    })
  });
}

async function reorderBacklog(projectId, orderedTaskIds) {
  return apiCall(`/tasks/backlog/${projectId}/rank`, {
    method: "PATCH",
    body: JSON.stringify({ orderedTaskIds })
  });
}

async function moveTask(taskId, sprintId = null) {
  return apiCall(`/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ sprintId })
  });
}

async function updateTaskStatus(taskId, status) {
  return apiCall(`/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

async function updateTask(taskId, title, description, assignedTo, priority, dueDate, status, startDate = undefined) {
  return apiCall(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify({ title, description, assignedTo, priority, dueDate, status, startDate })
  });
}

async function deleteTask(taskId) {
  return apiCall(`/tasks/${taskId}`, {
    method: "DELETE"
  });
}

async function addTaskComment(taskId, text) {
  return apiCall(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

async function getTaskActivityHistory(taskId) {
  return apiCall(`/tasks/${taskId}/activity`);
}

async function toggleTaskBlocked(taskId, isBlocked, blockedReason = "") {
  return apiCall(`/tasks/${taskId}/blocked`, {
    method: "PATCH",
    body: JSON.stringify({ isBlocked, blockedReason })
  });
}

// REPORT ENDPOINTS
async function getProjectAgileMetrics(projectId) {
  return apiCall(`/reports/project/${projectId}/agile-metrics`);
}

// SCRUM UPDATE ENDPOINTS
async function getScrumUpdates(projectId = "") {
  const query = projectId ? `?projectId=${projectId}` : "";
  return apiCall(`/scrum-updates${query}`);
}

async function createScrumUpdate(projectId, yesterday, today, blockers = "") {
  return apiCall("/scrum-updates", {
    method: "POST",
    body: JSON.stringify({ projectId, yesterday, today, blockers })
  });
}

// USER ENDPOINTS
async function getUserProfile() {
  return apiCall("/users/profile");
}

async function getUserDashboard() {
  return apiCall("/users/dashboard");
}

async function updateUserProfile(
  name, email, phone, jobTitle, department, bio, skills, startDate, avatar
) {
  return apiCall("/users/profile", {
    method: "PATCH",
    body: JSON.stringify({ name, email, phone, jobTitle, department, bio, skills, startDate, avatar })
  });
}

async function getUserProjects() {
  return apiCall("/users/projects");
}

async function getUserActivity() {
  return apiCall("/users/activity");
}

async function getMemberDirectory() {
  try {
    const response = await apiCall("/users/members");
    return Array.isArray(response) ? response : (response && response.members ? response.members : []);
  } catch (error) {
    console.warn("Could not fetch /users/members, falling back to project members.", error.message || error);
    return [];
  }
}

// AUTH ACCOUNT ACTIONS
async function changePassword(currentPassword, newPassword) {
  return apiCall("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

async function deleteMyAccount() {
  return apiCall("/auth/me", {
    method: "DELETE"
  });
}

// AI CHAT ENDPOINTS
async function getAIStatus() {
  return apiCall("/ai/status");
}

async function chatWithAI(messages, context = {}) {
  return apiCall("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, context })
  });
}

// Floating Gemini assistant widget for authenticated pages
function injectAIAssistantStyles() {
  if (document.getElementById("ai-assistant-style")) return;

  const style = document.createElement("style");
  style.id = "ai-assistant-style";
  style.textContent = `
    .ai-assistant-toggle {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #0f766e, #0f4c81);
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.3);
      z-index: 1100;
    }

    .ai-assistant-panel {
      position: fixed;
      right: 24px;
      bottom: 96px;
      width: min(440px, calc(100vw - 24px));
      height: min(620px, calc(100vh - 120px));
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 28px 60px rgba(2, 6, 23, 0.35);
      border: 1px solid #dbe4f0;
      display: none;
      z-index: 1100;
    }

    .ai-assistant-panel.open {
      display: grid;
      grid-template-rows: auto 1fr auto;
    }

    .ai-assistant-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(90deg, #06283d, #13678a);
      color: #f8fafc;
      padding: 14px 16px;
      font-weight: 700;
      font-size: 14px;
    }

    .ai-assistant-subtitle {
      display: block;
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 3px;
      font-weight: 500;
    }

    .ai-assistant-close {
      border: none;
      background: transparent;
      color: #f8fafc;
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
    }

    .ai-assistant-messages {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      background: radial-gradient(circle at top, #f8fafc 0%, #ecfeff 55%, #f8fafc 100%);
    }

    .ai-assistant-message {
      border-radius: 12px;
      padding: 10px 12px;
      max-width: 90%;
      white-space: pre-wrap;
      font-size: 13px;
      line-height: 1.45;
    }

    .ai-assistant-message.user {
      align-self: flex-end;
      background: #dbeafe;
      color: #1e3a8a;
    }

    .ai-assistant-message.assistant {
      align-self: flex-start;
      background: #e2f7f1;
      color: #12343b;
    }

    .ai-assistant-message.system {
      align-self: center;
      background: #fef3c7;
      color: #92400e;
      font-size: 12px;
    }

    .ai-assistant-quick {
      padding: 0 14px 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      background: #ffffff;
    }

    .ai-assistant-quick button {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #0f172a;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .ai-assistant-input {
      padding: 12px;
      border-top: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      background: #ffffff;
    }

    .ai-assistant-input textarea {
      resize: none;
      min-height: 42px;
      max-height: 120px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px;
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }

    .ai-assistant-input textarea:focus {
      border-color: #0f766e;
      box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.18);
    }

    .ai-assistant-send {
      border: none;
      border-radius: 10px;
      background: #0f766e;
      color: #fff;
      font-weight: 600;
      width: 86px;
      cursor: pointer;
    }

    .ai-assistant-send:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .ai-assistant-panel {
        right: 12px;
        bottom: 84px;
        width: calc(100vw - 24px);
        height: calc(100vh - 140px);
      }

      .ai-assistant-toggle {
        right: 12px;
        bottom: 12px;
      }
    }
  `;

  document.head.appendChild(style);
}

function shouldLoadAIAssistant() {
  const token = getToken();
  if (!token) return false;

  const allowedPages = ["kanban-board.html", "sprint.html"];
  const currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();
  return allowedPages.includes(currentPage);
}

function createAIAssistantWidget() {
  if (document.getElementById("ai-assistant-toggle")) return;

  injectAIAssistantStyles();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button id="ai-assistant-toggle" class="ai-assistant-toggle" aria-label="Open Gemini Assistant">Gemini</button>
    <section id="ai-assistant-panel" class="ai-assistant-panel" aria-label="Gemini Assistant">
      <header class="ai-assistant-header">
        <div>
          Gemini Agile Assistant
          <span class="ai-assistant-subtitle">Project and sprint aware chatbot</span>
        </div>
        <button id="ai-assistant-close" class="ai-assistant-close" aria-label="Close">&times;</button>
      </header>
      <div id="ai-assistant-messages" class="ai-assistant-messages"></div>
      <div class="ai-assistant-quick" id="ai-assistant-quick"></div>
      <div class="ai-assistant-input">
        <textarea id="ai-assistant-text" placeholder="Ask about your tasks, blockers, sprint progress, or priorities..."></textarea>
        <button id="ai-assistant-send" class="ai-assistant-send">Send</button>
      </div>
    </section>
  `;

  document.body.appendChild(wrapper);

  const toggle = document.getElementById("ai-assistant-toggle");
  const panel = document.getElementById("ai-assistant-panel");
  const close = document.getElementById("ai-assistant-close");
  const messagesEl = document.getElementById("ai-assistant-messages");
  const input = document.getElementById("ai-assistant-text");
  const sendButton = document.getElementById("ai-assistant-send");
  const quickEl = document.getElementById("ai-assistant-quick");

  const history = [];
  appendMessage("system", "AI assistant initialized. Ask about your project, sprint, or task status.");
  let isSending = false;

  function appendMessage(role, content) {
    const message = document.createElement("div");
    message.className = `ai-assistant-message ${role}`;
    message.textContent = content;
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function currentContext() {
    const active = getActiveContext();
    const user = getCurrentUser();
    return {
      currentPage: window.location.pathname.split("/").pop() || "",
      projectId: active.projectId,
      sprintId: active.sprintId,
      userRole: user && user.role ? user.role : null
    };
  }

  function setLoading(loading) {
    isSending = loading;
    sendButton.disabled = loading;
    input.disabled = loading;
    sendButton.textContent = loading ? "..." : "Send";
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    appendMessage("user", trimmed);
    history.push({ role: "user", content: trimmed });
    setLoading(true);

    try {
      const response = await chatWithAI(history.slice(-10), currentContext());
      const aiText = response && response.reply ? response.reply : "I could not generate a response.";
      appendMessage("assistant", aiText);
      history.push({ role: "assistant", content: aiText });
    } catch (error) {
      appendMessage("system", error && error.message ? error.message : "Gemini request failed. Check server and API key configuration.");
    } finally {
      setLoading(false);
      input.focus();
    }
  }

  const quickPrompts = [
    "Summarize my tasks for today",
    "Show blocked tasks",
    "Summarize current sprint progress",
    "Suggest my next 3 priorities"
  ];

  quickPrompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => sendMessage(prompt));
    quickEl.appendChild(button);
  });

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && messagesEl.children.length === 0) {
      appendMessage("assistant", "Hello, I am your Gemini Agile Assistant. Ask me about tasks, blockers, sprint progress, or project status.");
    }
  });

  close.addEventListener("click", () => panel.classList.remove("open"));

  sendButton.addEventListener("click", () => {
    const text = input.value;
    input.value = "";
    sendMessage(text);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = input.value;
      input.value = "";
      sendMessage(text);
    }
  });
}

if (typeof document !== "undefined") {
  function initializeAIAssistant() {
    if (!shouldLoadAIAssistant()) return;

    let shouldCreate = true;
    try {
      getAIStatus().catch((error) => {
        console.warn("AI assistant status check failed:", error && error.message ? error.message : error);
      });
    } catch (error) {
      console.warn("AI assistant status check failed:", error && error.message ? error.message : error);
    }

    if (shouldCreate) {
      createAIAssistantWidget();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAIAssistant);
  } else {
    setTimeout(initializeAIAssistant, 100);
  }
}
