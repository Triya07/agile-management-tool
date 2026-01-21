  // =========================
  // SEARCH BAR FUNCTIONALITY
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        const query = this.value.trim().toLowerCase();
        document.querySelectorAll(".task").forEach(task => {
          const title = task.textContent.toLowerCase();
          const desc = (task.dataset.desc || "").toLowerCase();
          if (title.includes(query) || desc.includes(query)) {
            task.style.display = "";
          } else {
            task.style.display = "none";
          }
        });
      });
    }
  });
  // Add task hint click: focus main input
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-task-hint')) {
      document.getElementById('taskInput').focus();
    }
  });
/* =========================
   LOGIN REDIRECT (index.html)
   ========================= */
document.getElementById("loginBtn")?.addEventListener("click", () => {
  window.location.href = "projects.html";
});

/* =========================
   KANBAN BOARD LOGIC
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Load board from localStorage
  loadBoard();

  // Add task button
  document.getElementById("addBtn")?.addEventListener("click", addTask);

  // Sidebar navigation logic
  const sidebarBtns = document.querySelectorAll(".sidebar-btn");
  sidebarBtns.forEach(btn => {
    btn.addEventListener("click", function() {
      sidebarBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      // For now, only Kanban Board is implemented
      // In future, switch main content here
    });
  });

  // Open popup on task click (show details)
  document.querySelector(".board")?.addEventListener("click", (e) => {
    if (!e.target.classList.contains("task")) return;
    activeTask = e.target;
    modalTitle.textContent = activeTask.textContent;
    // Show description and timeline if present
    document.getElementById("descInput").value = activeTask.dataset.desc || "";
    document.getElementById("timelineInput").value = activeTask.dataset.timeline || "";
    statusSelect.value = activeTask.parentElement.id;
    modal.style.display = "block";
  });

  // Delete task on double click
  document.querySelector(".board")?.addEventListener("dblclick", (e) => {
    if (!e.target.classList.contains("task")) return;
    e.stopPropagation();
    e.target.remove();
    saveBoard();
    updatePlaceholders();
  });

  // DRAG AND DROP SUPPORT
  const columns = document.querySelectorAll('.column-tasks');
  let draggedTask = null;

  document.addEventListener('dragstart', function(e) {
    if (e.target.classList.contains('task')) {
      draggedTask = e.target;
      setTimeout(() => {
        e.target.style.opacity = '0.5';
      }, 0);
    }
  });
  document.addEventListener('dragend', function(e) {
    if (e.target.classList.contains('task')) {
      e.target.style.opacity = '';
      draggedTask = null;
    }
  });
  columns.forEach(col => {
    col.addEventListener('dragover', function(e) {
      e.preventDefault();
      // Find the closest task below the mouse
      const afterElement = getDragAfterElement(this, e.clientY);
      if (afterElement == null) {
        this.appendChild(draggedTask);
      } else {
        this.insertBefore(draggedTask, afterElement);
      }
    });
    col.addEventListener('drop', function(e) {
      e.preventDefault();
      saveBoard();
      updatePlaceholders();
    });
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: -Infinity }).element;
  }

  // Make tasks draggable
  function makeTasksDraggable() {
    document.querySelectorAll('.task').forEach(task => {
      task.setAttribute('draggable', 'true');
    });
  }
  makeTasksDraggable();
  // Re-apply draggable on board update
  const origSaveBoard = saveBoard;
  window.saveBoard = function() {
    origSaveBoard();
    makeTasksDraggable();
  };
});

/* =========================
   ADD TASK
   ========================= */
function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();
  if (text === "") return;
  const task = document.createElement("div");
  task.className = "task";
  task.textContent = text;
  // Store empty desc/timeline for new task
  task.dataset.desc = "";
  task.dataset.timeline = "";
  document.getElementById("todo").appendChild(task);
  input.value = "";
  saveBoard();
  updatePlaceholders();
}

/* =========================
   POPUP (MODAL) LOGIC
   ========================= */
let activeTask = null;
const modal = document.getElementById("taskModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const saveTaskBtn = document.getElementById("saveTask");
const statusSelect = document.getElementById("statusSelect");
const descInput = document.getElementById("descInput");
const timelineInput = document.getElementById("timelineInput");
const moveForwardBtn = document.getElementById("moveForwardBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");

// Close popup
closeModal?.addEventListener("click", () => {
  modal.style.display = "none";
  activeTask = null;
});

// Save task changes (edit)
saveTaskBtn?.addEventListener("click", () => {
  if (!activeTask) return;
  activeTask.textContent = modalTitle.textContent;
  activeTask.dataset.desc = descInput.value;
  activeTask.dataset.timeline = timelineInput.value;
  const newStatus = statusSelect.value;
  document.getElementById(newStatus).appendChild(activeTask);
  modal.style.display = "none";
  activeTask = null;
  saveBoard();
  updatePlaceholders();
});

// Move Forward button
moveForwardBtn?.addEventListener("click", () => {
  if (!activeTask) return;
  const statusOrder = ["todo", "inprogress", "done"];
  let current = statusOrder.indexOf(statusSelect.value);
  if (current < statusOrder.length - 1) {
    const nextStatus = statusOrder[current + 1];
    statusSelect.value = nextStatus;
    document.getElementById(nextStatus).appendChild(activeTask);
    saveTaskBtn.click();
  }
});

// Delete Task button
deleteTaskBtn?.addEventListener("click", () => {
  if (!activeTask) return;
  activeTask.remove();
  modal.style.display = "none";
  activeTask = null;
  saveBoard();
  updatePlaceholders();
});

/* =========================
   LOCAL STORAGE
   ========================= */
function saveBoard() {
  // Save all tasks with their data
  const getTasks = (col) => {
    return Array.from(document.getElementById(col).children).filter(t => t.classList.contains("task")).map(task => ({
      text: task.textContent,
      desc: task.dataset.desc || "",
      timeline: task.dataset.timeline || ""
    }));
  };
  const data = {
    todo: getTasks("todo"),
    inprogress: getTasks("inprogress"),
    done: getTasks("done")
  };
  localStorage.setItem("kanbanBoardV2", JSON.stringify(data));
}

function loadBoard() {
  const data = JSON.parse(localStorage.getItem("kanbanBoardV2"));
  ["todo", "inprogress", "done"].forEach(col => {
    const column = document.getElementById(col);
    column.innerHTML = `<div class="placeholder"><span class="add-task-hint" data-target="${col}">Add task...</span></div>`;
    if (data && data[col]) {
      data[col].forEach(taskData => {
        const task = document.createElement("div");
        task.className = "task";
        task.textContent = taskData.text;
        task.dataset.desc = taskData.desc || "";
        task.dataset.timeline = taskData.timeline || "";
        column.appendChild(task);
      });
    }
  });
  updatePlaceholders();
}

function updatePlaceholders() {
  ["todo", "inprogress", "done"].forEach(id => {
    const column = document.getElementById(id);
    let placeholder = column.querySelector(".placeholder");
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.innerHTML = `<span class="add-task-hint" data-target="${id}">Add task...</span>`;
      column.appendChild(placeholder);
    }
    const tasks = column.querySelectorAll(".task");
    if (tasks.length === 0) {
      placeholder.style.display = "block";
    } else {
      placeholder.style.display = "none";
    }
  });
}
