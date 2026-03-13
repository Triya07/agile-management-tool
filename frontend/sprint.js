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
let PROJECT_ID = null;
let CURRENT_SPRINT = null;

<<<<<<< HEAD
// Get sprint and project IDs from URL or localStorage
function getProjectAndSprintId() {
  const params = new URLSearchParams(window.location.search);
  PROJECT_ID = params.get('projectId') || localStorage.getItem('currentProjectId');
  SPRINT_ID = params.get('sprintId') || localStorage.getItem('currentSprintId');
  
  if (!PROJECT_ID) {
    console.warn('No project ID provided. Will show sprint selection.');
  }
  if (!SPRINT_ID && !PROJECT_ID) {
    console.warn('Neither sprint ID nor project ID provided.');
  }
  
  return { SPRINT_ID, PROJECT_ID };
}

// Get sprintId from URL parameter or localStorage (legacy support)
function getSprintId() {
=======
// Get projectId from URL parameter or localStorage
function getProjectId() {
>>>>>>> 7daa70b62fe5667570c56f9421d22c2ff6bc2620
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
document.getElementById("saveRetro").onclick = async () => {
  const good = document.getElementById("retroGood").value;
  const bad = document.getElementById("retroBad").value;
  const improve = document.getElementById("retroImprove").value;
  const feedback = document.getElementById("reviewFeedback").value;
  
  try {
    if (SPRINT_ID) {
      await saveSprintRetrospective(SPRINT_ID, good, bad, improve, feedback);
      alert("Retrospective saved to database!");
    } else {
      // Fallback to localStorage if no sprint ID
      const retro = { good, bad, improve, review: feedback };
      localStorage.setItem("sprintRetro", JSON.stringify(retro));
      alert("Retrospective saved locally!");
    }
  } catch (error) {
    console.error('Error saving retrospective:', error);
    alert('Error saving retrospective');
  }
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

// Load all sprints for a project
async function loadProjectSprints() {
  try {
    const { PROJECT_ID: projectId } = getProjectAndSprintId();
    if (!projectId) {
      console.error('No project ID available');
      return [];
    }

    const sprintsData = await getProjectSprints(projectId);
    return Array.isArray(sprintsData) ? sprintsData : (sprintsData.data || []);
  } catch (error) {
    console.error('Error loading project sprints:', error);
    return [];
  }
}

// Switch to a different sprint
async function switchToSprint(sprintId) {
  SPRINT_ID = sprintId;
  localStorage.setItem('currentSprintId', sprintId);
  
  // Load sprint details
  try {
    const sprintData = await getSprint(sprintId);
    CURRENT_SPRINT = sprintData;
    updateSprintHeader(sprintData);
  } catch (error) {
    console.error('Error loading sprint details:', error);
  }
  
  // Load tasks for this sprint
  await loadTasks();
}

// Update sprint header with sprint details
function updateSprintHeader(sprint) {
  if (sprint) {
    const startDate = new Date(sprint.startDate).toLocaleDateString();
    const endDate = new Date(sprint.endDate).toLocaleDateString();
    document.getElementById('sprintName').textContent = sprint.sprintName;
    document.getElementById('sprintDates').textContent = `${startDate} - ${endDate}`;
  }
}

/***********************
 * SPRINT SELECTOR UI
 ***********************/
async function loadAndShowSprintSelector(projectId) {
  const sprints = await loadProjectSprints();
  
  if (sprints.length === 0) {
    // No sprints exist, show create sprint form
    showCreateSprintModal(projectId);
  } else {
    // Show sprint selector
    showSprintSelector(sprints);
  }
}

function showSprintSelector(sprints) {
  // Create sprint selector UI
  const boardContainer = document.querySelector('.board');
  if (!boardContainer) return;
  
  boardContainer.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 40px; text-align: center;">
      <h2 style="color: #34A0A4; font-size: 1.5rem; margin-bottom: 20px;">Select a Sprint</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
        ${sprints.map(sprint => `
          <div style="background: white; padding: 20px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(118, 200, 147, 0.2); transition: all 0.3s;" 
               onmouseenter="this.style.borderColor='#76C893'; this.style.boxShadow='0 6px 20px rgba(118, 200, 147, 0.15)';"
               onmouseleave="this.style.borderColor='rgba(118, 200, 147, 0.2)'; this.style.boxShadow='none';"
               onclick="switchToSprint('${sprint._id}')">
            <h3 style="color: #083344; margin: 0 0 8px 0;">${sprint.sprintName}</h3>
            <p style="color: #666; font-size: 0.9rem; margin: 0 0 12px 0;">
              ${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(sprint.endDate).toLocaleDateString()}
            </p>
            <p style="color: #999; font-size: 0.85rem; margin: 0;">Status: <strong>${sprint.status}</strong></p>
          </div>
        `).join('')}
        <div style="background: rgba(118, 200, 147, 0.1); padding: 20px; border-radius: 12px; cursor: pointer; border: 2px dashed rgba(118, 200, 147, 0.3); transition: all 0.3s; display: flex; align-items: center; justify-content: center;"
             onmouseenter="this.style.background='rgba(118, 200, 147, 0.15)'; this.style.borderColor='#76C893';"
             onmouseleave="this.style.background='rgba(118, 200, 147, 0.1)'; this.style.borderColor='rgba(118, 200, 147, 0.3)';"
             onclick="showCreateSprintModal()">
          <div style="text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 8px;">+</div>
            <div style="color: #34A0A4; font-weight: 600;">Create New Sprint</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showCreateSprintModal(projectId) {
  const modal = document.getElementById("addTaskModal");
  if (!modal) return;
  
  modal.innerHTML = `
    <div style="background: white; padding: 40px; border-radius: 12px; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
      <h3 style="color: #34A0A4; font-size: 1.5rem; margin: 0 0 24px 0;">Create New Sprint</h3>
      <form id="createSprintForm" style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; color: #34A0A4; font-weight: 600; margin-bottom: 8px;">Sprint Name</label>
          <input type="text" id="sprintNameInput" placeholder="e.g., Sprint 1 - Development" required 
                 style="width: 100%; padding: 10px 12px; border: 2px solid rgba(118, 200, 147, 0.3); border-radius: 8px; font-size: 1rem;">
        </div>
        <div>
          <label style="display: block; color: #34A0A4; font-weight: 600; margin-bottom: 8px;">Sprint Goal (optional)</label>
          <textarea id="sprintGoalInput" placeholder="What should this sprint achieve?" 
                    style="width: 100%; padding: 10px 12px; border: 2px solid rgba(118, 200, 147, 0.3); border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; min-height: 60px;"></textarea>
        </div>
        <div>
          <label style="display: block; color: #34A0A4; font-weight: 600; margin-bottom: 8px;">Start Date</label>
          <input type="date" id="sprintStartDate" required style="width: 100%; padding: 10px 12px; border: 2px solid rgba(118, 200, 147, 0.3); border-radius: 8px; font-size: 1rem;">
        </div>
        <div>
          <label style="display: block; color: #34A0A4; font-weight: 600; margin-bottom: 8px;">End Date</label>
          <input type="date" id="sprintEndDate" required style="width: 100%; padding: 10px 12px; border: 2px solid rgba(118, 200, 147, 0.3); border-radius: 8px; font-size: 1rem;">
        </div>
        <div style="display: flex; gap: 12px; margin-top: 12px;">
          <button type="submit" style="flex: 1; background: linear-gradient(135deg, #76C893, #52B69A); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Create Sprint</button>
          <button type="button" onclick="document.getElementById('addTaskModal').style.display='none'" style="flex: 1; background: #e2e8f0; color: #34A0A4; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  modal.style.display = "flex";
  
  document.getElementById("createSprintForm").addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById("sprintNameInput").value;
    const goal = document.getElementById("sprintGoalInput").value;
    const startDate = document.getElementById("sprintStartDate").value;
    const endDate = document.getElementById("sprintEndDate").value;
    
    try {
      const result = await createSprint(name, goal, startDate, endDate, PROJECT_ID);
      const newSprintId = result.sprint ? result.sprint._id : null;
      if (newSprintId) {
        alert("Sprint created! Switching to new sprint...");
        await switchToSprint(newSprintId);
        document.getElementById("addTaskModal").style.display = "none";
      }
    } catch (error) {
      console.error('Error creating sprint:', error);
      alert('Error creating sprint: ' + error.message);
    }
  });
}

// Initialize on page load
<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', async () => {
  const { SPRINT_ID: sprintId, PROJECT_ID: projectId } = getProjectAndSprintId();
  
  // If projectId but no sprintId, load sprint selector
  if (projectId && !sprintId) {
    await loadAndShowSprintSelector(projectId);
  } else if (sprintId) {
    // Load the specific sprint
    await switchToSprint(sprintId);
  } else {
    console.error('No sprint or project ID provided');
=======
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
>>>>>>> 7daa70b62fe5667570c56f9421d22c2ff6bc2620
  }
});

