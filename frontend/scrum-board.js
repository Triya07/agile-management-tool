// Initialize board with API data
let activeProject = null;
let activeSprint = null;
let tasks = [];
let teamMembers = [];
const BOARD_COLUMNS = ["todo", "inprogress", "review", "blocked", "done"];

function getTaskAssigneeNames(task) {
  if (Array.isArray(task?.assignedUsers) && task.assignedUsers.length > 0) {
    return task.assignedUsers.map((member) => member?.name || "Unknown");
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
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Get projects
    const projectsResponse = await getProjects();
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse.data || []);
    
    // Find or select active project
    const { projectId: activeProjectId, sprintId: activeSprintId } = getActiveContext();
    activeProject = projects.find(p => p._id === activeProjectId && p.type === "scrum") || 
                    projects.find(p => p.type === "scrum");

    if (!activeProject) {
      alert("No Scrum projects found. Please create one first.");
      window.location.href = "projects.html";
      return;
    }

    setActiveContext({ projectId: activeProject._id, projectType: "scrum" });

    // Get sprints for this project
    const sprintsResponse = await getProjectSprints(activeProject._id);
    const sprints = Array.isArray(sprintsResponse) ? sprintsResponse : (sprintsResponse.data || []);

    // Find active sprint or use first
    activeSprint = sprints.find(s => s._id === activeSprintId)
      || sprints.find(s => s.status === "active")
      || sprints.find(s => s.status === "planning")
      || sprints[0];

    if (!activeSprint) {
      alert("No sprints found for this project. Please create one first.");
      return;
    }

    setActiveContext({ projectId: activeProject._id, sprintId: activeSprint._id, projectType: "scrum" });

    // Load tasks for this sprint
    const tasksResponse = await getSprintTasks(activeSprint._id, activeProject._id);
    tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse.data || []);

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
  BOARD_COLUMNS.forEach(col => {
    const colDiv = document.getElementById(col);
    colDiv.innerHTML = "";
    const colTasks = tasks.filter(t => t.status === col);
    
    colTasks.forEach(task => {
      const div = document.createElement("div");
      div.className = "task-card";
      
      const assigneeNames = getTaskAssigneeNames(task);
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "";
      
      div.innerHTML = `
        <div style="font-weight:500;margin-bottom:4px;">${task.title}</div>
        ${assigneeNames.length ? `<div style="font-size:0.8rem;color:#666;margin-bottom:4px;">Assigned to: ${assigneeNames.join(", ")}</div>` : ''}
        ${dueDate ? `<div style="font-size:0.8rem;color:#666;margin-bottom:4px;">Due: ${dueDate}</div>` : ''}
        ${task.blockedReason && task.status === "blocked" ? `<div style="font-size:0.8rem;color:#991b1b;margin-bottom:4px;">Blocker: ${task.blockedReason}</div>` : ""}
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

BOARD_COLUMNS.forEach(col => {
    const colDiv = document.getElementById(col);
    colDiv.ondragover = e => e.preventDefault();
    colDiv.ondrop = async (e) => {
        e.preventDefault();
        if (draggedTaskId) {
            const task = tasks.find(t => t._id == draggedTaskId);
            if (task) {
                try {
                  await updateTaskStatus(draggedTaskId, col);
                  if (col === "blocked") {
                    await toggleTaskBlocked(draggedTaskId, true, task.blockedReason || "Blocked from scrum board");
                  } else if (task.status === "blocked" || task.isBlocked) {
                    await toggleTaskBlocked(draggedTaskId, false, "");
                  }
                  task.status = col;
                  task.isBlocked = col === "blocked";
                  task.blockedReason = col === "blocked" ? (task.blockedReason || "Blocked from scrum board") : "";
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
    assigneeSelect.innerHTML = '';
    
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
    
    if (!activeProject) {
        alert("No active project selected");
        return;
    }
    
    const assignedTo = Array.from(document.getElementById("taskAssigneeSelect").selectedOptions || [])
      .map((option) => option.value)
      .filter(Boolean);
    const dueDate = document.getElementById("taskDueDateInput").value || null;
    const priority = document.getElementById("taskPriorityInput").value || "medium";
    const description = document.getElementById("taskDescriptionInput").value.trim();
    const status = document.getElementById("taskStatusInput").value || "todo";
    
    try {
      // Show loading state
      const submitBtn = document.querySelector("#addTaskForm button[type='submit']");
      const originalText = submitBtn ? submitBtn.textContent : "Creating...";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
      }

      const newTask = await createTask(
        title,
        description,
        assignedTo,
        activeSprint._id,
        activeProject._id,
        priority,
        dueDate,
        status
      );

      // Handle response - could be newTask.task or just newTask
      const taskData = newTask.task || newTask;
      if (status === "blocked") {
        await toggleTaskBlocked(taskData._id, true, "Blocked at creation");
        taskData.isBlocked = true;
        taskData.blockedReason = "Blocked at creation";
      }
      tasks.push(taskData);
      renderBoard();
      closeTaskModal();
      
      // Reset form
      document.getElementById("addTaskForm").reset();
      
      alert("Task created successfully!");
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task: " + error.message);
      const submitBtn = document.querySelector("#addTaskForm button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
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
