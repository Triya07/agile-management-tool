/***********************
 * CONSTANTS & STATE
 ***********************/
const STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
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
    const res = await fetch("http://localhost:5000/api/tasks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status,
        sprint: SPRINT_ID
      })
    });

    const result = await res.json();
    const task = result.task;

    tasks.push({
      id: task._id,
      title: task.title,
      status: task.status
    });

    addTaskModal.style.display = "none";
    renderBoard();

  } catch (err) {
    console.error(err);
    alert("Failed to create task");
  }
};

/***********************
 * INITIAL LOAD
 ***********************/
<<<<<<< HEAD
renderBoard();
=======
renderBoard();
>>>>>>> 596a974c9515b51f5d02c1daccc038022483f211
