const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const port = Number(process.env.PORT) || 3000;
const dataDirectory = path.join(__dirname, "data");

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "tasks.sqlite"));
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/tasks", (request, response) => {
  const tasks = database
    .prepare("SELECT id, title, completed, created_at FROM tasks ORDER BY id DESC")
    .all()
    .map((task) => ({ ...task, completed: Boolean(task.completed) }));

  response.json(tasks);
});

app.post("/api/tasks", (request, response) => {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    return response.status(400).json({ error: "Request body must be a JSON object." });
  }

  const title =
    typeof request.body.title === "string" ? request.body.title.trim() : "";

  if (!title || title.length > 200) {
    return response
      .status(400)
      .json({ error: "Task title must be between 1 and 200 characters." });
  }

  const result = database
    .prepare("INSERT INTO tasks (title) VALUES (?)")
    .run(title);
  const task = database
    .prepare("SELECT id, title, completed, created_at FROM tasks WHERE id = ?")
    .get(result.lastInsertRowid);

  response.status(201).json({ ...task, completed: Boolean(task.completed) });
});

app.patch("/api/tasks/:id", (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: "Invalid task ID." });
  }
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    return response.status(400).json({ error: "Request body must be a JSON object." });
  }

  const fields = [];
  const values = [];

  if (Object.hasOwn(request.body, "title")) {
    const title =
      typeof request.body.title === "string" ? request.body.title.trim() : "";
    if (!title || title.length > 200) {
      return response
        .status(400)
        .json({ error: "Task title must be between 1 and 200 characters." });
    }
    fields.push("title = ?");
    values.push(title);
  }

  if (Object.hasOwn(request.body, "completed")) {
    if (typeof request.body.completed !== "boolean") {
      return response.status(400).json({ error: "Completed must be true or false." });
    }
    fields.push("completed = ?");
    values.push(Number(request.body.completed));
  }

  if (fields.length === 0) {
    return response.status(400).json({ error: "No task fields to update." });
  }

  values.push(id);
  const result = database
    .prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  if (result.changes === 0) {
    return response.status(404).json({ error: "Task not found." });
  }

  const task = database
    .prepare("SELECT id, title, completed, created_at FROM tasks WHERE id = ?")
    .get(id);
  response.json({ ...task, completed: Boolean(task.completed) });
});

app.delete("/api/tasks/:id", (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: "Invalid task ID." });
  }

  const result = database.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (result.changes === 0) {
    return response.status(404).json({ error: "Task not found." });
  }

  response.status(204).end();
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Invalid JSON request body." });
  }

  console.error(error);
  response.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => {
  console.log(`Task app is running at http://localhost:${port}`);
});
