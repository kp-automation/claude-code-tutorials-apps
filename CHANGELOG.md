# Changelog

All notable changes to TaskForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **CSV task export** (`GET /api/projects/:id/export`) — Both tracks now expose an export endpoint that returns all tasks in a project as a `text/csv` download. Columns: `id`, `title`, `description`, `status`, `priority`, `assignee`, `labels`, `created_at`, `updated_at`. Labels are semicolon-separated within their cell. Auth and ownership are enforced identically to other project endpoints.

  **Next.js:** new route at `nextjs/app/api/projects/[id]/export/route.ts`; shared CSV serialization logic lives in `nextjs/lib/utils/csv.ts` (`tasksToCSV`).

  **FastAPI:** new endpoint on the projects router; CSV serialization lives in `fastapi/app/utils/csv_export.py` (`tasks_to_csv`); a new `get_tasks_for_export` service function eager-loads labels and assignee via `selectinload` to avoid N+1 queries.

  **UI:** an "Export CSV" button now appears next to "New Task" on the project detail page and triggers a browser file download.

### Performance

- **`notifyMentions` — parallel inserts + filtered DB query** (`nextjs/lib/notifications.ts`)

  **Problem:** `notifyMentions()` is called on every comment save that contains an `@handle`. It had two compounding issues:

  1. **Full user-table scan.** The Prisma query fetched *every* user (excluding the actor) and filtered down to mentioned users in JavaScript memory. In a 100-person team where a comment mentions 2 people, 98 rows were loaded and discarded.

  2. **Serial notification inserts.** Each `notification.create` call was `await`-ed inside a `for` loop, so mentioning N users cost N sequential DB round trips — each blocking the next.

  **Fix:** Added a `contains`-based `OR` filter to the `findMany` query to narrow candidates at the DB level, and replaced the serial loop with `Promise.all()` so all inserts fire concurrently.

  **Measured improvement** (simulated 20 ms DB round-trip; see `nextjs/scripts/bench-notify-mentions.ts`):

  | Mentions | Before | After | Savings |
  |---|---|---|---|
  | 1 | ~42 ms | ~42 ms | 0% (no change) |
  | 3 | ~84 ms | ~42 ms | **50%** |
  | 5 | ~127 ms | ~42 ms | **67%** |
  | 10 | ~231 ms | ~42 ms | **82%** |

  After the fix, total insert latency is bounded by one round trip regardless of how many users are mentioned. Savings scale linearly with mention count and are proportional to DB round-trip time (remote databases with 50–100 ms latency benefit most).

### Added

- **Tags** — `Tag` model and Alembic migration (`02514e126043_add_tags_table.py`) added to the FastAPI track as a data-layer scaffold; no router or API surface yet.
- **`NotificationType`** string literal union and `NotificationWithRelations` augmented type added to `nextjs/lib/types.ts`; the `Notification` model type is now exported from this module (Next.js).

### Changed

- **Schema — Next.js** — Prisma enum types (`Role`, `ProjectStatus`, `TaskStatus`, `Priority`) replaced with plain `String` columns and string defaults; `lib/types.ts` now declares these unions as string literal types directly (`"ADMIN" | "MEMBER" | "VIEWER"`, etc.) rather than re-exporting Prisma-generated enums. Literal values are unchanged — no data migration required.

---

## [1.0.0] — 2024-01-15

Initial release of TaskForge: a lightweight Linear/Jira-style project management tool shipped as two independent, feature-identical implementations — a Next.js 15 full-stack track and a FastAPI backend track.

### Added

#### Authentication

- Email and password registration with bcrypt password hashing (`bcryptjs` on Next.js, `passlib[bcrypt]` on FastAPI).
- Login endpoint returning a session cookie (Next.js via NextAuth JWT strategy) or a Bearer token (FastAPI via `python-jose` HS256).
- Three user roles: `ADMIN`, `MEMBER`, `VIEWER`. Role is stored on the `User` record and embedded in the session/token at sign-in.
- `GET /api/auth/me` — returns the authenticated user's profile (FastAPI track).
- Protected route middleware: every API endpoint except registration and login requires a valid session or token; unauthenticated requests receive `401`.

#### Projects

- Full project CRUD: `GET`, `POST /api/projects` and `GET`, `PATCH/PUT`, `DELETE /api/projects/{id}`.
- Project fields: `name` (required), `description` (optional), `status` (`ACTIVE` or `ARCHIVED`, defaults to `ACTIVE`).
- Projects are owner-scoped: list and detail queries filter to the authenticated user's own projects.
- `DELETE` cascades to the project's tasks, labels, and comments.
- `GET /api/projects/{id}/tasks` — fetches all tasks for a project in a single call, including assignee data (both tracks).
- `GET /api/projects/{id}/labels` — lists all labels belonging to a project (FastAPI track; Next.js returns labels inside the project detail response).
- `POST /api/projects/{id}/labels` — creates a project-scoped label (both tracks).

