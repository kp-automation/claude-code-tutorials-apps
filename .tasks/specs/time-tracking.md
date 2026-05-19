# Time Tracking

**Status:** Draft  
**Author:** Product Manager  
**Date:** 2026-05-14  
**Affected Systems:** Next.js (API routes, UI components, Prisma schema), FastAPI (ORM model, Pydantic schemas, service, router, Alembic migration)

---

## Overview

Time tracking allows users to log hours spent on individual tasks, either by using a start/stop timer in the UI or by entering duration and description manually. Logged entries accumulate against tasks, and a per-project time report aggregates totals by user. This solves the current pain point that enterprise customers must reconcile time data in external tools before generating client invoices — three customers have cited it as a condition for continued or expanded usage. The feature introduces a new `TimeEntry` entity in both tracks, five new API endpoints, and a timer/entry-list UI component on the task detail page.

## User Stories

- As a project member, I want to start and stop a timer on a task so that I can capture time without manually computing elapsed seconds.
- As a project member, I want to create a time entry manually with a duration and description so that I can log time worked retroactively after the fact.
- As a project member, I want to view, edit, and delete time entries I have logged on a task so that I can correct mistakes without involving an administrator.
- As a project owner or member, I want to view all time entries for a task so that I can see how much time the team has collectively spent on it.
- As a project owner, I want a per-project time report grouped by user so that I can generate accurate client invoices and analyze team productivity.

## Acceptance Criteria

### Timer and Manual Entry (UI)
- [ ] The task detail page (`/projects/[id]/tasks/[taskId]`) contains a "Time Tracking" section below the description card.
- [ ] The section shows a "Start Timer" button when no timer is running. Clicking it records `Date.now()` in component state and replaces the button with a running elapsed-time display (updated every second via `setInterval`) and a "Stop" button.
- [ ] Clicking "Stop" opens an inline form with a pre-filled duration (computed from elapsed seconds) and an optional description field. Submitting the form calls `POST /api/tasks/[taskId]/time-entries` and clears the timer state on success.
- [ ] The section also contains a separate "Log Time" button that opens the same manual-entry form without pre-filling duration, allowing retroactive entry at any time.
- [ ] After any successful create, edit, or delete, the entry list refreshes and shows updated entries and the running total for the task.
- [ ] Each entry in the list displays: formatted duration (e.g. "1h 23m"), optional description, author name, and creation date. Entries are ordered newest-first.
- [ ] Edit and delete controls are shown only on entries where `entry.userId === session.user.id` (ownership check in the component).
- [ ] Duration is displayed in a human-readable format (`Xh Ym`). The conversion from seconds happens client-side.

### API — Time Entries on a Task
- [ ] `GET /api/tasks/{id}/time-entries` returns HTTP 200 with an array of time entry objects ordered by `createdAt` descending. Returns 401 if the caller is unauthenticated, 404 if the task does not exist, and 403 if the caller does not own the parent project.
- [ ] `POST /api/tasks/{id}/time-entries` returns HTTP 201 with the created entry. Returns 401 if unauthenticated, 404 if task not found, 403 if caller does not own the parent project, and 422/400 if `durationSeconds` is zero, negative, or missing.
- [ ] `PATCH /api/time-entries/{id}` (FastAPI) / `PATCH /api/time-entries/[id]` (Next.js) returns HTTP 200 with the updated entry. Returns 401 if unauthenticated, 404 if entry not found, and 403 if the caller is not the entry owner.
- [ ] `DELETE /api/time-entries/{id}` returns HTTP 200 `{ success: true }` (Next.js) or HTTP 204 (FastAPI). Returns 401 if unauthenticated, 404 if entry not found, and 403 if the caller is not the entry owner.
- [ ] `GET /api/projects/{id}/time-report` returns HTTP 200 with an array of objects `{ userId, userName, userEmail, totalSeconds, entryCount }` for all users who have logged time on any task in the project. Returns 401 if unauthenticated and 403/404 if the project does not belong to the caller.
- [ ] A `POST` with `durationSeconds` equal to 0 or a negative integer returns a 422 (FastAPI) or 400 (Next.js) error response; no entry is created.

### Data Integrity
- [ ] Deleting a task cascades to all of its time entries — no orphaned `TimeEntry` rows remain after a task deletion.
- [ ] Deleting a user cascades to their authored time entries (consistent with cascade behavior on `Comment`).
- [ ] `npx prisma db push` + `npm test` in `nextjs/` pass without modifications to existing tests.
- [ ] `alembic upgrade head` + `pytest` in `fastapi/` pass without modifications to existing tests.

