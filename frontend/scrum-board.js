// Get active project (must be scrum)
const activeProjectId = localStorage.getItem("activeProject");
const projects = JSON.parse(localStorage.getItem("projects")) || [];
let activeProject = projects.find(p => p.id === activeProjectId && p.type === "scrum");

// If no active scrum project, try to find any scrum project or create one
if (!activeProject) {
  const scrumProjects = projects.filter(p => p.type === "scrum");
  if (scrumProjects.length > 0) {
    // Use the first scrum project found
    activeProject = scrumProjects[0];
    localStorage.setItem("activeProject", activeProject.id);
  } else {
    // Create a demo scrum project
    const demoProject = {
      id: Date.now().toString(),
      name: "Demo Scrum Project",
      type: "scrum"
    };
    projects.push(demoProject);
    localStorage.setItem("projects", JSON.stringify(projects));
    localStorage.setItem("activeProject", demoProject.id);
    activeProject = demoProject;
  }
}

// Get active sprint for this project - create one if none exists
let activeSprintId = localStorage.getItem("activeSprint");
let sprints = JSON.parse(localStorage.getItem("sprints")) || [];
let activeSprint = sprints.find(s => s.id === activeSprintId && s.projectId === activeProject.id);

if (!activeSprint) {
  // Create a demo sprint for this project
  const demoSprint = {
    id: Date.now().toString(),
    projectId: activeProject.id,
    name: "Sprint 1",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 weeks from now
  };
  sprints.push(demoSprint);
  localStorage.setItem("sprints", JSON.stringify(sprints));
  localStorage.setItem("activeSprint", demoSprint.id);
  activeSprintId = demoSprint.id;
  activeSprint = demoSprint;
}

// Show sprint info in the header
document.querySelector('.kanban-title').textContent = `Scrum Board - ${activeSprint.name}`;

// Load tasks for this project and sprint
let tasks = (JSON.parse(localStorage.getItem("tasks")) || []).filter(
  t => t.projectId === activeProject.id && t.sprintId === activeSprintId
);

// Hide the notice since we have an active sprint
document.getElementById("sprintNotice").style.display = "none";
document.getElementById("addTaskBtnRow").style.display = "flex";
document.getElementById("scrumBoard").style.opacity = "1";

// Render board
function renderBoard() {
  ["todo", "inprogress", "done"].forEach(col => {
    const colDiv = document.getElementById(col);
    colDiv.innerHTML = "";
    const colTasks = tasks.filter(t => t.status === col);
    
    colTasks.forEach(task => {
      const div = document.createElement("div");
      div.className = "task-card";
      
      // Enhanced task card with more details
      div.innerHTML = `
        <div style="font-weight:500;margin-bottom:4px;">${task.title}</div>
        ${task.assignee ? `<div style="font-size:0.8rem;color:#666;margin-bottom:4px;">Assigned to: ${getAssigneeName(task.assignee)}</div>` : ''}
        ${task.dueDate ? `<div style="font-size:0.8rem;color:#666;margin-bottom:4px;">Due: ${task.dueDate}</div>` : ''}
        ${task.priority ? `<span style="font-size:0.7rem;padding:2px 6px;border-radius:3px;background:${getPriorityColor(task.priority)};color:white;">${task.priority.toUpperCase()}</span>` : ''}
      `;
      
      div.draggable = true;
      div.dataset.id = task.id;
      div.addEventListener("dragstart", onDragStart);
      colDiv.appendChild(div);
    });
  });
}

