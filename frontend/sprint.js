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

document.getElementById("addTaskForm").onsubmit = async function(e) {
  e.preventDefault();

  const title = document.getElementById("taskTitleInput").value.trim();
  const status = document.getElementById("taskStatusInput").value;

  // ⚠️ TEMP: hardcode sprintId (we’ll fix later)
  const sprintId = "696e3c093920f68d5b1d6d96";

  if (!title) return;

  try {
    const res = await fetch("http://localhost:5000/api/tasks/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        status,
        sprint: sprintId
      })
    });

    const data = await res.json();
    console.log("Task created:", data);

    // push backend task into UI state
    tasks.push({
      id: data.task._id,
      title: data.task.title,
      status: data.task.status
    });

    renderBoard();
    addTaskModal.style.display = "none";
  } catch (err) {
    console.error("Error creating task:", err);
    alert("Failed to create task");
  }
};


// Initial render
renderBoard();