## Technical Notes

### Affected Systems

**Next.js track**
- `nextjs/prisma/schema.prisma` — add `TimeEntry` model and relations on `User` and `Task`
- `nextjs/app/api/tasks/[id]/time-entries/route.ts` — new file: GET list + POST create
- `nextjs/app/api/time-entries/[id]/route.ts` — new file: PATCH update + DELETE
- `nextjs/app/api/projects/[id]/time-report/route.ts` — new file: GET aggregate report
- `nextjs/app/projects/[id]/tasks/[taskId]/page.tsx` — add "Time Tracking" section with timer and entry list
- `nextjs/components/time-tracking.tsx` — new component (timer UI + entry list + manual-entry form)
- `nextjs/lib/types.ts` — add `TimeEntryWithUser` detail type (for use in route handlers only, not in the component)
- `nextjs/tests/components/time-tracking.test.tsx` — new React Testing Library file covering timer state rendering, conditional edit/delete controls, and form behavior

**FastAPI track**
- `fastapi/app/models/time_entry.py` — new SQLAlchemy ORM model
- `fastapi/app/models/task.py` — add `time_entries` back-relationship with `cascade="all, delete-orphan"`
- `fastapi/app/models/user.py` — add `time_entries` back-relationship with `cascade="all, delete-orphan"` (see Architecture Considerations for the exact field definition)
- `fastapi/app/models/__init__.py` — import `TimeEntry` and add it to `__all__` so Alembic autogenerate can discover the new model
- `fastapi/app/schemas/time_entry.py` — new Pydantic schemas (Base / Create / Update / Response)
- `fastapi/app/services/time_entry_service.py` — new service module
- `fastapi/app/routers/time_entries.py` — new router file with two `APIRouter` instances (see Architecture Considerations for the exact structure)
- `fastapi/app/main.py` — register both router objects with separate `app.include_router()` calls
- `fastapi/alembic/versions/` — autogenerated migration for `time_entries` table
- `fastapi/tests/test_time_entries.py` — new pytest file covering auth guards, happy-path CRUD for all five endpoints, invalid duration rejection, project/entry ownership enforcement, cascade behavior, and the time report endpoint

### Architecture Considerations

**Data model — `TimeEntry`**

Both tracks must define an equivalent entity. The canonical fields are:

| Field | Type | Notes |
|---|---|---|
| `id` | string (Next.js cuid) / int (FastAPI autoincrement) | Primary key |
| `durationSeconds` / `duration_seconds` | int, not null | Must be > 0; stored as integer seconds |
| `description` | string, nullable | Optional free-text note |
| `taskId` / `task_id` | FK → Task | Cascade delete — deleting the task deletes all entries |
| `userId` / `user_id` | FK → User | Cascade delete — deleting the user deletes their entries |
| `createdAt` / `created_at` | datetime | Set at creation, not updateable |
| `updatedAt` / `updated_at` | datetime | Auto-updated on mutation |

Prisma schema addition (Next.js):

