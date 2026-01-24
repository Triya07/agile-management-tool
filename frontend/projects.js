// Authentication check at the top
function checkManagerAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const userRole = localStorage.getItem('userRole');
  
  if (!isLoggedIn || userRole !== 'manager') {
    alert('Access denied. Manager login required.');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Check auth on page load
if (!checkManagerAuth()) {
  // Stop execution if not authorized
} else {
  const projectsGrid = document.getElementById("projectsGrid");
  const emptyState = document.getElementById("emptyState");

  let projects = JSON.parse(localStorage.getItem("projects")) || [];

  function renderProjects(filter = "all") {
    projectsGrid.innerHTML = "";

    const filtered = projects.filter(p =>
      filter === "all" ? true : p.type === filter
    );

    if (filtered.length === 0) {
      projectsGrid.appendChild(emptyState);
      return;
    }

    filtered.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card";
      card.innerHTML = `
        <h3>${project.name}</h3>
        <p class="project-type">${project.type.toUpperCase()}</p>
        <button class="btn add-task-btn" style="margin-top:10px;min-width:90px;" data-projectid="${project.id}">+ Add Task</button>
      `;

      // Add Task button click
      card.querySelector(".add-task-btn").onclick = function(e) {
        e.stopPropagation();
        showAddTaskModalForProject(project.id);
      };

      // Project card click (excluding the add task button)
      card.addEventListener("click", function(e) {
        if (e.target.classList.contains("add-task-btn")) return;
        localStorage.setItem("activeProject", project.id);
        
        // Navigate based on project type
        if (project.type === "scrum") {
          // For Scrum projects, go to scrum board
          window.location.href = "scrum-board.html";
        } else {
          // For Kanban projects, go to regular board
          window.location.href = "board.html";
        }
      });

      projectsGrid.appendChild(card);
    });
  }

  // Tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderProjects(tab.dataset.filter);
    });
  });

  // Only render existing projects on first load
  renderProjects();

  // Modal for project creation options
  function showProjectCreateOptionsModal() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.position = "fixed";
    modal.style.inset = 0;
    modal.style.background = "rgba(0,0,0,0.25)";
    modal.innerHTML = `
      <div style="background:#fff; border-radius:16px; padding:32px 28px; min-width:320px; box-shadow:0 8px 32px rgba(80,130,255,0.18); text-align:center;">
        <h3 style="color:#4f8cff; font-size:1.3rem; font-weight:600; margin-bottom:18px;">What do you want to do?</h3>
        <button class="modal-create-btn" data-action="mind" style="margin:8px 12px; padding:12px 28px; border-radius:24px; background:#e7f7ff; color:#4f8cff; border:none; font-size:1.1rem; font-weight:600; cursor:pointer;">Project Already in Mind</button>
        <button class="modal-create-btn" data-action="new" style="margin:8px 12px; padding:12px 28px; border-radius:24px; background:#e7ffe7; color:#22c55e; border:none; font-size:1.1rem; font-weight:600; cursor:pointer;">Create New Project</button>
        <div style="margin-top:18px;"><button class="btn" id="closeCreateModal" style="background:#eee; color:#4f8cff;">Cancel</button></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.modal-create-btn').forEach(btn => {
      btn.onclick = () => {
        modal.remove();
        if (btn.dataset.action === 'mind') {
          showProjectTypeModal('mind');
        } else {
          showProjectTypeModal('new');
        }
      };
    });
    modal.querySelector('#closeCreateModal').onclick = () => modal.remove();
  }

  // Modal for new project type selection (for both options)
  function showProjectTypeModal(mode) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.position = "fixed";
    modal.style.inset = 0;
    modal.style.background = "rgba(0,0,0,0.25)";
    let title = mode === 'mind' ? 'Choose Project Type (Already in Mind)' : 'Choose Project Type';
    modal.innerHTML = `
      <div style="background:#fff; border-radius:16px; padding:32px 28px; min-width:320px; box-shadow:0 8px 32px rgba(80,130,255,0.18); text-align:center;">
        <h3 style="color:#4f8cff; font-size:1.3rem; font-weight:600; margin-bottom:18px;">${title}</h3>
        <button class="modal-type-btn" data-type="scrum" style="margin:8px 12px; padding:12px 28px; border-radius:24px; background:#e7f7ff; color:#4f8cff; border:none; font-size:1.1rem; font-weight:600; cursor:pointer;">Scrum</button>
        <button class="modal-type-btn" data-type="kanban" style="margin:8px 12px; padding:12px 28px; border-radius:24px; background:#e7ffe7; color:#22c55e; border:none; font-size:1.1rem; font-weight:600; cursor:pointer;">Kanban</button>
        <div style="margin-top:18px;"><button class="btn" id="closeTypeModal" style="background:#eee; color:#4f8cff;">Cancel</button></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.modal-type-btn').forEach(btn => {
      btn.onclick = () => {
        modal.remove();
        createProject(btn.dataset.type);
      };
    });
    modal.querySelector('#closeTypeModal').onclick = () => modal.remove();
  }

  function createProject(type) {
    const name = prompt("Enter project name:");
    if (!name) return;
    const newProj = {
      id: Date.now().toString(),
      name,
      type
    };
    projects.push(newProj);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjects(document.querySelector('.tab.active').dataset.filter);
  }

  document.getElementById("openCreate")?.addEventListener("click", showProjectCreateOptionsModal);
  document.querySelectorAll(".create-btn").forEach(btn => {
    btn.addEventListener("click", showProjectCreateOptionsModal);
  });

  // --- Add Task Button and Modal for Project Dashboard ---

  // Remove global insertAddTaskBtn and its definition

  // Modal for adding a task to the selected project
  function showAddTaskModalForProject(projectId) {
    document.getElementById("addTaskModalProj")?.remove();

    const modal = document.createElement("div");
    modal.id = "addTaskModalProj";
    modal.style = "display:flex;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:1000;align-items:center;justify-content:center;";
    modal.innerHTML = `
      <div style="background:#fff;padding:32px 28px 24px 28px;border-radius:10px;box-shadow:0 2px 16px rgba(0,0,0,0.12);width:340px;max-width:90vw;position:relative;">
        <h3 style="margin-top:0;margin-bottom:18px;font-size:1.15rem;font-weight:600;color:#1a202c;">Add Task to Project</h3>
        <form id="addTaskFormProj">
          <label style="font-size:1rem;">Title</label>
          <input id="taskTitleInputProj" type="text" required style="width:100%;margin-bottom:14px;padding:9px 10px;border-radius:7px;border:1px solid #e2e8f0;font-size:1rem;background:#f7fafc;">
          <label style="font-size:1rem;">Status</label>
          <select id="taskStatusInputProj" style="width:100%;margin-bottom:18px;padding:9px 10px;border-radius:7px;border:1px solid #e2e8f0;font-size:1rem;background:#f7fafc;">
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="btn" id="cancelAddTaskProj" style="background:#e2e8f0;color:#222;">Cancel</button>
            <button type="submit" class="btn">Add</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("cancelAddTaskProj").onclick = () => modal.remove();
    document.getElementById("addTaskFormProj").onsubmit = function(e) {
      e.preventDefault();
      const title = document.getElementById("taskTitleInputProj").value.trim();
      const status = document.getElementById("taskStatusInputProj").value;
      if (title && projectId) {
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.push({
          id: Date.now(),
          projectId: projectId,
          title,
          status
        });
        localStorage.setItem("tasks", JSON.stringify(tasks));
        modal.remove();
        // Optionally, show a toast or refresh tasks list if you display it here
      }
    };
  }

  // --- Call insertAddTaskBtn after rendering projects ---
}
