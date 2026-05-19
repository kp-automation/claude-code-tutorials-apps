---
name: task-management
description: Knowledge and operations for TaskForge's task model — create, update, filter, and search tasks across both the Next.js and FastAPI tracks.
allowed-tools:
  - Read
  - Edit
  - Bash
  - Write
---

# Task Management Skill

## Task Model

A `Task` belongs to a `Project` and carries:

| Field        | Type / Values                              | Notes                                      |
|--------------|--------------------------------------------|--------------------------------------------|
| `id`         | string (cuid) · int (auto-increment)       | Next.js uses cuid strings; FastAPI uses ints |
| `title`      | string                                     | Required                                   |
| `description`| string \| null                             | Optional rich text                         |
| `status`     | `TODO` · `IN_PROGRESS` · `DONE`            | Kanban column                              |
| `priority`   | `LOW` · `MEDIUM` · `HIGH` · `URGENT`       | Default `MEDIUM`                           |
| `assigneeId` | User FK \| null                            | Optional; SetNull on user delete           |
| `projectId`  | Project FK                                 | Required; cascade-deletes with project     |
| `labels`     | `Label[]` via `TaskLabel` join             | Many-to-many, project-scoped               |
| `comments`   | `Comment[]`                                | Cascade-deleted with task                  |
| `createdAt`  | datetime                                   |                                            |
| `updatedAt`  | datetime                                   |                                            |

Status and priority are stored as plain strings in Next.js (Prisma) and as Python `enum.Enum` columns in FastAPI — the literal values are identical across both tracks.

## Common Operations

### Create a task

**Next.js API** — `POST /api/tasks`
```json
{
  "title": "Implement login page",
  "description": "Email + password form with validation",
  "status": "TODO",
  "priority": "HIGH",
  "projectId": "<cuid>",
  "assigneeId": "<cuid> | null"
}
```

**FastAPI** — `POST /api/tasks`
```json
{
  "title": "Implement login page",
  "description": "Email + password form with validation",
  "status": "TODO",
  "priority": "HIGH",
  "project_id": 1,
  "assignee_id": 2
}
```

### Update a task (partial)

**Next.js** — `PATCH /api/tasks/{id}`  
**FastAPI** — `PUT /api/tasks/{id}`

Send only the fields to change. FastAPI services use `model_dump(exclude_unset=True)` so omitted fields are not clobbered.

```json
{ "status": "IN_PROGRESS", "priority": "URGENT" }
```

### Move a task across the kanban board

Update the `status` field:
- `TODO` → `IN_PROGRESS` → `DONE`

There is no enforced state machine — any transition is valid.

### Filter tasks by status / priority

**Next.js** (Prisma):
```ts
prisma.task.findMany({
  where: { projectId, status: "IN_PROGRESS", priority: "HIGH" },
  orderBy: { createdAt: "desc" },
})
```

**FastAPI** (SQLAlchemy):
```python
db.query(Task).join(Project).filter(
    Task.project_id == project_id,
    Project.owner_id == user.id,
    Task.status == TaskStatus.IN_PROGRESS,
).all()
```

### Search tasks by title / description

**Next.js** (Prisma):
```ts
prisma.task.findMany({
  where: {
    projectId,
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  },
})
```

**FastAPI** (SQLAlchemy, SQLite `ilike`):
```python
db.query(Task).filter(
    Task.project_id == project_id,
    or_(Task.title.ilike(f"%{query}%"), Task.description.ilike(f"%{query}%")),
).all()
```

### Assign / unassign a task

Send `"assigneeId": "<userId>"` to assign, or `"assigneeId": null` to unassign. The assignee must be a valid User; deleting the user sets the field to `null` (SetNull cascade).

### Add a label

Labels are project-scoped. Use `POST /api/projects/{id}/labels` to create a label, then include `labelIds` in the task create/update body to attach it.

## Best Practices

- **Always scope reads by ownership.** Every query must filter through the project's `owner_id` to prevent cross-user data leaks.
- **Use `IN_PROGRESS` sparingly.** Limit concurrent in-progress tasks per assignee to keep the board actionable — flag if a user has more than ~5.
- **Prefer `URGENT` for blockers only.** Reserve `URGENT` priority for tasks blocking other work; use `HIGH` for near-term deliverables.
- **Set `description` on complex tasks.** A blank description is valid, but tasks with `HIGH`/`URGENT` priority benefit from acceptance criteria in the description field.
- **Keep status and labels in sync.** When moving a task to `DONE`, check whether any associated labels (e.g. "In Review", "Needs QA") should be removed.
- **Deleting tasks is permanent.** There is no soft-delete or archive — confirm intent before calling `DELETE /api/tasks/{id}`. Comments cascade-delete with the task.
- **Cross-track consistency.** Field names differ between tracks (`projectId` vs `project_id`, `assigneeId` vs `assignee_id`) but the HTTP API shape is otherwise identical. When implementing a feature in both tracks, implement and test both before marking it done.