```prisma
model TimeEntry {
  id              String   @id @default(cuid())
  durationSeconds Int
  description     String?
  taskId          String
  userId          String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add back-relations on `Task` (`timeEntries TimeEntry[]`) and `User` (`timeEntries TimeEntry[]`).

SQLAlchemy model (FastAPI) follows the same field set with `Mapped[int]` for `duration_seconds`, `nullable=False`, `ForeignKey("tasks.id", ondelete="CASCADE")`, and `ForeignKey("users.id", ondelete="CASCADE")`.

Add `time_entries` relationship on `Task` with `cascade="all, delete-orphan"`.

Add the following relationship on `User` in `fastapi/app/models/user.py`:

```python
time_entries: Mapped[list["TimeEntry"]] = relationship("TimeEntry", back_populates="user", cascade="all, delete-orphan")
```

This mirrors the `notifications` relationship already present on the `User` model and is required for cascade delete when a user is deleted.

**FastAPI router structure**

`fastapi/app/routers/time_entries.py` must contain **two** `APIRouter` instances:

1. `router_tasks = APIRouter(prefix="/api/tasks", tags=["time-entries"])` — declares the two nested endpoints: `GET /{task_id}/time-entries` and `POST /{task_id}/time-entries`.
2. `router_entries = APIRouter(prefix="/api/time-entries", tags=["time-entries"])` — declares the two detail endpoints: `PATCH /{id}` and `DELETE /{id}`.

Both router objects must be registered in `fastapi/app/main.py` with separate `app.include_router()` calls:

```python
app.include_router(router_tasks)
app.include_router(router_entries)
```

This mirrors the pattern already established by `routers/comments.py`, which is also registered under `prefix="/api/tasks"` alongside the existing tasks router. FastAPI resolves route collisions by match order, so multiple routers sharing the same prefix coexist without conflict.

Do not use a single `APIRouter` with no prefix and explicit full paths on every endpoint — that approach does not match the project's established conventions.

**Time report query**

`GET /api/projects/{id}/time-report` performs a GROUP BY aggregation. In FastAPI, use SQLAlchemy `func.sum` and `func.count`:

```python
db.query(
    TimeEntry.user_id,
    func.sum(TimeEntry.duration_seconds).label("total_seconds"),
    func.count(TimeEntry.id).label("entry_count"),
)
.join(Task, TimeEntry.task_id == Task.id)
.join(Project, Task.project_id == Project.id)
.filter(Project.id == project_id, Project.owner_id == user.id)
.group_by(TimeEntry.user_id)
.all()
```

The GROUP BY returns `user_id` values. A second query resolves user names and emails (`db.query(User).filter(User.id.in_(user_ids)).all()`). Build a dict keyed by `user_id` for O(1) lookup, then merge the two result sets in application code before returning.

In Next.js, use a Prisma `groupBy`:

```ts
prisma.timeEntry.groupBy({
  by: ["userId"],
  where: { task: { projectId: id } },
  _sum: { durationSeconds: true },
  _count: { id: true },
})
```

Because `groupBy` does not support `include`, a second query must fetch user names/emails by the returned `userId` values. Join the two result sets in application code before returning.

**Access control for time report**

The report endpoint must verify the caller owns the project. Pattern: fetch the project filtered by `ownerId === session.user.id` (Next.js) or `Project.owner_id == user.id` (FastAPI); return 404/403 if it is missing; then run the aggregate query scoped to that `projectId`.

**Pydantic schema chain (FastAPI)**

```
TimeEntryBase        — duration_seconds: int = Field(gt=0), description
TimeEntryCreate      — (inherits Base; no extra required fields — task_id comes from path param)
TimeEntryUpdate      — duration_seconds: int | None = Field(default=None, gt=0), description?: str | None
TimeEntry (response) — id, task_id, user_id, created_at, updated_at + from_attributes=True
```

The `duration_seconds` field must use `Field(gt=0)` (imported from `pydantic`) in both `TimeEntryBase` and `TimeEntryUpdate`. This is the mechanism that causes FastAPI to return a 422 Unprocessable Entity automatically when zero or a negative value is submitted — the `int` type annotation alone does not enforce this constraint.

The `user_id` field must be included in the response so the Next.js component can conditionally render edit/delete controls.

**Zod schema (Next.js)**

```ts
const timeEntryCreateSchema = z.object({
  durationSeconds: z.number().int().positive(),
  description: z.string().optional(),
});

