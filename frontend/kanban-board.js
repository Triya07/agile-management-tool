// Initialize kanban board with API data
let activeProject = null;
let tasks = [];
const columns = ['todo', 'inprogress', 'done'];

// Load data from API
async function initializeBoard() {
  try {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Get projects
    const projectsResponse = await getProjects();
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse.data || []);
    
    // Find or select active project (kanban type)
    const activeProjectId = localStorage.getItem("activeProject");
    activeProject = projects.find(p => p._id === activeProjectId && p.type === "kanban") || 
                    projects.find(p => p.type === "kanban");

    if (!activeProject) {
      alert("No Kanban projects found. Please create one first.");
      window.location.href = "projects.html";
      return;
    }

    localStorage.setItem("activeProject", activeProject._id);

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

      const assigneeName = task.assignedTo ? task.assignedTo.name : 'Unassigned';

      taskCard.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-description">${task.description || ''}</div>
        <div class="task-assignee">Assigned to: ${assigneeName}</div>
      `;

      taskCard.addEventListener('dragstart', onDragStart);
      taskCard.addEventListener('dragend', onDragEnd);
      colDiv.appendChild(taskCard);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-task-btn';
    addBtn.textContent = '+ Add Task';
    addBtn.onclick = () => openAddTaskModal(col);
    colDiv.appendChild(addBtn);

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
    await updateTaskStatus(draggedTaskId, toStatus);
    
    // Update local tasks
    const task = tasks.find(t => t._id === draggedTaskId);
    if (task) {
      task.status = toStatus;
    }

    draggedTaskId = null;
    draggedFromStatus = null;
    renderBoard();
  } catch (error) {
    alert("Failed to update task: " + error.message);
  }
}

// Modal for adding task
function openAddTaskModal(status) {
  const title = prompt('Enter task title:');
  if (!title) return;

  const description = prompt('Enter task description (optional):');
  
  addTaskToColumn(title, description, status);
}

async function addTaskToColumn(title, description, status) {
  try {
    const newTask = await createTask(
      title,
      description,
      null,  // no sprint for kanban
      null,  // no sprint ID
      activeProject._id,
      'medium',
      null
    );

    tasks.push(newTask.task || newTask);
    renderBoard();
    alert("Task added successfully!");
  } catch (error) {
    alert("Failed to create task: " + error.message);
  }
}

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
