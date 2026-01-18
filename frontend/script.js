document.addEventListener("DOMContentLoaded", () => {
  loadBoard();

  document.getElementById("addBtn").addEventListener("click", addTask);

  document.querySelector(".board").addEventListener("click", (e) => {
    if (!e.target.classList.contains("task")) return;

    const task = e.target;
    const parentId = task.parentElement.id;

    if (parentId === "todo") {
      document.getElementById("inprogress").appendChild(task);
    } else if (parentId === "inprogress") {
      document.getElementById("done").appendChild(task);
    }

    saveBoard();
  });
  document.querySelector(".board").addEventListener("dblclick", (e) => {
  if (!e.target.classList.contains("task")) return;
  
  e.stopPropagation();
  e.target.remove();
  saveBoard();
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

  saveBoard();
}

function saveBoard() {
  const data = {
    todo: document.getElementById("todo").innerHTML,
    inprogress: document.getElementById("inprogress").innerHTML,
    done: document.getElementById("done").innerHTML
  };

  localStorage.setItem("kanbanBoard", JSON.stringify(data));
}

function loadBoard() {
  const data = JSON.parse(localStorage.getItem("kanbanBoard"));
  if (!data) return;

  document.getElementById("todo").innerHTML = data.todo;
  document.getElementById("inprogress").innerHTML = data.inprogress;
  document.getElementById("done").innerHTML = data.done;
}