const timeEntryUpdateSchema = z.object({
  durationSeconds: z.number().int().positive().optional(),
  description: z.string().optional(),
});
```

**Next.js component type imports**

The `time-tracking.tsx` component must import its entry types from `@prisma/client` directly (e.g., `import type { TimeEntry, User } from "@prisma/client"`), not from `@/lib/types`. The `TimeEntryWithUser` detail type added to `nextjs/lib/types.ts` is for use in route handler files only (where augmented types are appropriate), not in component files. This follows the project convention established in CLAUDE.md.

**Eager loading on the time-entry list (no N+1)**

`GET /api/tasks/[id]/time-entries` must return entries with author information included. In Next.js, the Prisma query must use `include: { user: { select: { id: true, name: true, email: true } } }` to avoid per-entry lazy fetches. In FastAPI, the service query must use `joinedload` on the `user` relationship when fetching time entries, so that author data is resolved in a single SQL join rather than one query per entry.

### Dependencies

- Prisma `groupBy` (already available in the installed version; no new package required)
- SQLAlchemy `func` (already imported in `notification_service.py` — no new import needed at the DB layer)
- `lucide-react` icons for the timer UI (`Timer`, `Play`, `Square`, `Pencil`, `Trash2`) — already a dependency in `nextjs/package.json` via shadcn/ui
- No new npm or PyPI packages are required

### Security & Permissions

Authorization follows the established ownership model exactly:

- **Read and create time entries on a task:** the caller must own the parent project (`Project.owner_id == user.id` / `project.ownerId === session.user.id`). This is the same gate used by `GET /api/tasks/{task_id}/comments`.
- **Edit and delete a time entry:** the caller must be the entry's owner (`TimeEntry.user_id == user.id` / `timeEntry.userId === session.user.id`). This is analogous to the comment ownership pattern. The two-step fetch-then-check pattern applies: fetch → 404 if missing → 403 if not owner → mutate.
- **Time report:** the caller must own the project. The ownership check runs before the aggregate query.
- ADMIN/MEMBER/VIEWER roles do not gate time entry access. The open question from the feature request — whether VIEWER role users may log time — is resolved by the existing ownership model: if a VIEWER owns a project, they can log time; if they do not own the project, they have no access to its tasks at all under the current auth model. No special VIEWER restriction needs to be added.
- `userId` / `user_id` on a new entry is always set from `session.user.id` / `current_user.id` server-side. The client never supplies this field.

### Performance Considerations

- The time report endpoint runs a GROUP BY across all `TimeEntry` rows for a project. For projects with many tasks and entries over time, this query may become slow. An index on `(task_id)` on `time_entries` covers the join; a composite index on `(task_id, user_id)` is worth adding if profiling reveals it is necessary, but is not required at launch.
- The task detail page currently fetches comments inline in `GET /api/tasks/[id]`. Time entries should be fetched as a separate request (`GET /api/tasks/[id]/time-entries`) rather than embedded in the task response, to avoid inflating an already-used endpoint and to keep the task payload size predictable.
- The running timer uses `setInterval` at 1-second resolution. Only one timer should be active at a time per browser tab. The component must clear the interval on unmount (return a cleanup function from `useEffect`) to prevent memory leaks.

## Edge Cases & Error Scenarios

- **Zero or negative duration:** `POST /api/tasks/{id}/time-entries` with `durationSeconds <= 0` must be rejected. FastAPI returns 422 automatically via Pydantic `Field(gt=0)` on `duration_seconds` in the schema; Zod's `z.number().int().positive()` produces a 400 in Next.js. The UI should disable the submit button and show an inline error message when duration is blank or zero.
- **Timer abandoned without stopping:** if the user navigates away from the task detail page while a timer is running, the timer state is lost (it is held in component state). This is by design per the feature request ("the timer is client-side"). The UI should show a browser `beforeunload` warning only if a timer is actively running.
- **Task deleted while timer is running:** the `POST` to create the entry will return 404. The UI should surface this as a user-facing error ("This task no longer exists") rather than silently failing.
- **Concurrent edit of the same entry:** the last writer wins. No optimistic locking is required at this scope.
- **Entry updated with no fields changed:** `PATCH` with an empty body or all-`undefined` fields should be accepted (Pydantic `exclude_unset` / Zod `.optional()` ensures no fields are overwritten); the entry is returned unchanged.
- **Time report for a project with no entries:** the endpoint returns an empty array `[]`, not a 404. This is not an error condition.
- **Time report for a project the caller does not own:** returns 404 (consistent with how `GET /api/projects/{id}` behaves — callers who do not own a project cannot distinguish "not found" from "forbidden" to prevent enumeration).
- **Very large duration values:** no upper bound is enforced at the application layer. SQLite / Postgres `INTEGER` supports values up to ~2.1 billion seconds (~68 years), which is sufficient. The UI may optionally cap the manual entry form at a reasonable maximum (e.g. 86400 seconds = 24 hours per entry) for UX reasons.
- **Unauthenticated access to any time-entry endpoint:** every handler checks session/token first and returns 401 before touching the database.

## Out of Scope

- **Billing and invoicing logic:** the report surfaces raw totals only. No invoice generation, rate calculation, or currency conversion.
- **Server-side timer state:** there is no "active timer" record on the server. If a user closes the tab mid-timer, the session is lost. Persistent server-side timers are a future enhancement.
- **VIEWER role restriction on logging time:** the feature request flags this as TBD. No role-based gate is added at this time; the decision is deferred to a follow-up stakeholder discussion.
- **Task-level total in the task list / kanban board:** displaying aggregated time on `TaskCard` or in the kanban columns is a future enhancement.
- **Export of time reports to CSV:** the report endpoint returns JSON only. CSV export is a separate feature.
- **Notifications triggered by time logging:** no notification type is added for time entries.
- **Tag model changes:** the FastAPI-only `Tag` entity is unrelated and must not be modified.
- **Pagination of time entries:** entries are returned in full. Pagination is a future concern if entry counts become large.
- **Multi-project or cross-user reports:** the time report is scoped to a single project owned by the calling user. Org-level rollup reports are out of scope.
