// Initialize kanban board with API data
let activeProject = null;
let tasks = [];
let assignableMembers = [];
let currentUser = null;
const columns = ['todo', 'inprogress', 'review', 'blocked', 'done'];

function getTaskAssigneeNames(task) {
  if (Array.isArray(task?.assignedUsers) && task.assignedUsers.length > 0) {
    return task.assignedUsers.map((user) => user?.name || "Unknown");
  }

  if (task?.assignedTo) {
    return [task.assignedTo.name || "Unknown"];
  }

  return [];
}

// Load data from API
async function initializeBoard() {
  try {
    // Check if user is logged in
    currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }

    // Get projects
    const projectsResponse = await getProjects();
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse.data || []);
    
    // Find or select active project (kanban type)
    const { projectId: activeProjectId } = getActiveContext();
    activeProject = projects.find(p => p._id === activeProjectId && p.type === "kanban") || 
                    projects.find(p => p.type === "kanban");

    if (!activeProject) {
      alert("No Kanban projects found. Please create one first.");
      window.location.href = "projects.html";
      return;
    }

    setActiveContext({ projectId: activeProject._id, projectType: "kanban" });
    await loadAssignableMembers();

    // Get all tasks for this project (not sprint-scoped for kanban)
    const tasksResponse = await getProjectTasks(activeProject._id);
    tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse.data || []);

    // Update title
    document.querySelector('.kanban-title').textContent = `${activeProject.name} - Kanban Board`;

    renderBoard();
  } catch (error) {
    console.error("Error initializing board:", error);
    alert("Failed to load board: " + error.message);
  }
}

