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

// ⚠️ TEMP sprintId (replace later dynamically)
const SPRINT_ID = "696e3c093920f68d5b1d6d96";

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
    // Use API helper with authentication
    const result = await createTask(title, "", null, SPRINT_ID, null, "medium", null);
    
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
    const sprintId = "696e3c093920f68d5b1d6d96"; // same sprint id

    // Use API helper with authentication instead of direct fetch
    const data = await getSprintTasks(sprintId, null);
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

loadTasks();

