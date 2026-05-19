# Add Notifications System

Date: 2026-04-29
Status: TODO

## Overview

Build an in-app notification system for TaskForge so users are alerted when work that concerns them changes hands. Three trigger events for the MVP: a task is assigned to the user, a task assigned to or created by the user is marked DONE, and the user is @mentioned in a comment body. Notifications are persisted in the database, surfaced via a bell icon in the app header with an unread-count badge, and viewable through a dropdown panel where the user can dismiss (mark read) individual entries or clear all. Updates are pulled via short-interval polling from the client — no WebSocket / SSE infrastructure for v1.

Both tracks ship the feature: Next.js gets the full UI plus the persistence + API; FastAPI gets the matching JSON API and database model so the contracts stay aligned.

## Why

- **Closes a visibility gap.** Today a user has no way to learn that a teammate assigned them a task or replied to one of their comments without manually re-opening every project board. The kanban view only shows current state, not deltas.
- **Mentions unlock async collaboration.** The comment thread already exists but there's no signal that someone addressed you specifically — `@alice` in a comment is currently just text.
- **Polling keeps the MVP cheap.** A real-time push channel (WebSocket / SSE / Pusher) would force infra decisions (sticky sessions, fan-out, auth on the socket) that are out of scope for a teaching-oriented codebase. Polling every ~30s is good enough for a board that changes a few times an hour and lets us ship the data model + UI now and revisit transport later.
- **Sets up future work.** Once the `Notification` table exists, email/digest delivery and richer event types (label added, comment reply, status change) are additive — they just write more rows.

## Assumptions

- **Scope of triggers is exactly three for v1:** `TASK_ASSIGNED`, `TASK_COMPLETED`, `MENTION`. No notifications for project membership changes, label edits, comment edits, status transitions other than → DONE, or self-actions (assigning a task to yourself does not notify yourself).
- **Mentions use a simple `@<name>` syntax** matched against `User.name` (case-insensitive, whole-word) at comment-create time. No autocomplete UI in v1 — the user types the name plain and the server resolves it. Ambiguous names (two users with the same `name`) notify all matches; we accept that as a known limitation.
- **One notification row per (recipient, event)** — no deduping or batching. If Alice assigns Bob the same task twice in a row, Bob gets two rows.
- **Polling interval is 30 seconds** when the tab is focused; paused when the tab is hidden (uses `document.visibilitychange`). The endpoint is cheap (indexed read scoped to the current user) so this is fine for the MVP load.
- **Dismiss = mark read, not delete.** Read notifications stay in the table for history but drop out of the unread count. A separate "clear all" action marks every unread row as read in one request. No hard-delete UI in v1.
- **Authorization is by recipient ownership** — same pattern the rest of the app uses (`Notification.user_id == current_user.id` / `recipientId === session.user.id`). No admin override.
- **Cross-track parity holds:** the `Notification` entity, its fields, and the API shape (`GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`) match between Next.js and FastAPI. ID wire types still differ (string cuid vs. int) per existing convention.
- **Cascade rules:** deleting a `User` cascades to their notifications; deleting the source `Task` or `Comment` sets the FK to NULL (the notification still shows in history with a "task removed" fallback in the UI) so we don't lose audit trail.
- **No email / push delivery in v1.** In-app only. The schema should leave room for a `delivered_at` / channel column later but doesn't need to populate it now.
- **Intentional-imperfection policy still applies** per `CLAUDE.md` — match the surrounding code style on each track; don't refactor adjacent handlers while adding this feature.

## Acceptance Criteria

**Data model (both tracks)**
- [ ] New `Notification` entity exists in `nextjs/prisma/schema.prisma` and `fastapi/app/models/notification.py` with: `id`, `userId` (recipient, FK → User, cascade delete), `type` (string: `TASK_ASSIGNED` | `TASK_COMPLETED` | `MENTION`), `taskId` (nullable FK → Task, SetNull), `commentId` (nullable FK → Comment, SetNull), `actorId` (FK → User, the user who caused the event), `read` (boolean, default false), `createdAt`.
- [ ] FastAPI uses a Python `enum.Enum` for `type`; Next.js stores it as a plain string. The literal values match across tracks.
- [ ] Alembic migration generated and applied on the FastAPI side; `npx prisma db push` works on the Next.js side.
- [ ] `User` model on both tracks gains the inverse relation (`notifications`).

