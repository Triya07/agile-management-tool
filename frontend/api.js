// API utility functions for authenticated requests

const API_BASE_URL = "http://localhost:5000/api";

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
  const role = normalizeUserRole((user && user.role) || localStorage.getItem("userRole"));

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

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    applyRoleBasedSidebarNav();
    applySidebarContentOffset();
  });
}

// Generic fetch wrapper with auth
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    // Handle unauthorized
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "API error");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// PROJECT ENDPOINTS
async function getProjects() {
  return apiCall("/projects");
}

async function getProject(projectId) {
  return apiCall(`/projects/${projectId}`);
}

async function createProject(name, description, type = "scrum") {
  return apiCall("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description, type })
  });
}

async function addProjectMember(projectId, userId) {
  return apiCall(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId })
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
