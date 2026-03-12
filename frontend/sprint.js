/***********************
 * CONSTANTS & STATE
 ***********************/
const STATUS = {
  TODO: "todo",
  IN_PROGRESS: "inprogress",
  DONE: "done"
};

const tasks = [];
let draggedTaskId = null;
let SPRINT_ID = null;

// Get projectId from URL parameter or localStorage
function getProjectId() {
  const params = new URLSearchParams(window.location.search);
  const projectIdFromUrl = params.get('projectId');
  
  if (projectIdFromUrl) {
    // Store the project ID from URL in localStorage for future use
    localStorage.setItem('currentProjectId', projectIdFromUrl);
    return projectIdFromUrl;
  }
  
  return localStorage.getItem('currentProjectId');
}

// Show sprint selection modal
window.showSprintSelection = async function() {
  const modal = document.getElementById('sprintSelectionModal');
  const sprintList = document.getElementById('sprintList');
  
  try {
    const projectId = getProjectId();
    if (!projectId) {
      alert('No project selected. Please select a project first.');
      window.location.href = 'projects.html';
      return;
    }
    
    const sprints = await getProjectSprints(projectId);
    
    if (!sprints || sprints.length === 0) {
      sprintList.innerHTML = '<p style="color:#666;text-align:center;">No sprints found for this project. Create a sprint first.</p>';
    } else {
      sprintList.innerHTML = sprints.map(sprint => `
        <div style="padding:12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;cursor:pointer;background:#f8fafc;" 
             data-sprint-id="${sprint._id}" 
             data-sprint-name="${(sprint.sprintName || '').replace(/"/g, '&quot;')}" 
             data-start-date="${sprint.startDate || ''}" 
             data-end-date="${sprint.endDate || ''}"
             onclick="handleSprintClick(this)">
          <div style="font-weight:600;color:#1a202c;">${sprint.sprintName || 'Unnamed Sprint'}</div>
          <div style="font-size:0.9rem;color:#666;">${sprint.startDate && sprint.endDate ? `${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(sprint.endDate).toLocaleDateString()}` : 'No dates set'}</div>
        </div>
      `).join('');
    }
    
    modal.style.display = 'flex';
  } catch (error) {
    console.error('Error loading sprints:', error);
    alert('Error loading sprints. Please try again.');
  }
};