**Notification creation (server-side triggers)**
- [ ] Assigning a task to a user (POST/PATCH on `/api/tasks` setting `assigneeId`) creates a `TASK_ASSIGNED` notification for the assignee, unless assignee == actor.
- [ ] Updating a task's status to `DONE` creates a `TASK_COMPLETED` notification for the task's `assigneeId` (if set) and for the project's `ownerId`, deduped if they're the same user, and skipped for whichever of them is the actor.
- [ ] Creating a comment whose body contains `@<name>` (case-insensitive, word-boundary) creates one `MENTION` notification per matched user, excluding the comment author.
- [ ] Notification creation is best-effort: a failure to write the notification row must not fail the parent request (task update / comment create still returns success).

**API**
- [ ] `GET /api/notifications` returns the current user's notifications, newest first, with `actor` (`{id, name, email}`), and `task` / `comment` summaries when the FKs are non-null. Implemented on both tracks with matching response shape.
- [ ] `GET /api/notifications/unread-count` returns `{ count: <int> }` for the current user. (Separate endpoint so the badge poll is cheap.)
- [ ] `POST /api/notifications/:id/read` marks one notification read (404 if missing, 403 if not the recipient).
- [ ] `POST /api/notifications/read-all` marks all of the current user's unread notifications read; returns `{ updated: <int> }`.
- [ ] All four endpoints reject unauthenticated requests with 401.

**UI (Next.js only)**
- [ ] Bell icon component lives in the app header, visible on every authenticated page.
- [ ] Badge shows unread count when > 0; hidden when 0; capped display at "9+".
- [ ] Clicking the bell opens a dropdown panel listing the most recent ~20 notifications with: actor name, event verb ("assigned you", "completed", "mentioned you in"), task/comment context, relative timestamp, and a dismiss control per row.
- [ ] "Mark all as read" action in the dropdown header.
- [ ] Clicking a notification row navigates to the relevant task (`/projects/<projectId>?task=<taskId>`) and marks it read.
- [ ] Polling fetches `unread-count` every 30s while the tab is visible; pauses on `visibilitychange` hidden, resumes on visible.
- [ ] Dropdown fetches the full list lazily on open (not on every poll).

**Tests**
- [ ] FastAPI: pytest covers (a) creating a task with `assignee_id` produces a notification for the assignee but not for self-assignment, (b) marking a task DONE notifies the assignee + project owner, (c) `@name` in a comment creates a MENTION row, (d) `read-all` only touches the caller's unread rows.
- [ ] Next.js: at least one Jest test for the bell component (renders badge with count, hides at 0) and one for the API route's auth gating (401 path).

**Docs**
- [ ] FastAPI README's "API Endpoints" section lists the four new routes.
- [ ] Seed script (both tracks) creates a couple of sample notifications for `alice` so the UI renders something on first load.

## Plan

The work splits cleanly into a backend-first pipeline (model → triggers → HTTP) and a frontend stack on top (data hook → UI), capped by tests, seed, and docs. Phases 1–3 land on FastAPI and Next.js in parallel because both tracks share the schema and contract. Phases 4–5 are Next.js only. Each phase ends in a verifiable, demoable state; do not start phase N+1 until phase N's "done when" gate is green on both tracks.

### Phase 0 — Alignment & scaffolding (½ day)

Lock the contract before any code lands so the two tracks don't diverge.

- Pin literal enum values: `TASK_ASSIGNED`, `TASK_COMPLETED`, `MENTION`. Add to `nextjs/lib/types.ts` as `NotificationType` union and to a new `fastapi/app/models/notification.py` Python `enum.Enum` (in phase 1).
- Pin the response shape for `GET /api/notifications`. Concretely:
  ```jsonc
  {
    "id": "<cuid|int>",
    "type": "TASK_ASSIGNED",
    "read": false,
    "createdAt": "2026-04-29T12:00:00Z",
    "actor":   { "id": "...", "name": "Alice", "email": "a@x.com" },
    "task":    { "id": "...", "title": "...", "projectId": "..." } | null,
    "comment": { "id": "...", "body": "..." } | null
  }
  ```
  This is the document both tracks build to. Write it down in this file (or a comment in code) before starting phase 3.
- Confirm the bell sits inside `app/layout.tsx`'s `<nav className="border-b">` (already the only persistent chrome) — no new layout file needed.
- Decide where notification-creation helpers live. Recommendation: FastAPI gets `app/services/notification_service.py`; Next.js gets `lib/notifications.ts`. (Phase 2 creates these.)

**Done when:** the response shape and enum values are written into this file, and both teammates / both tracks agree.

---

### Phase 1 — Backend: data model (1 day, parallel across tracks)

Just the table and relations. No logic, no routes.