#### Tasks and Kanban Board

- Full task CRUD: `GET`, `POST /api/tasks` and `GET`, `PATCH/PUT`, `DELETE /api/tasks/{id}`.
- Task fields: `title` (required), `description`, `status` (`TODO` / `IN_PROGRESS` / `DONE`, defaults to `TODO`), `priority` (`LOW` / `MEDIUM` / `HIGH` / `URGENT`, defaults to `MEDIUM`), `assigneeId` / `assignee_id` (optional foreign key to a user).
- `GET /api/tasks` accepts an optional `projectId` / `project_id` query parameter to filter by project.
- Three-column kanban board UI in the Next.js track: drag tasks between TODO, IN_PROGRESS, and DONE columns.
- Task detail view includes the assignee, parent project, and full comment thread.

#### Labels

- Project-scoped colored labels: `name` (string) and `color` (hex string, e.g. `#ef4444`).
- Many-to-many relationship between tasks and labels via a `TaskLabel` join table.
- Labels cascade-delete when their parent project is deleted.

#### Comments

- Per-task comment threads: `POST /api/comments` (Next.js, with `taskId` in the request body) or `POST /api/tasks/{id}/comments` (FastAPI, task ID in path).
- `GET /api/tasks/{id}/comments` — lists all comments on a task (FastAPI track; Next.js returns comments nested in the task detail response).
- Comments include the `author` with `id`, `name`, and `email`.
- Comment body is scanned for `@mention` patterns on creation; a `MENTION` notification is sent to each matched user (see Notifications).
- Comments cascade-delete when their parent task is deleted.

#### Notifications

- In-app notification system with three event types:
  - `TASK_ASSIGNED` — fired when a task is assigned to a user (on create or when the assignee changes). Not fired if the actor assigns the task to themselves.
  - `TASK_COMPLETED` — fired when a task's status transitions to `DONE` (on create or update). Notifies the assignee and the project owner, excluding the actor.
  - `MENTION` — fired when a comment body matches `@<username>` against existing user records.
- Notification delivery is best-effort: failures are caught and rolled back without failing the parent request.
- `GET /api/notifications` — returns the current user's notifications, newest first. Capped at 50 on the Next.js track; uncapped on FastAPI.
- `GET /api/notifications/unread-count` — lightweight poll endpoint returning `{ "count": N }`.
- `POST /api/notifications/read-all` — marks all unread notifications as read, returns `{ "updated": N }`.
- `POST /api/notifications/{id}/read` — marks a single notification as read; enforces that only the recipient can call it.
- `NotificationBell` component in the Next.js navigation bar polls for unread count and opens a `NotificationDropdown` listing recent notifications.
- `NotificationsProvider` wraps the root layout and keeps the unread count in React context.

#### Widgets

- Scaffold CRUD resource for tutorial exercises: `GET`, `POST /api/widgets` and `GET`, `PATCH/PUT`, `DELETE /api/widgets/{id}`.
- Widgets are user-scoped (owner-only access) and follow the same access-control pattern as projects.
- Current schema has a single `name` field; the resource is intentionally minimal as a starting point for extension exercises.

#### Dashboard

- Landing page (`/`) showing task counts grouped by status (TODO, IN_PROGRESS, DONE) and a recent-activity feed.
- Accessible immediately after login; redirects to `/auth/login` for unauthenticated visitors.

#### Two-Track Architecture

- **Next.js track** (`nextjs/`): full-stack Next.js 15 App Router application with TypeScript, Prisma 5 + SQLite, NextAuth v4, Tailwind CSS, and shadcn/ui. IDs are `cuid()` strings. Schema managed via `prisma db push` (no migrations folder). Tests use Jest + React Testing Library.
- **FastAPI track** (`fastapi/`): Python 3.12+ JSON API with FastAPI 0.115+, SQLAlchemy 2.0, Pydantic v2, and Alembic migrations. IDs are auto-increment integers. Interactive OpenAPI docs at `/docs` and `/redoc`. Tests use pytest + httpx with an in-memory SQLite override.
- Both tracks serve the same HTTP API contract at the same paths with the same request/response shapes (modulo ID type and snake_case / camelCase field naming).
- Seed data: `npm run seed` (Next.js) and `python -m app.seed` (FastAPI) populate sample users, projects, tasks, labels, and comments.

### Changed

Nothing changed — this is the initial release.

### Fixed

Nothing fixed — this is the initial release.

### Removed

Nothing removed — this is the initial release.

---

[Unreleased]: https://github.com/lumenalta/taskforge/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lumenalta/taskforge/releases/tag/v1.0.0
