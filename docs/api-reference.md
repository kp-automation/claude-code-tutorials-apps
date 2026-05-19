# TaskForge API Reference

This document covers the full HTTP API for both tracks. Both expose the same resources at the same paths, but differ in authentication mechanism, ID types, and a few method choices. Read the [Track differences](#track-differences) section first.

**Base URLs**

| Track | Base URL | Interactive docs |
|-------|----------|------------------|
| Next.js | `http://localhost:3000` | — |
| FastAPI | `http://localhost:8000` | `http://localhost:8000/docs` (Swagger UI), `/redoc` |

---

## Contents

- [Track differences](#track-differences)
- [Authentication](#authentication)
  - [Register](#register)
  - [Sign in — Next.js (NextAuth credentials)](#sign-in--nextjs-nextauth-credentials)
  - [Sign in — FastAPI (login endpoint)](#sign-in--fastapi-login-endpoint)
  - [Get current user](#get-current-user)
- [Projects](#projects)
  - [List projects](#list-projects)
  - [Create project](#create-project)
  - [Get project](#get-project)
  - [Update project](#update-project)
  - [Delete project](#delete-project)
  - [List project tasks](#list-project-tasks)
  - [List project labels](#list-project-labels)
  - [Create project label](#create-project-label)
- [Tasks](#tasks)
  - [List tasks](#list-tasks)
  - [Create task](#create-task)
  - [Get task](#get-task)
  - [Update task](#update-task)
  - [Delete task](#delete-task)
- [Comments](#comments)
  - [List comments](#list-comments)
  - [Create comment](#create-comment)
- [Notifications](#notifications)
  - [List notifications](#list-notifications)
  - [Get unread count](#get-unread-count)
  - [Mark all read](#mark-all-read)
  - [Mark one notification read](#mark-one-notification-read)
- [Widgets](#widgets)
  - [List widgets](#list-widgets)
  - [Create widget](#create-widget)
  - [Get widget](#get-widget)
  - [Update widget](#update-widget)
  - [Delete widget](#delete-widget)
- [Error responses](#error-responses)
- [System endpoints (FastAPI only)](#system-endpoints-fastapi-only)

---

## Track differences

Before using any endpoint, know these key asymmetries:

| Concern | Next.js | FastAPI |
|---------|---------|---------|
| **Auth carrier** | `next-auth.session-token` cookie (httpOnly JWT, set by NextAuth) | `Authorization: Bearer <token>` header |
| **How to authenticate** | Sign in via `/api/auth/callback/credentials` or the UI | `POST /api/auth/login` → copy `access_token` |
| **ID type** | `string` — cuid format (e.g. `"clx1abc123"`) | `integer` (e.g. `1`) |
| **Task filter param** | `?projectId=` (camelCase) | `?project_id=` (snake_case) |
| **Update method** | `PATCH` | `PUT` |
| **Comment endpoint** | `POST /api/comments` with `taskId` in body | `POST /api/tasks/{id}/comments` (nested) |
| **List comments** | Comments are nested in the task detail response | `GET /api/tasks/{id}/comments` (separate endpoint) |
| **GET /api/auth/me** | Not implemented — read identity from the session cookie | Implemented — returns the authenticated user object |
| **Task create ownership check** | Not enforced — any authed user can attach to any `projectId` | Enforced — `403` if the caller does not own the project |
| **Notifications limit** | 50 most recent | All (no server-side cap) |
| **Validation errors** | `400` with Zod issue array: `{ "error": [ ... ] }` | `422` with Pydantic detail array: `{ "detail": [ ... ] }` |
| **Delete response** | `200` with `{ "success": true }` | `204 No Content` (empty body) |
| **Health / root** | Not present | `GET /` and `GET /health` |

---

## Authentication

All endpoints except `POST /api/auth/register` require authentication.

### Register

```
POST /api/auth/register
```

Creates a new user account. No authentication required.

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | yes | valid email format |
| `password` | string | yes | min 6 characters |
| `name` | string | yes | min 2 characters |

**Response `201`**

```json
{
  "user": {
    "id": "clx1abc123",
    "email": "alice@example.com",
    "name": "Alice Johnson"
  }
}
```

> FastAPI adds `role`, `created_at`, and `updated_at` to the response and uses an integer `id`.

**Errors**

| Status | Condition |
|--------|-----------|
| `400` | Email already registered, or validation failure (Next.js) |
| `422` | Validation failure (FastAPI) |

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123", "name": "Alice Johnson"}'
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123", "name": "Alice Johnson"}'
```

---

### Sign in — Next.js (NextAuth credentials)

```
POST /api/auth/callback/credentials
```

Authenticates a user and sets the `next-auth.session-token` session cookie. Use this for scripted access. In the browser, sign in at `/auth/login`.

**Request body** (form-encoded)

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |
| `csrfToken` | string | yes — fetch from `GET /api/auth/csrf` first |
| `json` | string | set to `"true"` |

**Response `200`** — sets `next-auth.session-token` cookie.

**Example** (two-step)

```bash
# Step 1 — get CSRF token
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')

# Step 2 — sign in and save the session cookie
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -c cookies.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=alice@example.com&password=password123&csrfToken=${CSRF}&json=true"

# Step 3 — use the cookie for subsequent requests
curl http://localhost:3000/api/projects -b cookies.txt
```

---

### Sign in — FastAPI (login endpoint)

```
POST /api/auth/login
```

Returns a JWT bearer token. Include this token in every subsequent request as `Authorization: Bearer <token>`.

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

**Response `200`**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@taskforge.com",
    "name": "Admin User",
    "role": "ADMIN",
    "created_at": "2024-01-15T10:00:00",
    "updated_at": "2024-01-15T10:00:00"
  }
}
```

Tokens expire after 30 minutes by default (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

**Errors**

| Status | Condition |
|--------|-----------|
| `401` | Invalid email or password |

**Example**

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@taskforge.com", "password": "admin123"}' \
  | jq -r '.access_token')

# Use the token
curl http://localhost:8000/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

---

### Get current user

FastAPI only — Next.js reads session identity from the cookie rather than exposing a `/me` endpoint.

```
GET /api/auth/me
```

**Authentication** — Bearer token required

**Response `200`**

```json
{
  "id": 1,
  "email": "admin@taskforge.com",
  "name": "Admin User",
  "role": "ADMIN",
  "created_at": "2024-01-15T10:00:00",
  "updated_at": "2024-01-15T10:00:00"
}
```

**Example**

```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Projects

All project endpoints require authentication. List and create operations are scoped to the signed-in user's owned projects.

---

### List projects

```
GET /api/projects
```

Returns all projects owned by the current user, ordered newest-first. Each project includes the owner and full task list.

**Authentication** — required (cookie / Bearer)

**Query parameters** — none

**Response `200`**

```json
[
  {
    "id": "clx1abc123",
    "name": "TaskForge Development",
    "description": "Build the next generation project management tool",
    "status": "ACTIVE",
    "ownerId": "clx0user1",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "owner": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" },
    "tasks": []
  }
]
```

> FastAPI uses snake_case keys (`owner_id`, `created_at`) and integer IDs.

**Next.js example**

```bash
curl http://localhost:3000/api/projects -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

---

### Create project

```
POST /api/projects
```

**Authentication** — required (cookie / Bearer)

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | yes | min 1 character |
| `description` | string | no | — |

> FastAPI also accepts `status` (`"ACTIVE"` or `"ARCHIVED"`, defaults to `"ACTIVE"`).

**Response `201`** — created project with `owner` included.

```json
{
  "id": "clx1abc123",
  "name": "My New Project",
  "description": "Optional description",
  "status": "ACTIVE",
  "ownerId": "clx0user1",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "owner": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" }
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/projects \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Project", "description": "Optional description"}'
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Project", "description": "Optional description"}'
```

---

### Get project

```
GET /api/projects/{id}
```

Returns a single project with its tasks (each including `assignee`), labels, and owner.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Project ID |

**Response `200`**

```json
{
  "id": "clx1abc123",
  "name": "TaskForge Development",
  "description": "Build the next generation project management tool",
  "status": "ACTIVE",
  "ownerId": "clx0user1",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "owner": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" },
  "tasks": [
    {
      "id": "clxtask1",
      "title": "Setup authentication system",
      "status": "DONE",
      "priority": "HIGH",
      "assignee": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" }
    }
  ],
  "labels": [
    { "id": "clxlabel1", "name": "Bug", "color": "#ef4444", "projectId": "clx1abc123" }
  ]
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `404` | Project not found |

> Next.js does not enforce ownership on GET — any authenticated user can fetch any project by ID. FastAPI returns `404` if the caller does not own the project (ownership is baked into the query filter).

**Next.js example**

```bash
curl http://localhost:3000/api/projects/clx1abc123 -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Update project

```
PATCH /api/projects/{id}     # Next.js
PUT   /api/projects/{id}     # FastAPI
```

Partially updates a project. All fields are optional. Only the project owner may update it.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Project ID |

**Request body** (all fields optional)

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | string | min 1 character |
| `description` | string | — |
| `status` | string | `"ACTIVE"` or `"ARCHIVED"` |

**Response `200`** — updated project with `owner` included.

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |
| `403` | Caller is not the project owner |
| `404` | Project not found |

**Next.js example**

```bash
curl -X PATCH http://localhost:3000/api/projects/clx1abc123 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"status": "ARCHIVED"}'
```

**FastAPI example**

```bash
curl -X PUT http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "ARCHIVED"}'
```

---

### Delete project

```
DELETE /api/projects/{id}
```

Permanently deletes a project. Cascades to tasks, labels, and comments. Only the project owner may delete it.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Project ID |

**Response**

- Next.js: `200` with `{ "success": true }`
- FastAPI: `204 No Content`

**Errors**

| Status | Condition |
|--------|-----------|
| `403` | Caller is not the project owner |
| `404` | Project not found |

**Next.js example**

```bash
curl -X DELETE http://localhost:3000/api/projects/clx1abc123 -b cookies.txt
```

**FastAPI example**

```bash
curl -X DELETE http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### List project tasks

```
GET /api/projects/{id}/tasks
```

Returns all tasks for a specific project. Only the project owner may access this endpoint.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Project ID |

**Response `200`** — array of tasks.

- Next.js: each task includes `assignee`, `project`, and `comments` (newest-first).
- FastAPI: returns the Task schema (no nested comments).

**Errors**

| Status | Condition |
|--------|-----------|
| `403` | Caller is not the project owner |
| `404` | Project not found |

**Next.js example**

```bash
curl http://localhost:3000/api/projects/clx1abc123/tasks -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/projects/1/tasks \
  -H "Authorization: Bearer $TOKEN"
```

---

### List project labels

```
GET /api/projects/{id}/labels
```

Returns all labels belonging to the project.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Project ID |

> Next.js does not have a standalone labels GET endpoint — labels are included in the `GET /api/projects/{id}` response. FastAPI exposes this as a separate route.

**Response `200`** (FastAPI)

```json
[
  {
    "id": 1,
    "name": "Bug",
    "color": "#ef4444",
    "project_id": 1
  }
]
```

**FastAPI example**

```bash
curl http://localhost:8000/api/projects/1/labels \
  -H "Authorization: Bearer $TOKEN"
```

---

### Create project label

```
POST /api/projects/{id}/labels
```

Creates a label scoped to a project. Both tracks expose this endpoint.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Project ID |

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | yes | — |
| `color` | string | yes | hex color string (e.g. `"#ef4444"`) |

**Response `201`** — created label.

```json
{
  "id": 1,
  "name": "Bug",
  "color": "#ef4444",
  "project_id": 1
}
```

> The FastAPI implementation has an intentional missing ownership check (teaching surface) — it accepts the label without verifying the caller owns the project.

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/projects/clx1abc123/labels \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "Bug", "color": "#ef4444"}'
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/projects/1/labels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bug", "color": "#ef4444"}'
```

---

## Tasks

---

### List tasks

```
GET /api/tasks
```

Returns tasks visible to the current user. Optionally filtered by project ID.

**Authentication** — required (cookie / Bearer)

**Query parameters**

| Parameter | Track | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `projectId` | Next.js only | string (cuid) | no | Filter to tasks in a specific project |
| `project_id` | FastAPI only | integer | no | Filter to tasks in a specific project |

**Response `200`** — array of tasks.

Next.js includes nested `assignee`, `project`, and `comments` (newest-first) on each task.

```json
[
  {
    "id": "clxtask1",
    "title": "Setup authentication system",
    "description": "Implement NextAuth.js with credentials provider",
    "status": "DONE",
    "priority": "HIGH",
    "projectId": "clx1abc123",
    "assigneeId": "clx0user1",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "assignee": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" },
    "project": { "id": "clx1abc123", "name": "TaskForge Development" },
    "comments": []
  }
]
```

> Next.js does not scope list results to the caller's owned projects — it returns all tasks matching the filter. FastAPI filters by ownership via a join on `projects.owner_id`.

**Next.js example**

```bash
# All tasks
curl http://localhost:3000/api/tasks -b cookies.txt

# Filtered by project
curl "http://localhost:3000/api/tasks?projectId=clx1abc123" -b cookies.txt
```

**FastAPI example**

```bash
# All tasks
curl http://localhost:8000/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# Filtered by project
curl "http://localhost:8000/api/tasks?project_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Create task

```
POST /api/tasks
```

Creates a task. Side effects:
- Fires a `TASK_ASSIGNED` notification if `assigneeId` / `assignee_id` is set (and is not the caller).
- Fires a `TASK_COMPLETED` notification if `status` is `"DONE"` on creation.

**Authentication** — required (cookie / Bearer)

**Request body**

| Field (Next.js) | Field (FastAPI) | Type | Required | Default | Constraints |
|-----------------|-----------------|------|----------|---------|-------------|
| `title` | `title` | string | yes | — | min 1 character |
| `projectId` | `project_id` | string / int | yes | — | must reference an existing project |
| `description` | `description` | string | no | null | — |
| `status` | `status` | string | no | `"TODO"` | `"TODO"`, `"IN_PROGRESS"`, `"DONE"` |
| `priority` | `priority` | string | no | `"MEDIUM"` | `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"` |
| `assigneeId` | `assignee_id` | string / int | no | null | must reference an existing user |

**Response `201`** — created task with `assignee` and `project` included.

```json
{
  "id": "clxtask2",
  "title": "Build task board UI",
  "description": "Create the Kanban view with drag and drop",
  "status": "TODO",
  "priority": "HIGH",
  "projectId": "clx1abc123",
  "assigneeId": "clx0user2",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z",
  "assignee": { "id": "clx0user2", "name": "Bob Smith", "email": "bob@example.com" },
  "project": { "id": "clx1abc123", "name": "TaskForge Development" }
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |
| `403` | FastAPI only — caller does not own the target project |

> Next.js does not verify project ownership before inserting the task (intentional teaching gap).

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/tasks \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build task board UI",
    "projectId": "clx1abc123",
    "priority": "HIGH",
    "assigneeId": "clx0user2"
  }'
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build task board UI",
    "project_id": 1,
    "priority": "HIGH",
    "assignee_id": 2
  }'
```

---

### Get task

```
GET /api/tasks/{id}
```

Returns a single task. Next.js includes nested `assignee`, `project`, and `comments` (oldest-first for chronological thread order). FastAPI returns the flat Task schema without nested comments.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Task ID |

**Response `200`**

```json
{
  "id": "clxtask1",
  "title": "Setup authentication system",
  "description": "Implement NextAuth.js with credentials provider",
  "status": "DONE",
  "priority": "HIGH",
  "projectId": "clx1abc123",
  "assigneeId": "clx0user1",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "assignee": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" },
  "project": { "id": "clx1abc123", "name": "TaskForge Development" },
  "comments": [
    {
      "id": "clxcomment1",
      "content": "Merged and deployed.",
      "taskId": "clxtask1",
      "authorId": "clx0user2",
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z",
      "author": { "id": "clx0user2", "name": "Bob Smith", "email": "bob@example.com" }
    }
  ]
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `404` | Task not found |

**Next.js example**

```bash
curl http://localhost:3000/api/tasks/clxtask1 -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Update task

```
PATCH /api/tasks/{id}    # Next.js
PUT   /api/tasks/{id}    # FastAPI
```

Partially updates a task. All fields are optional. Side effects:
- Fires `TASK_ASSIGNED` when `assigneeId` changes to a new non-null value (and is not the caller).
- Fires `TASK_COMPLETED` when `status` transitions to `"DONE"` from a non-DONE value.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Task ID |

**Request body** (all fields optional)

| Field (Next.js) | Field (FastAPI) | Type | Constraints |
|-----------------|-----------------|------|-------------|
| `title` | `title` | string | min 1 character |
| `description` | `description` | string | — |
| `status` | `status` | string | `"TODO"`, `"IN_PROGRESS"`, `"DONE"` |
| `priority` | `priority` | string | `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"` |
| `assigneeId` | `assignee_id` | string \| null / int \| null | pass `null` to unassign |

**Response `200`** — updated task with `assignee` and `project` included.

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |
| `404` | Task not found |

**Next.js example** — move to done

```bash
curl -X PATCH http://localhost:3000/api/tasks/clxtask1 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"status": "DONE"}'
```

**FastAPI example** — reassign

```bash
curl -X PUT http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignee_id": 2}'
```

**FastAPI example** — unassign

```bash
curl -X PUT http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignee_id": null}'
```

---

### Delete task

```
DELETE /api/tasks/{id}
```

Permanently deletes a task and its comments.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Task ID |

**Response**

- Next.js: `200` with `{ "success": true }`
- FastAPI: `204 No Content`

**Errors**

| Status | Condition |
|--------|-----------|
| `404` | Task not found |

> Neither track enforces ownership on delete — any authenticated user can delete any task by ID. This is an intentional gap in the codebase.

**Next.js example**

```bash
curl -X DELETE http://localhost:3000/api/tasks/clxtask1 -b cookies.txt
```

**FastAPI example**

```bash
curl -X DELETE http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Comments

The two tracks expose comments differently:

| Action | Next.js | FastAPI |
|--------|---------|---------|
| List comments | Included in `GET /api/tasks/{id}` response | `GET /api/tasks/{id}/comments` |
| Create comment | `POST /api/comments` with `taskId` in the body | `POST /api/tasks/{id}/comments` |
| Delete comment | Not implemented | Not implemented |

---

### List comments

FastAPI only — Next.js returns comments nested in the task detail response.

```
GET /api/tasks/{id}/comments
```

Returns all comments for a task (no particular order guarantee).

**Authentication** — required (Bearer)

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Task ID |

**Response `200`**

```json
[
  {
    "id": 1,
    "content": "Looks good to merge.",
    "task_id": 1,
    "author_id": 2,
    "created_at": "2024-01-15T12:00:00",
    "updated_at": "2024-01-15T12:00:00"
  }
]
```

**Errors**

| Status | Condition |
|--------|-----------|
| `404` | Task not found or caller does not own the parent project |

**FastAPI example**

```bash
curl http://localhost:8000/api/tasks/1/comments \
  -H "Authorization: Bearer $TOKEN"
```

---

### Create comment

```
POST /api/comments               # Next.js — taskId in request body
POST /api/tasks/{id}/comments    # FastAPI — task ID in path
```

Adds a comment to a task. After saving, scans `content` for `@mention` patterns and fires a `MENTION` notification for each matched user.

**Authentication** — required (cookie / Bearer)

**Path parameters (FastAPI)**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Task ID |

**Request body**

| Field (Next.js) | Field (FastAPI) | Type | Required | Constraints |
|-----------------|-----------------|------|----------|-------------|
| `content` | `content` | string | yes | min 1 character |
| `taskId` | — (in path) | string (cuid) | yes (Next.js only) | must reference an existing task |

**Response `201`** — created comment with `author` included (Next.js) or flat comment object (FastAPI).

```json
{
  "id": "clxcomment1",
  "content": "Looks good to merge.",
  "taskId": "clxtask1",
  "authorId": "clx0user2",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z",
  "author": { "id": "clx0user2", "name": "Bob Smith", "email": "bob@example.com" }
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |
| `403` | FastAPI — caller does not own the parent project |

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/comments \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"content": "Looks good to merge.", "taskId": "clxtask1"}'
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/tasks/1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Looks good to merge."}'
```

---

## Notifications

Notifications are created automatically by the API when:
- A task is assigned (`TASK_ASSIGNED`)
- A task moves to `DONE` (`TASK_COMPLETED`)
- A comment contains a `@mention` matching a user's name (`MENTION`)

Clients never create notifications directly.

---

### List notifications

```
GET /api/notifications
```

Returns notifications for the current user, newest-first.

**Authentication** — required (cookie / Bearer)

**Query parameters** — none

**Response `200`**

```json
[
  {
    "id": "clxnotif1",
    "userId": "clx0user2",
    "actorId": "clx0user1",
    "type": "TASK_ASSIGNED",
    "taskId": "clxtask1",
    "commentId": null,
    "read": false,
    "createdAt": "2024-01-15T11:30:00.000Z",
    "actor": { "id": "clx0user1", "name": "Alice Johnson", "email": "alice@example.com" },
    "task": { "id": "clxtask1", "title": "Setup authentication system", "projectId": "clx1abc123" },
    "comment": null
  }
]
```

> Next.js returns at most the 50 most recent. FastAPI returns all with no cap.

**Notification `type` values:** `"TASK_ASSIGNED"`, `"TASK_COMPLETED"`, `"MENTION"`

**Next.js example**

```bash
curl http://localhost:3000/api/notifications -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/notifications \
  -H "Authorization: Bearer $TOKEN"
```

---

### Get unread count

```
GET /api/notifications/unread-count
```

Returns the number of unread notifications for the current user.

**Authentication** — required (cookie / Bearer)

**Response `200`**

```json
{ "count": 3 }
```

**Next.js example**

```bash
curl http://localhost:3000/api/notifications/unread-count -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

---

### Mark all read

```
POST /api/notifications/read-all
```

Marks every unread notification for the current user as read. No request body.

**Authentication** — required (cookie / Bearer)

**Response `200`**

```json
{ "updated": 3 }
```

`updated` is the count of notifications changed.

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/notifications/read-all -b cookies.txt
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/notifications/read-all \
  -H "Authorization: Bearer $TOKEN"
```

---

### Mark one notification read

```
POST /api/notifications/{id}/read
```

Marks a single notification as read. Only the notification recipient may call this.

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Notification ID |

**Request body** — none

**Response `200`** — the updated notification with `actor`, `task`, and `comment` included.

**Errors**

| Status | Condition |
|--------|-----------|
| `403` | Caller is not the notification recipient |
| `404` | Notification not found |

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/notifications/clxnotif1/read -b cookies.txt
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/notifications/1/read \
  -H "Authorization: Bearer $TOKEN"
```

---

## Widgets

Widgets are a scaffold resource used as a teaching example in the tutorial series. The schema currently has a single field (`name`) with placeholder `TODO` comments indicating where additional fields should be added when extending the model.

---

### List widgets

```
GET /api/widgets
```

Returns all widgets owned by the current user, newest-first.

**Authentication** — required (cookie / Bearer)

**Response `200`** — array of widget objects. Next.js includes `owner`.

**Next.js example**

```bash
curl http://localhost:3000/api/widgets -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/widgets \
  -H "Authorization: Bearer $TOKEN"
```

---

### Create widget

```
POST /api/widgets
```

**Authentication** — required (cookie / Bearer)

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | yes | min 1 character |

**Response `201`** — created widget. Next.js includes `owner`.

```json
{
  "id": 1,
  "name": "My Widget",
  "owner_id": 1,
  "created_at": "2024-01-15T10:00:00",
  "updated_at": "2024-01-15T10:00:00"
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |

**Next.js example**

```bash
curl -X POST http://localhost:3000/api/widgets \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "My Widget"}'
```

**FastAPI example**

```bash
curl -X POST http://localhost:8000/api/widgets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Widget"}'
```

---

### Get widget

```
GET /api/widgets/{id}
```

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Widget ID |

**Response `200`** — widget object with `owner` included (Next.js).

**Errors**

| Status | Condition |
|--------|-----------|
| `403` | Caller is not the widget owner |
| `404` | Widget not found |

**Next.js example**

```bash
curl http://localhost:3000/api/widgets/clxwidget1 -b cookies.txt
```

**FastAPI example**

```bash
curl http://localhost:8000/api/widgets/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Update widget

```
PATCH /api/widgets/{id}    # Next.js
PUT   /api/widgets/{id}    # FastAPI
```

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Widget ID |

**Request body** (all fields optional)

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | string | min 1 character |

**Response `200`** — updated widget.

**Errors**

| Status | Condition |
|--------|-----------|
| `400` / `422` | Validation failure |
| `403` | Caller is not the widget owner |
| `404` | Widget not found |

**Next.js example**

```bash
curl -X PATCH http://localhost:3000/api/widgets/clxwidget1 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Widget"}'
```

**FastAPI example**

```bash
curl -X PUT http://localhost:8000/api/widgets/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Widget"}'
```

---

### Delete widget

```
DELETE /api/widgets/{id}
```

**Authentication** — required (cookie / Bearer)

**Path parameters**

| Parameter | Type (Next.js) | Type (FastAPI) | Description |
|-----------|----------------|----------------|-------------|
| `id` | string (cuid) | integer | Widget ID |

**Response**

- Next.js: `200` with `{ "success": true }`
- FastAPI: `204 No Content`

**Errors**

| Status | Condition |
|--------|-----------|
| `403` | Caller is not the widget owner |
| `404` | Widget not found |

**Next.js example**

```bash
curl -X DELETE http://localhost:3000/api/widgets/clxwidget1 -b cookies.txt
```

**FastAPI example**

```bash
curl -X DELETE http://localhost:8000/api/widgets/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error responses

### Next.js

All error bodies are JSON.

| Status | Body shape | Meaning |
|--------|------------|---------|
| `400` | `{ "error": [ /* zod issues */ ] }` | Validation failure — `error` is an array of Zod issue objects with `path`, `message`, etc. |
| `400` | `{ "error": "User already exists" }` | Registration with a duplicate email |
| `401` | `{ "error": "Unauthorized" }` | Missing or invalid session cookie |
| `403` | `{ "error": "Forbidden" }` | Caller does not own the resource |
| `404` | `{ "error": "<Resource> not found" }` | ID not found in the database |
| `500` | `{ "error": "Internal server error" }` | Unhandled server error (no diagnostic details exposed) |

### FastAPI

| Status | Body shape | Meaning |
|--------|------------|---------|
| `401` | `{ "detail": "Could not validate credentials" }` | Missing, expired, or invalid Bearer token |
| `403` | `{ "detail": "Forbidden" }` | Caller does not own the resource |
| `404` | `{ "detail": "<Resource> not found" }` | ID not found in the database |
| `422` | `{ "detail": [ /* pydantic issues */ ] }` | Request body or query parameter validation failure |

---

## System endpoints (FastAPI only)

### Root

```
GET /
```

No authentication required.

**Response `200`**

```json
{ "message": "TaskForge API", "docs": "/docs" }
```

### Health check

```
GET /health
```

No authentication required. Returns a simple liveness indicator.

**Response `200`**

```json
{ "status": "healthy" }
```

**Example**

```bash
curl http://localhost:8000/health
```
