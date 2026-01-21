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
    `;

    card.onclick = () => {
      localStorage.setItem("activeProject", project.id);
      window.location.href = "board.html";
    };

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

// Initial render
renderProjects();