**FastAPI**
1. New `fastapi/app/models/notification.py` — `Notification` SQLAlchemy model with `id`, `user_id` (FK→`users.id`, `ondelete="CASCADE"`), `type` (`Enum(NotificationType)`), `actor_id` (FK→`users.id`, NOT NULL — actor is required), `task_id` (FK→`tasks.id`, `ondelete="SET NULL"`, nullable), `comment_id` (FK→`comments.id`, `ondelete="SET NULL"`, nullable), `read` (Boolean, default False), `created_at` (DateTime, server default now). Add the matching `enum.Enum` class in the same file.
2. Edit `fastapi/app/models/user.py`: add `notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan", foreign_keys="Notification.user_id")`. The `actor_id` FK does *not* need an inverse on `User` (we never list "notifications I caused").
3. Run `alembic revision --autogenerate -m "add notifications table"`; sanity-check the generated migration in `alembic/versions/` (no hand edits — but verify the FKs and cascade match what we asked for); then `alembic upgrade head`.
4. New `fastapi/app/schemas/notification.py` — `NotificationBase`, `NotificationCreate` (internal use, not exposed), `Notification` (response, with `model_config = ConfigDict(from_attributes=True)`). Includes nested `UserSummary`, `TaskSummary`, `CommentSummary` shapes.

**Next.js**
1. Edit `nextjs/prisma/schema.prisma`: add `model Notification { ... }` with the same fields; cuid IDs; `type String @default(...)` (no Prisma enum, per the existing string-storage convention); cascade on `user`, `SetNull` on `task` and `comment`. Add the inverse `notifications Notification[]` to `User`.
2. Edit `nextjs/lib/types.ts`: add `export type NotificationType = "TASK_ASSIGNED" | "TASK_COMPLETED" | "MENTION";` and a `NotificationWithRelations` augmented type (Prisma `Notification & { actor: ..., task: ... | null, comment: ... | null }`).
3. `npx prisma db push && npx prisma generate`.

**Done when:** both DBs apply cleanly and a one-off REPL/script can `INSERT` then `SELECT` a notification row on each side. No HTTP yet.

**Risk to flag:** if `notifications` is the first new table since the FastAPI repo went live, the autogenerate may also try to "fix" the existing Enum columns to match Python class names — review the generated migration and revert any unrelated diff before applying.

---

### Phase 2 — Backend: notification creation logic (1–2 days, parallel)

Build the helper, then wire it into the three trigger sites. Best-effort writes (try/except around each call) so the parent request never fails because of a notification bug.

**Helper module — same shape on both tracks**

```
notify_task_assigned(actor, task)            # no-op if assignee == actor or assignee is None
notify_task_completed(actor, task)           # notifies assignee and project owner; dedupes; skips actor
notify_mentions(actor, comment)              # parses @<name>, queries User by case-insensitive name, fans out
```

