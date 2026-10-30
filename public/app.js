const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const clearCompletedButton = document.querySelector("#clear-completed");
const message = document.querySelector("#message");

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status}).`);
  }

  return response.status === 204 ? null : response.json();
}

function showMessage(text) {
  message.textContent = text;
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-complete" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.className = "task-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" complete`);
  checkbox.addEventListener("change", async () => {
    try {
      await request(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: checkbox.checked }),
      });
      await loadTasks();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      showMessage(error.message);
    }
  });

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const removeButton = document.createElement("button");
  removeButton.className = "delete-button";
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", `Delete "${task.title}"`);
  removeButton.innerHTML = "&times;";
  removeButton.addEventListener("click", async () => {
    try {
      await request(`/api/tasks/${task.id}`, { method: "DELETE" });
      await loadTasks();
    } catch (error) {
      showMessage(error.message);
    }
  });

  item.append(checkbox, title, removeButton);
  return item;
}

async function loadTasks() {
  try {
    const tasks = await request("/api/tasks");
    clearMessage();
    taskList.replaceChildren(...tasks.map(createTaskElement));

    const remaining = tasks.filter((task) => !task.completed).length;
    taskCount.textContent = String(remaining);
    emptyState.hidden = tasks.length > 0;
    clearCompletedButton.hidden = !tasks.some((task) => task.completed);
  } catch (error) {
    showMessage(`Couldn't load your tasks. ${error.message}`);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  const submitButton = form.querySelector("button");
  submitButton.disabled = true;
  try {
    await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    input.value = "";
    await loadTasks();
    input.focus();
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

clearCompletedButton.addEventListener("click", async () => {
  try {
    const tasks = await request("/api/tasks");
    await Promise.all(
      tasks
        .filter((task) => task.completed)
        .map((task) => request(`/api/tasks/${task.id}`, { method: "DELETE" })),
    );
    await loadTasks();
  } catch (error) {
    showMessage(error.message);
  }
});

loadTasks();