// Render kanban board
function renderBoard() {
  const board = document.querySelector('.board');
  board.innerHTML = '';

  const columnNames = {
    'todo': 'To Do',
    'inprogress': 'In Progress',
    'review': 'Review',
    'blocked': 'Blocked',
    'done': 'Done'
  };

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.dataset.status = col;

    const colTasks = tasks.filter(t => t.status === col);
    const taskCount = colTasks.length;

    colDiv.innerHTML = `
      <div class="column-header">
        <span class="column-title">${columnNames[col]}</span>
        <span class="task-count">${taskCount}</span>
      </div>
    `;

    colTasks.forEach(task => {
      const taskCard = document.createElement('div');
      taskCard.className = 'task-card';
      taskCard.draggable = true;
      taskCard.dataset.id = task._id;

      const assigneeNames = getTaskAssigneeNames(task);

      taskCard.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-description">${task.description || ''}</div>
        <div class="task-assignee">Assigned to: ${assigneeNames.length ? assigneeNames.join(", ") : "Unassigned"}</div>
      `;

      taskCard.addEventListener('dragstart', onDragStart);
      taskCard.addEventListener('dragend', onDragEnd);
      colDiv.appendChild(taskCard);
    });

    const canCreateTask = currentUser && currentUser.role === "manager";
    if (canCreateTask) {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-task-btn';
      addBtn.textContent = '+ Add Task';
      addBtn.onclick = () => openAddTaskModal(col);
      colDiv.appendChild(addBtn);
    }

    colDiv.addEventListener('dragover', onDragOver);
    colDiv.addEventListener('drop', (e) => onDrop(e, col));

    board.appendChild(colDiv);
  });
}

// Drag & Drop handlers
let draggedTaskId = null;
let draggedFromStatus = null;

function onDragStart(e) {
  draggedTaskId = e.target.closest('.task-card')?.dataset.id;
  draggedFromStatus = e.target.closest('.column')?.dataset.status;
  e.target.closest('.task-card').style.opacity = '0.5';
}

function onDragEnd(e) {
  e.target.closest('.task-card').style.opacity = '1';
}

function onDragOver(e) {
  e.preventDefault();
}

async function onDrop(e, toStatus) {
  e.preventDefault();
  
  if (!draggedTaskId) return;

  try {
    // Update task status in API
    const response = await updateTaskStatus(draggedTaskId, toStatus);
    
    // Update local tasks - handle both direct response and .task property
    const task = tasks.find(t => t._id === draggedTaskId);
    if (task) {
      task.status = toStatus;
    }

    draggedTaskId = null;
    draggedFromStatus = null;
    renderBoard();
  } catch (error) {
    console.error("API Error:", error);
    alert("Failed to update task: " + error.message);
    // Reset drag state on error
    draggedTaskId = null;
    draggedFromStatus = null;
  }
}

// Modal for adding task
function openAddTaskModal(status) {
  const modal = document.getElementById("kanbanAddTaskModal");
  const statusInput = document.getElementById("kanbanTaskStatusInput");
  const titleInput = document.getElementById("kanbanTaskTitleInput");
  const descInput = document.getElementById("kanbanTaskDescriptionInput");
  const assigneeInput = document.getElementById("kanbanTaskAssigneeInput");

  if (!modal || !statusInput || !titleInput || !descInput || !assigneeInput) return;

  statusInput.value = status;
  titleInput.value = "";
  descInput.value = "";
  Array.from(assigneeInput.options).forEach((option) => { option.selected = false; });
  modal.style.display = "flex";
  titleInput.focus();
}

async function addTaskToColumn(title, description, status, assignedTo = null) {
  try {
    await ensureAssigneeInProject(assignedTo);

    const newTask = await createTask(
      title,
      description,
      assignedTo,
      null,  // no sprint ID
      activeProject._id,
      'medium',
      null,  // no due date
      status  // IMPORTANT: pass the selected column status here!
    );

    tasks.push(newTask.task || newTask);
    renderBoard();
    alert("Task added successfully!");
  } catch (error) {
    alert("Failed to create task: " + error.message);
  }
}

async function loadAssignableMembers() {
  try {
    if (!activeProject || !activeProject._id) return;
    const directoryMembers = await getMemberDirectory();
    const members = Array.isArray(directoryMembers) ? directoryMembers : [];
    const selfId = String(currentUser?.id || currentUser?._id || "");

    assignableMembers = members
      .filter(member => member && member._id && String(member._id) !== selfId)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const assigneeInput = document.getElementById("kanbanTaskAssigneeInput");
    if (!assigneeInput) return;

    assigneeInput.innerHTML = "";
    assignableMembers.forEach((member) => {
      const option = document.createElement("option");
      option.value = member._id;
      option.textContent = `${member.name || "Unknown"}${member.email ? ` (${member.email})` : ""}`;
      assigneeInput.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load assignable members:", error);

    // Fallback to project members if global directory is unavailable
    try {
      const project = await getProject(activeProject._id);
      const members = Array.isArray(project?.members) ? project.members : [];
      const selfId = String(currentUser?.id || currentUser?._id || "");
      assignableMembers = members
        .filter(member => member && member._id && String(member._id) !== selfId)
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

      const assigneeInput = document.getElementById("kanbanTaskAssigneeInput");
      if (!assigneeInput) return;

      assigneeInput.innerHTML = "";
      assignableMembers.forEach((member) => {
        const option = document.createElement("option");
        option.value = member._id;
        option.textContent = `${member.name || "Unknown"}${member.email ? ` (${member.email})` : ""}`;
        assigneeInput.appendChild(option);
      });
    } catch (fallbackError) {
      console.error("Fallback member loading failed:", fallbackError);
    }
  }
}

async function ensureAssigneeInProject(assigneeId) {
  if (!activeProject || !activeProject._id) return;
  if (!currentUser || currentUser.role !== "manager") return;
  const assigneeIds = Array.isArray(assigneeId)
    ? assigneeId.filter(Boolean)
    : (assigneeId ? [assigneeId] : []);
  if (!assigneeIds.length) return;

  const project = await getProject(activeProject._id);
  const memberIds = (Array.isArray(project?.members) ? project.members : []).map((member) =>
    String(member && member._id ? member._id : member)
  );

  for (const id of assigneeIds) {
    if (!memberIds.includes(String(id))) {
      await addProjectMember(activeProject._id, id);
    }
  }
}

document.getElementById("kanbanCancelTaskBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("kanbanAddTaskModal");
  if (modal) modal.style.display = "none";
});

document.getElementById("kanbanSaveTaskBtn")?.addEventListener("click", async () => {
  const title = document.getElementById("kanbanTaskTitleInput")?.value.trim();
  const description = document.getElementById("kanbanTaskDescriptionInput")?.value.trim() || "";
  const status = document.getElementById("kanbanTaskStatusInput")?.value || "todo";
  const assignedTo = Array.from(document.getElementById("kanbanTaskAssigneeInput")?.selectedOptions || [])
    .map((option) => option.value)
    .filter(Boolean);

  if (!title) {
    alert("Please enter task title.");
    return;
  }

  await addTaskToColumn(title, description, status, assignedTo);
  const modal = document.getElementById("kanbanAddTaskModal");
  if (modal) modal.style.display = "none";
});

// Sidebar functionality
function navigateTo(page) {
  window.location.href = page;
}

const root = document.documentElement;
const sidebar = document.getElementById('sidebar');
const resizeBtn = document.getElementById('sidebarResizeBtn');

let sidebarState = 'normal';

function setSidebarWidth(width) {
  root.style.setProperty('--sidebar-width', width + 'px');
  localStorage.setItem('sidebarWidth', width);
  
  if (sidebar) {
    sidebar.classList.remove('compact', 'wide');
    if (width <= 250) {
      sidebar.classList.add('compact');
      sidebarState = 'compact';
    } else if (width > 350) {
      sidebar.classList.add('wide');
      sidebarState = 'wide';
    }
  }
}

if (resizeBtn) {
  resizeBtn.addEventListener('click', () => {
    const widths = [220, 400, 300];
    const currentWidth = parseInt(root.style.getPropertyValue('--sidebar-width') || '300');
    const nextWidth = widths[(widths.indexOf(currentWidth) + 1) % widths.length];
    
    if (nextWidth === 400) {
      setSidebarWidth(400);
    } else {
      setSidebarWidth(220);
    }
  });
}

// Initialize on page load
initializeBoard();
