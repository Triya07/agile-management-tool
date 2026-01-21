// Get active project (must be scrum)
const activeProjectId = localStorage.getItem("activeProject");
const projects = JSON.parse(localStorage.getItem("projects")) || [];
const activeProject = projects.find(p => p.id === activeProjectId && p.type === "scrum");
if (!activeProject) {
  alert("No active Scrum project selected.");
  window.location.href = "projects.html";
}

// Get active sprint for this project
const activeSprintId = localStorage.getItem("activeSprint");

// Show notice and disable board if no sprint is selected
if (!activeSprintId) {
  document.getElementById("sprintNotice").style.display = "block";
  document.getElementById("addTaskBtnRow").style.display = "none";
  document.getElementById("scrumBoard").style.opacity = "0.5";
  Array.from(document.querySelectorAll(".column-tasks")).forEach(col => col.innerHTML = "");
  // Do not proceed further
} else {
  // Load tasks for this project and sprint
  let tasks = (JSON.parse(localStorage.getItem("tasks")) || []).filter(
    t => t.projectId === activeProjectId && t.sprintId === activeSprintId
  );

  // Render board
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
          saveTasks();
          renderBoard();
        }
      }
    };
  });

  // Save tasks to localStorage
  function saveTasks() {
    let allTasks = JSON.parse(localStorage.getItem("tasks")) || [];
    // Remove all tasks for this project+sprint
    allTasks = allTasks.filter(t => !(t.projectId === activeProjectId && t.sprintId === activeSprintId));
    allTasks = allTasks.concat(tasks);
    localStorage.setItem("tasks", JSON.stringify(allTasks));
  }

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
      const newTask = {
        id: Date.now().toString(),
        projectId: activeProjectId,
        sprintId: activeSprintId,
        title,
        status
      };
      tasks.push(newTask);
      saveTasks();
      renderBoard();
      addTaskModal.style.display = "none";
    }
  };

  // Initial render
  renderBoard();
}
