document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addBtn");

  addBtn.addEventListener("click", addTask);

  // event delegation for moving tasks
  document.querySelector(".board").addEventListener("click", (e) => {
    if (!e.target.classList.contains("task")) return;

    const task = e.target;
    const parentId = task.parentElement.id;

    if (parentId === "todo") {
      document.getElementById("inprogress").appendChild(task);
    } else if (parentId === "inprogress") {
      document.getElementById("done").appendChild(task);
    }
  });
});

function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();

  if (text === "") return;

  const task = document.createElement("div");
  task.className = "task";
  task.textContent = text;

  document.getElementById("todo").appendChild(task);
  input.value = "";
}
