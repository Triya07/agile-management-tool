// Task storage (empty by default, user will add tasks manually)
const tasks = [];

// Render tasks in columns
function renderBoard() {
  ["todo", "inprogress", "done"].forEach(col => {
    const colDiv = document.getElementById(col);
    colDiv.innerHTML = "";
    tasks.filter(t => t.status === col).forEach(task => {
      const div = document.createElement("div");
      div.className = "task-card";
      div.textContent = task.title;
      div.draggable = true;
      div.dataset.id = task.id;
      div.addEventListener("dragstart", onDragStart);
      colDiv.appendChild(div);
    });
  });
  updateProgress();
  renderCompletedTasks();
}

// Drag & Drop
let draggedTaskId = null;
function onDragStart(e) {
  draggedTaskId = e.target.dataset.id;
}
["todo", "inprogress", "done"].forEach(col => {
  const colDiv = document.getElementById(col);
  colDiv.ondragover = e => e.preventDefault();
  colDiv.ondrop = e => {
    e.preventDefault();
    if (draggedTaskId) {
      const task = tasks.find(t => t.id == draggedTaskId);
      if (task) {
        task.status = col;
        renderBoard();
      }
    }
  };
});

// Progress
function updateProgress() {
  const done = tasks.filter(t => t.status === "done").length;
  document.getElementById("sprintProgress").textContent = `${done}/${tasks.length} tasks completed`;
}

// Sprint Review: show completed tasks
function renderCompletedTasks() {
  const completed = tasks.filter(t => t.status === "done");
  const div = document.getElementById("completedTasks");
  div.innerHTML = completed.length
    ? "<ul>" + completed.map(t => `<li>${t.title}</li>`).join("") + "</ul>"
    : "<em>No tasks completed yet.</em>";
}

// Retrospective: Save feedback to localStorage (demo)
document.getElementById("saveRetro").onclick = function() {
  const retro = {
    good: document.getElementById("retroGood").value,
    bad: document.getElementById("retroBad").value,
    improve: document.getElementById("retroImprove").value,
    review: document.getElementById("reviewFeedback").value
  };
  localStorage.setItem("sprintRetro", JSON.stringify(retro));
  alert("Retrospective saved!");
};

// Modal logic for Add Task
const addTaskModal = document.getElementById("addTaskModal");
document.getElementById("openAddTaskModal").onclick = () => {
  addTaskModal.style.display = "flex";
  document.getElementById("taskTitleInput").value = "";
  document.getElementById("taskStatusInput").value = "todo";
  document.getElementById("taskTitleInput").focus();
};
document.getElementById("cancelAddTask").onclick = () => {
  addTaskModal.style.display = "none";
};
document.getElementById("addTaskForm").onsubmit = function(e) {
  e.preventDefault();
  const title = document.getElementById("taskTitleInput").value.trim();
  const status = document.getElementById("taskStatusInput").value;
  if (title) {
    tasks.push({
      id: Date.now(),
      title,
      status
    });
    renderBoard();
    addTaskModal.style.display = "none";
  }
};

// Initial render
renderBoard();