**FastAPI**
1. New `fastapi/app/services/notification_service.py` exporting the three helpers above plus a private `_create(db, user_id, type_, actor_id, task_id=None, comment_id=None)` writer that does `db.add()` + `db.commit()` + best-effort try/except logging (use the codebase's existing logging style — currently none, so just swallow with a `# best-effort` comment).
2. Wire `notify_task_assigned` into `task_service.create_task` (when `task_data.assignee_id` is set) and `task_service.update_task` (when the patch sets a new assignee that differs from the previous value).
3. Wire `notify_task_completed` into `task_service.update_task` when the new status is `DONE` and the prior status was *not* `DONE` (avoid duplicate fires on PUTs that don't change status).
4. Wire `notify_mentions` into the comment-create path. Per `CLAUDE.md`'s note that `comments.py` mixes raw SQL `select()` with ORM `db.query()` *intentionally*, do not refactor — just call the helper from wherever the create currently commits.
5. Mention parser: a small pure function `parse_mentions(body: str) -> list[str]` returning lowercased names; matched against `User` via `func.lower(User.name).in_(names)`. Whole-word boundary in the regex (`r"@([A-Za-z0-9_]+)"`).

**Next.js**
1. New `nextjs/lib/notifications.ts` with the same three helpers, async, taking `prisma` from `@/lib/db`. Internal `_create` writes via `prisma.notification.create()` inside a try/catch that swallows.
2. Wire into `app/api/tasks/route.ts` (POST, when `assigneeId` is set) and `app/api/tasks/[id]/route.ts` (PATCH, on assignee change and status→DONE transition).
3. Wire into `app/api/comments/route.ts` (POST) and run `parseMentions(body)` against `prisma.user.findMany({ where: { name: { in: names, mode: "insensitive" } } })`.
4. The parent route returns success regardless of notification outcome.

**Done when:** unit tests on each track confirm a row appears in `notifications` after each of the three trigger actions (covered properly in phase 6, but ad-hoc checks via Prisma Studio / sqlite CLI are fine here).

**Decision point:** transitions on PATCH that *unset* assignee (assignee → null) intentionally do *not* notify the previous assignee. Confirm before coding — this is implicit in the AC.

---

### Phase 3 — Backend: HTTP API (1 day, parallel)

Four endpoints on each track, matching the response shape locked in phase 0.

**FastAPI** — new `fastapi/app/routers/notifications.py` (registered in `app/main.py` via `app.include_router(notifications_router)`):
- `GET /api/notifications` → `list[Notification]`, ordered by `created_at desc`, limit 50.
- `GET /api/notifications/unread-count` → `{ "count": int }`.
- `POST /api/notifications/{notification_id}/read` → returns the updated `Notification`. Service raises `NotFoundException` (→ 404) if missing, `ForbiddenException` (→ 403) if `user_id != current_user.id`.
- `POST /api/notifications/read-all` → `{ "updated": int }`. Single `UPDATE ... WHERE user_id = :uid AND read = false`.

Service functions live in `notification_service.py` next to the creation helpers: `list_for_user`, `unread_count`, `mark_read`, `mark_all_read`. Follow the `(db, ...args, user)` convention.

**Next.js** — new files:
- `app/api/notifications/route.ts` — `GET` only.
- `app/api/notifications/unread-count/route.ts` — `GET` only.
- `app/api/notifications/[id]/read/route.ts` — `POST`. Detail-route conventions: `params` is `Promise<{ id: string }>`, fetch → 404 → 403 → mutate.
- `app/api/notifications/read-all/route.ts` — `POST`.

All four start with `getServerSession(authOptions)` → 401-on-null, then scope by `recipientId` (we'll name it `userId` in schema; in handler code `(session.user as any).id`). The list `include`s `actor` / `task` / `comment` with the canonical `{ id, name, email }` user projection.

**Done when:** `curl` against both tracks (with a seeded user's auth) returns the same JSON shape for the same data state. Status codes match: 401/404/403/200/201.

---

### Phase 4 — Frontend: data layer + polling hook (1 day, Next.js only)

Single hook that owns all notification client state. Prefer one shared hook over scattering `fetch()` calls in components.

1. New `nextjs/lib/use-notifications.ts` — a custom hook wrapping React state. Internal state: `{ unreadCount: number, items: Notification[] | null, listLoaded: boolean }`. Returns `{ unreadCount, items, refresh, openDropdown, markRead, markAllRead }`.
2. Polling: `useEffect` runs `fetch("/api/notifications/unread-count")` every 30s via `setInterval`, gated on `document.visibilityState === "visible"`. Add a `visibilitychange` listener that clears/restarts the interval. Clean up on unmount.
3. `openDropdown()` triggers a one-shot `fetch("/api/notifications")` to populate `items` (only refetch on subsequent opens if it's been > 60s since last fetch — keeps re-opens snappy).
4. `markRead(id)` does an optimistic update (decrement count, set `read=true` locally) then `POST /api/notifications/:id/read`; rolls back on failure (`toast.error` via existing sonner integration).
5. `markAllRead()` similarly optimistic, calls `POST /api/notifications/read-all`.
6. To make the hook usable in both server-rendered pages and client components, wrap it in a `<NotificationsProvider>` context in `nextjs/components/notifications-provider.tsx` and mount it inside `app/layout.tsx` so the bell + any future surface (e.g. inline mention badges) share one polling loop.

**Done when:** dropping `<pre>{JSON.stringify(useNotifications(), null, 2)}</pre>` on the dashboard shows live unread count that updates within 30s after a teammate assigns a task in another window.

**Anti-scope:** no SWR / React Query / Zustand. The codebase doesn't currently use any of those — adding one for this feature would violate the "match surrounding patterns" rule.

---

### Phase 5 — Frontend: Bell + dropdown UI (1 day)

1. New `nextjs/components/notification-bell.tsx` — `"use client"`. Uses `useNotifications()`. Renders a bell SVG icon (lucide-react is already in deps if shadcn was scaffolded — confirm before importing; otherwise inline an SVG) with an absolutely-positioned badge `<span>` showing `unreadCount > 9 ? "9+" : unreadCount`, hidden when `unreadCount === 0`. Wraps a shadcn `<DropdownMenu>` (or `<Popover>`) primitive — pick whichever exists in `components/ui/`.
2. Dropdown content: header row with title and "Mark all as read" button (disabled when `unreadCount === 0`); scroll container listing up to 20 items rendered by a sub-component `<NotificationRow notification={n} onDismiss={...} onClick={...} />`. Empty state: "You're all caught up.".
3. `<NotificationRow>` renders: actor name, verb (switch on `type`), context (task title or comment excerpt — truncate 60 chars), relative timestamp via `Intl.RelativeTimeFormat` (no new dep). Unread rows have a left-border accent + bolder text. Click body navigates to `/projects/${task.projectId}?task=${task.id}` and calls `markRead(id)`. The dismiss control (small "x") calls `markRead(id)` without navigating; `event.stopPropagation()` to not trigger row click.
4. Edit `nextjs/app/layout.tsx`: drop `<NotificationBell />` into the existing `<nav className="border-b">`, right-aligned next to the user menu. Wrap the layout's children in `<NotificationsProvider>` so the hook only mounts when there is a session — gate on `useSession()` inside the provider so anonymous users don't poll.
5. Style with Tailwind classes consistent with the surrounding header. Use `cn()` from `@/lib/utils` if combining conditional classes.

**Done when:** assigning a task to alice in one browser session causes alice's bell badge to tick from 0→1 within 30s in another tab; clicking the bell shows the row; clicking the row navigates and clears the badge.

**Decision point:** `?task=<id>` query param is new — the project detail page doesn't currently honor it. Either (a) add a small `useEffect` in the project page that opens the task dialog when the param is set (~10 LOC), or (b) accept that clicking just navigates to the project for v1 and the user finds the task on the board. (a) is the better UX; flag for the user before implementing.

---

### Phase 6 — Tests, seed, docs (½ day)

**FastAPI tests** (`fastapi/tests/test_notifications.py`, new file):
- Fixture creates two users (`alice`, `bob`) and a project owned by alice.
- `test_assign_task_creates_notification` — POST a task with `assignee_id=bob.id`; assert one row in `notifications` for bob, type `TASK_ASSIGNED`.
- `test_self_assign_does_not_notify` — same but `assignee_id=alice.id`; assert zero rows.
- `test_complete_task_notifies_assignee_and_owner` — alice creates task assigned to bob, bob PATCHes status to DONE; assert two rows: one for alice (owner) of type `TASK_COMPLETED`, one for ?? (actor is bob → only alice gets notified, bob is excluded).
- `test_mention_in_comment` — bob comments `"@alice please check"`; assert one `MENTION` row for alice with `comment_id` populated.
- `test_read_all_only_touches_caller` — seed unread rows for two users, alice calls `read-all`, assert only alice's rows flipped.

**Next.js tests**:
- `tests/components/notification-bell.test.tsx` — renders badge with count=3; renders no badge with count=0; renders "9+" with count=12. Stub the `useNotifications` hook.
- `tests/api/notifications.test.ts` *(new dir; create if missing — currently `tests/` has only `components/` and `lib/`)* — auth-gating test for at least the GET handler. If creating a new test directory adds friction, fall back to a `tests/lib/` test on a route helper extracted from the handler. Confirm directory choice with the user.

**Seed updates**:
- `nextjs/prisma/seed.ts`: after task creation, insert ~3 sample notifications for alice (one of each type).
- `fastapi/app/seed.py`: same.

**Docs**:
- Append the four new endpoints to `fastapi/README.md`'s "API Endpoints" section.
- Brief mention in `nextjs/README.md` if it has a similar listing (check before assuming).

**Done when:** `pytest -v` and `npm test` both green on a clean checkout after `db push` / `alembic upgrade head` + seed; manual smoke test of phase-5 demo path passes.

---

### Cross-track sync points

These must move together — do not merge a partial state:
- **Phase 1**: schema additions land on both tracks in the same change (or at least same PR-set), so the contract doesn't drift.
- **Phase 3**: API shape is the single source of truth for phase 4. If you tweak a field name on one track, fix the other before starting phase 4.
- **Phase 6**: seed data + README listing should ship with the feature, not as a follow-up.

### Out of scope (reaffirming)

- Email / push delivery. Schema leaves room (`delivered_at` etc.) but no code path writes/reads it.
- Real-time transport (WS / SSE).
- Mention autocomplete UI; mention by ID; mention disambiguation.
- Notification preferences (mute project, digest cadence, per-type opt-out).
- Admin / cross-user notification management.
- Hard-delete of notifications.

### Estimated total: ~5–6 working days

Critical path: phase 1 → 2 → 3 → 4 → 5 → 6. Phase 1–3 work parallel-per-track (one engineer per track ≈ halves the wall-clock), phases 4–5 are Next.js single-track. Phase 6 can start once phase 3 is done for the test side and once phase 5 is done for the manual smoke test.
