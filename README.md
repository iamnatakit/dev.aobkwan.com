# dev.aobkwan.com — Daylight Node.js + SQLite task app

A small full-stack starter application with a responsive browser frontend, an Express API, and a local SQLite database.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm start` for a regular server process.

The database is created automatically at `data/tasks.sqlite` the first time the server starts. The `data` directory and database file are generated at runtime and should not be committed.

## API

- `GET /api/tasks` — list tasks
- `POST /api/tasks` — create a task with `{ "title": "..." }`
- `PATCH /api/tasks/:id` — update `title` and/or `completed`
- `DELETE /api/tasks/:id` — delete a task

The server uses parameterized SQL statements and validates task input. Set the `PORT` environment variable to use a port other than `3000`.