function getAssigneeName(assigneeId) {
  const teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [];
  const member = teamMembers.find(m => m.id === assigneeId);
  return member ? member.name : assigneeId;
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

// Modal logic for Add Task (Enhanced)
const addTaskModal = document.getElementById("addTaskModal");

document.getElementById("openAddTaskModal").onclick = () => {
    // Populate assignee dropdown
    const teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [
        { id: "user1", name: "John Doe" },
        { id: "user2", name: "Jane Smith" },
        { id: "user3", name: "Mike Wilson" }
    ];
    
    const assigneeSelect = document.getElementById("taskAssigneeSelect");
    assigneeSelect.innerHTML = '<option value="">Recently assigned</option>';
    teamMembers.forEach(member => {
        const option = document.createElement("option");
        option.value = member.id;
        option.textContent = member.name;
        assigneeSelect.appendChild(option);
    });
    
    // Set current project
    const projects = JSON.parse(localStorage.getItem("projects")) || [];
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (activeProject) {
        document.getElementById("selectedProject").textContent = activeProject.name;
    } else {
        document.getElementById("selectedProject").textContent = "Current Project";
    }
    
    // Set user avatar
    const currentUser = localStorage.getItem('currentUser') || 'User';
    document.getElementById("userAvatar").textContent = currentUser.charAt(0).toUpperCase();
    
    // Reset form
    document.getElementById("taskTitleInput").value = "";
    document.getElementById("taskDueDateInput").value = "";
    document.getElementById("taskDescriptionInput").value = "";
    document.getElementById("taskCommentInput").value = "";
    document.getElementById("taskStatusInput").value = "todo";
    document.getElementById("taskPriorityInput").value = "medium";
    
    // Show modal
    addTaskModal.style.display = "flex";
    
    // Focus on title input
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
        // Uncheck
        checkbox.style.backgroundColor = "";
        checkbox.innerHTML = "";
    } else {
        // Check
        checkbox.style.backgroundColor = "#10b981";
        checkbox.innerHTML = "✓";
        checkbox.style.color = "white";
        checkbox.style.fontSize = "12px";
        checkbox.style.fontWeight = "bold";
    }
}

// Enhanced form submission
document.getElementById("addTaskForm").onsubmit = function(e) {
    e.preventDefault();
    const title = document.getElementById("taskTitleInput").value.trim();
    
    if (!title) {
        alert("Please enter a task title");
        return;
    }
    
    if (!activeSprintId) {
        alert("No active sprint selected");
        return;
    }
    
    const status = document.getElementById("taskStatusInput").value;
    const assignee = document.getElementById("taskAssigneeSelect").value;
    const dueDate = document.getElementById("taskDueDateInput").value;
    const priority = document.getElementById("taskPriorityInput").value;
    const description = document.getElementById("taskDescriptionInput").value.trim();
    const comment = document.getElementById("taskCommentInput").value.trim();
    
    const newTask = {
        id: Date.now().toString(),
        projectId: activeProjectId,
        sprintId: activeSprintId,
        title,
        status,
        assignee,
        dueDate,
        priority,
        description,
        createdBy: localStorage.getItem('currentUser'),
        createdDate: new Date().toISOString().split('T')[0],
        completedDate: null
    };
    
    tasks.push(newTask);
    saveTasks();
    
    // Save comment if provided
    if (comment) {
        const comments = JSON.parse(localStorage.getItem('taskComments')) || {};
        if (!comments[newTask.id]) comments[newTask.id] = [];
        comments[newTask.id].push({
            user: localStorage.getItem('currentUser'),
            comment: comment,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        });
        localStorage.setItem('taskComments', JSON.stringify(comments));
    }
    
    // Add activity log
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const assigneeName = assignee ? teamMembers.find(m => m.id === assignee)?.name : 'Unassigned';
    activities.unshift({
        type: 'assigned',
        message: `Task "${title}" created${assignee ? ` and assigned to ${assigneeName}` : ''}`,
        time: new Date().toLocaleString(),
        timestamp: Date.now()
    });
    localStorage.setItem('activities', JSON.stringify(activities));
    
    renderBoard();
    closeTaskModal();
    alert("Task created successfully!");
};

// Auto-expand comment textarea
document.getElementById("taskCommentInput").addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// Priority color coding
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

// Close modal when clicking outside
addTaskModal.addEventListener('click', function(e) {
    if (e.target === addTaskModal) {
        closeTaskModal();
    }
});

// Initial render
renderBoard();