// Handle sprint selection
window.selectSprint = function(sprintId, sprintName, startDate, endDate) {
  localStorage.setItem('currentSprintId', sprintId);
  SPRINT_ID = sprintId;
  
  // Update sprint info display
  document.getElementById('sprintName').textContent = sprintName || 'Sprint Selected';
  document.getElementById('sprintDates').textContent = startDate && endDate ? 
    `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : 
    'Dates not available';
  
  // Show the add task button and board
  document.getElementById('addTaskBtnRow').style.display = 'block';
  document.getElementById('sprintBoard').style.display = 'flex';
  
  // Hide modal and load tasks
  document.getElementById('sprintSelectionModal').style.display = 'none';
  loadTasks();
};

// Handle sprint click from data attributes
window.handleSprintClick = function(element) {
  const sprintId = element.getAttribute('data-sprint-id');
  const sprintName = element.getAttribute('data-sprint-name');
  const startDate = element.getAttribute('data-start-date');
  const endDate = element.getAttribute('data-end-date');
  
  selectSprint(sprintId, sprintName, startDate, endDate);
};

/***********************
 * RENDER BOARD
 ***********************/
function renderBoard() {
  Object.values(STATUS).forEach(status => {
    const column = document.getElementById(status);

    // remove only task cards
    column.querySelectorAll(".task-card").forEach(t => t.remove());

    tasks
      .filter(task => task.status === status)
      .forEach(task => {
        const div = document.createElement("div");
        div.className = "task-card";
        div.textContent = task.title;
        div.draggable = true;
        div.dataset.id = task.id;
        div.addEventListener("dragstart", onDragStart);
        column.appendChild(div);
      });
  });

  updateProgress();
  renderCompletedTasks();
  updateTaskCount();
}

/***********************
 * DRAG & DROP
 ***********************/
function onDragStart(e) {
  draggedTaskId = e.target.dataset.id;
}

Object.values(STATUS).forEach(status => {
  const column = document.getElementById(status);

  column.ondragover = e => e.preventDefault();

  column.ondrop = e => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task) return;

    task.status = status;
    draggedTaskId = null;
    renderBoard();
  };
});

// Navigation helper: make sidebar buttons work on this page
function navigateTo(page) {
  window.location.href = page;
}

['nav-board', 'nav-projects', 'nav-dashboard', 'nav-sprints', 'nav-settings'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', () => {
    // update active state for visual feedback
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // perform navigation
    switch(id) {
      case 'nav-board': navigateTo('kanban-board.html'); break;
      case 'nav-projects': navigateTo('projects.html'); break;
      case 'nav-dashboard': navigateTo('dashboard.html'); break;
      case 'nav-sprints': navigateTo('sprint.html'); break;
      case 'nav-settings': navigateTo('settings.html'); break;
    }
  });
});

/***********************
 * PROGRESS & REVIEW
 ***********************/
function updateProgress() {
  const doneCount = tasks.filter(t => t.status === STATUS.DONE).length;
  document.getElementById("sprintProgress").textContent =
    `${doneCount}/${tasks.length} tasks completed`;
}

function renderCompletedTasks() {
  const completed = tasks.filter(t => t.status === STATUS.DONE);
  const div = document.getElementById("completedTasks");

  div.innerHTML = completed.length
    ? `<ul>${completed.map(t => `<li>${t.title}</li>`).join("")}</ul>`
    : "<em>No tasks completed yet.</em>";
}

/***********************
 * RETROSPECTIVE
 ***********************/
document.getElementById("saveRetro").onclick = () => {
  const retro = {
    good: document.getElementById("retroGood").value,
    bad: document.getElementById("retroBad").value,
    improve: document.getElementById("retroImprove").value,
    review: document.getElementById("reviewFeedback").value
  };
  localStorage.setItem("sprintRetro", JSON.stringify(retro));
  alert("Retrospective saved!");
};

/***********************
 * MODAL LOGIC
 ***********************/
const addTaskModal = document.getElementById("addTaskModal");

document.getElementById("openAddTaskModal").onclick = () => {
  if (!SPRINT_ID) {
    alert('Please select a sprint first.');
    showSprintSelection();
    return;
  }
  addTaskModal.style.display = "flex";
  document.getElementById("taskTitleInput").value = "";
  document.getElementById("taskStatusInput").value = STATUS.TODO;
};

document.getElementById("cancelAddTask").onclick = () => {
  addTaskModal.style.display = "none";
};

/***********************
 * ADD TASK (BACKEND)
 ***********************/
document.getElementById("addTaskForm").onsubmit = async e => {
  e.preventDefault();

  const title = document.getElementById("taskTitleInput").value.trim();
  const status = document.getElementById("taskStatusInput").value;

  if (!title) return;

  try {
    if (!SPRINT_ID) {
      alert('Please select a sprint first.');
      showSprintSelection();
      return;
    }
    
    const projectId = getProjectId();
    
    // Use API helper with authentication
    const result = await createTask(title, "", null, SPRINT_ID, projectId, "medium", null, status);
    
    if (result && result.task) {
      const task = result.task;
      tasks.push({
        id: task._id,
        title: task.title,
        status: task.status
      });
    }

    addTaskModal.style.display = "none";
    renderBoard();

  } catch (err) {
    console.error("Error creating task:", err);
    // Backend unavailable — fallback to local-only task so UX still works
    const localTask = {
      id: Date.now().toString(),
      title,
      status
    };
    tasks.push(localTask);
    addTaskModal.style.display = "none";
    renderBoard();
    // Optionally inform the user the task is stored locally
    alert("Task added locally (backend unavailable)");
  }
};

/***********************
 * INITIAL LOAD
 ***********************/
async function loadTasks() {
  try {
    if (!SPRINT_ID) {
      console.warn('No sprint selected, cannot load tasks');
      return;
    }

    // Get the current project ID (needed for auth)
    const projectId = getProjectId();
    
    // Use API helper with authentication instead of direct fetch
    const data = await getSprintTasks(SPRINT_ID, projectId);
    const taskList = Array.isArray(data) ? data : (data.data || []);

    tasks.length = 0; // clear local array

    taskList.forEach(task => {
      tasks.push({
        id: task._id,
        title: task.title,
        status: task.status
      });
    });

    renderBoard();
  } catch (err) {
    console.error("Failed to load tasks:", err);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Ensure project ID is available from URL if present
  getProjectId();
  
  const sprintId = getSprintId();
  if (!sprintId) {
    showSprintSelection();
  } else {
    // Sprint already selected, show the UI
    document.getElementById('addTaskBtnRow').style.display = 'block';
    document.getElementById('sprintBoard').style.display = 'flex';
    loadTasks();
  }
});

