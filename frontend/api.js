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

async function createSprint(sprintName, startDate, endDate, projectId) {
  return apiCall("/sprints/create", {
    method: "POST",
    body: JSON.stringify({ sprintName, startDate, endDate, projectId })
  });
}

// TASK ENDPOINTS
async function getSprintTasks(sprintId, projectId) {
  return apiCall(`/tasks?sprintId=${sprintId}&projectId=${projectId}`);
}

async function getProjectTasks(projectId) {
  return apiCall(`/tasks/project?projectId=${projectId}`);
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

async function updateTaskStatus(taskId, status) {
  return apiCall(`/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

async function deleteTask(taskId) {
  return apiCall(`/tasks/${taskId}`, {
    method: "DELETE"
  });
}

// USER ENDPOINTS
async function getUserProfile() {
  return apiCall("/users/profile");
}

async function getUserDashboard() {
  return apiCall("/users/dashboard");
}

async function updateUserProfile(name, email) {
  return apiCall("/users/profile", {
    method: "PATCH",
    body: JSON.stringify({ name, email })
  });
}

async function getUserProjects() {
  return apiCall("/users/projects");
}

async function getUserActivity() {
  return apiCall("/users/activity");
}
