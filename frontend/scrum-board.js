// Initialize board with API data
let activeProject = null;
let activeSprint = null;
let tasks = [];
let teamMembers = [];

// Load data from API
async function initializeBoard() {
  try {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    // Get projects
    const projectsResponse = await getProjects();
    const projects = projectsResponse.data || projectsResponse;
    
    // Find or select active project
    const activeProjectId = localStorage.getItem("activeProject");
    activeProject = projects.find(p => p._id === activeProjectId && p.type === "scrum") || 
                    projects.find(p => p.type === "scrum");

    if (!activeProject) {
      alert("No Scrum projects found. Please create one first.");
      window.location.href = "/projects.html";
      return;
    }

    localStorage.setItem("activeProject", activeProject._id);

    // Get sprints for this project
    const sprintsResponse = await getProjectSprints(activeProject._id);
    const sprints = sprintsResponse.data || sprintsResponse;

    // Find active sprint or use first
    const activeSprintId = localStorage.getItem("activeSprint");
    activeSprint = sprints.find(s => s._id === activeSprintId) || sprints[0];

    if (!activeSprint) {
      alert("No sprints found for this project. Please create one first.");
      return;
    }

    localStorage.setItem("activeSprint", activeSprint._id);

    // Load tasks for this sprint
    const tasksResponse = await getSprintTasks(activeSprint._id, activeProject._id);
    tasks = tasksResponse.data || tasksResponse;

    // Get team members from project
    teamMembers = activeProject.members || [];

    // Update UI
    document.querySelector('.kanban-title').textContent = `Scrum Board - ${activeSprint.sprintName}`;
    document.getElementById("sprintNotice").style.display = "none";
    document.getElementById("addTaskBtnRow").style.display = "flex";
    document.getElementById("scrumBoard").style.opacity = "1";

    renderBoard();
  } catch (error) {
    console.error("Error initializing board:", error);
    alert("Failed to load board: " + error.message);
  }
}

// Render board with tasks
function renderBoard() {
  ["todo", "inprogress", "done"].forEach(col => {
    const colDiv = document.getElementById(col);
    colDiv.innerHTML = "";
    const colTasks = tasks.filter(t => t.status === col);
    
    colTasks.forEach(task => {
      const div = document.createElement("div");
      div.className = "task-card";
      
      const assigneeName = task.assignedTo ? task.assignedTo.name : "Unassigned";
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "";
      
      div.innerHTML = `
        <div style="font-weight:500;margin-bottom:4px;">${task.title}</div>
        ${task.assignedTo ? `<div style="font-size:0.8rem;color:#666;margin-bottom:4px;">Assigned to: ${assigneeName}</div>` : ''}
        ${dueDate ? `<div style="font-size:0.8rem;color:#666;margin-bottom:4px;">Due: ${dueDate}</div>` : ''}
        ${task.priority ? `<span style="font-size:0.7rem;padding:2px 6px;border-radius:3px;background:${getPriorityColor(task.priority)};color:white;">${task.priority.toUpperCase()}</span>` : ''}
      `;
      
      div.draggable = true;
      div.dataset.id = task._id;
      div.addEventListener("dragstart", onDragStart);
      colDiv.appendChild(div);
    });
  });
}

function getPriorityColor(priority) {
  switch(priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
}

// Drag & Drop
let draggedTaskId = null;
function onDragStart(e) {
    draggedTaskId = e.target.dataset.id;
}

["todo", "inprogress", "done"].forEach(col => {
    const colDiv = document.getElementById(col);
    colDiv.ondragover = e => e.preventDefault();
    colDiv.ondrop = async (e) => {
        e.preventDefault();
        if (draggedTaskId) {
            const task = tasks.find(t => t._id == draggedTaskId);
            if (task) {
                try {
                  await updateTaskStatus(draggedTaskId, col);
                  task.status = col;
                  renderBoard();
                } catch (error) {
                  alert("Failed to update task: " + error.message);
                }
            }
        }
    };
});

// Modal logic for Add Task
const addTaskModal = document.getElementById("addTaskModal");

document.getElementById("openAddTaskModal").onclick = () => {
    const assigneeSelect = document.getElementById("taskAssigneeSelect");
    assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
    
    teamMembers.forEach(member => {
        const option = document.createElement("option");
        option.value = member._id;
        option.textContent = member.name;
        assigneeSelect.appendChild(option);
    });
    
    if (activeProject) {
        document.getElementById("selectedProject").textContent = activeProject.name;
    }
    
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
    }
    
    // Reset form
    document.getElementById("taskTitleInput").value = "";
    document.getElementById("taskDueDateInput").value = "";
    document.getElementById("taskDescriptionInput").value = "";
    document.getElementById("taskCommentInput").value = "";
    document.getElementById("taskStatusInput").value = "todo";
    document.getElementById("taskPriorityInput").value = "medium";
    
    addTaskModal.style.display = "flex";
    
    setTimeout(() => {
        document.getElementById("taskTitleInput").focus();
    }, 100);
};

function closeTaskModal() {
    addTaskModal.style.display = "none";
}

function markComplete() {
    const checkbox = event.target;
    if (checkbox.style.backgroundColor === "rgb(16, 185, 129)") {
        checkbox.style.backgroundColor = "";
        checkbox.innerHTML = "";
    } else {
        checkbox.style.backgroundColor = "#10b981";
        checkbox.innerHTML = "✓";
        checkbox.style.color = "white";
        checkbox.style.fontSize = "12px";
        checkbox.style.fontWeight = "bold";
    }
}

// Form submission
document.getElementById("addTaskForm").onsubmit = async function(e) {
    e.preventDefault();
    const title = document.getElementById("taskTitleInput").value.trim();
    
    if (!title) {
        alert("Please enter a task title");
        return;
    }
    
    if (!activeSprint) {
        alert("No active sprint selected");
        return;
    }
    
    const assignedTo = document.getElementById("taskAssigneeSelect").value || null;
    const dueDate = document.getElementById("taskDueDateInput").value || null;
    const priority = document.getElementById("taskPriorityInput").value;
    const description = document.getElementById("taskDescriptionInput").value.trim();
    
    try {
      const newTask = await createTask(
        title,
        description,
        assignedTo,
        activeSprint._id,
        activeProject._id,
        priority,
        dueDate
      );

      tasks.push(newTask.task || newTask);
      renderBoard();
      closeTaskModal();
      alert("Task created successfully!");
    } catch (error) {
      alert("Failed to create task: " + error.message);
    }
};

document.getElementById("taskCommentInput").addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

document.getElementById("taskPriorityInput").addEventListener('change', function() {
    const priority = this.value;
    const statusDisplay = document.getElementById("statusDisplay");
    switch(priority) {
        case 'high':
            statusDisplay.style.background = '#fecaca';
            statusDisplay.style.color = '#991b1b';
            statusDisplay.textContent = 'High priority';
            break;
        case 'medium':
            statusDisplay.style.background = '#fef3c7';
            statusDisplay.style.color = '#92400e';
            statusDisplay.textContent = 'Medium priority';
            break;
        case 'low':
            statusDisplay.style.background = '#dcfce7';
            statusDisplay.style.color = '#166534';
            statusDisplay.textContent = 'Low priority';
            break;
    }
});

addTaskModal.addEventListener('click', function(e) {
    if (e.target === addTaskModal) {
        closeTaskModal();
    }
});

// Initialize on page load
initializeBoard();
