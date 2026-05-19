# Handoff — Notifications Backend + Frontend (Phases 1–5)

Date: 2026-04-30 (updated)
Branch: `main` (uncommitted)
Source plan: `.tasks/in-progress/add-notifications.md`

## Scope completed

- **Backend (both tracks)** — Phases 1, 2, 3 of the plan.
- **Frontend (Next.js only)** — Phases 4 and 5 of the plan (state context + provider + polling, bell with badge, dropdown UI). Mounted in the app header.

Phase 6 (FastAPI pytest cases, seed-data updates, README endpoint listing) is **not** started.

## What changed

### FastAPI

- **New** `fastapi/app/models/notification.py` — `Notification` ORM model + `NotificationType` enum (`TASK_ASSIGNED | TASK_COMPLETED | MENTION`). Cascade on `user_id` and `actor_id`; SetNull on `task_id` and `comment_id`. Indexed on `user_id`.
- **New** `fastapi/app/schemas/notification.py` — Pydantic chain `NotificationBase / NotificationCreate / Notification` plus `UnreadCount` and `ReadAllResponse`. Embedded `_UserSummary`, `_TaskSummary`, `_CommentSummary` shapes for nested actor/task/comment in the response.
- **New** `fastapi/app/services/notification_service.py` — six exports:
  - Triggers: `notify_task_assigned`, `notify_task_completed`, `notify_mentions` (best-effort; rollback-on-error, never raise).
  - Reads/mutations: `list_for_user` (limit 50, joinedload actor/task/comment), `unread_count`, `mark_read` (404/403 via existing exception types), `mark_all_read` (single `UPDATE`).
  - Pure helper `parse_mentions(body) -> list[str]` (regex `r"@([A-Za-z0-9_]+)"`, lowercased).
- **New** `fastapi/app/routers/notifications.py` — four endpoints, registered in `main.py`:
  - `GET    /api/notifications`              → `list[Notification]`
  - `GET    /api/notifications/unread-count` → `{ "count": int }`
  - `POST   /api/notifications/{id}/read`    → `Notification`
  - `POST   /api/notifications/read-all`     → `{ "updated": int }`
  - Note: the static path `/read-all` is declared **before** the dynamic `/{notification_id}/read` so FastAPI doesn't route `read-all` into the dynamic handler.
- **New** `fastapi/alembic/versions/002_add_notifications.py` — hand-written migration mirroring the model. Indexes on `id` and `user_id`.
- **Modified** `fastapi/app/models/user.py` — added `notifications` back-relation (recipient only; actor has no inverse, per plan).
- **Modified** `fastapi/app/models/__init__.py` and `fastapi/app/schemas/__init__.py` — exported new symbols.
- **Modified** `fastapi/app/services/task_service.py` — `create_task` fires `notify_task_assigned` (and `notify_task_completed` if creating directly in DONE). `update_task` snapshots prior `assignee_id` and `status`, then fires `notify_task_assigned` on assignee change (only when new value is non-null and differs from prior) and `notify_task_completed` on status transition into DONE (skipped if prior status was already DONE).
- **Modified** `fastapi/app/routers/comments.py` — calls `notify_mentions(db, current_user, comment)` after the existing `db.refresh(comment)`. The intentional raw-SQL/ORM mix in this file was left untouched per CLAUDE.md.
- **Modified** `fastapi/app/main.py` — `app.include_router(notifications.router)`.

### Next.js

- **Modified** `nextjs/prisma/schema.prisma`:
  - Added `Notification` model (cuid id, plain-string `type`, `userId`/`actorId` Cascade, `taskId`/`commentId` SetNull, indexes on `userId` and `(userId, read)`).
  - Added `notifications` + `triggeredNotifications` relations to `User` (named `"NotificationRecipient"` and `"NotificationActor"` because two relations to the same model require named relations).
  - Added inverse `notifications Notification[]` on `Task` and `Comment`.
- **Modified** `nextjs/lib/types.ts` — exported `NotificationType` union, re-exported `Notification` from Prisma client, added `NotificationWithRelations`.
- **New** `nextjs/lib/notifications.ts` — three helpers (`notifyTaskAssigned`, `notifyTaskCompleted`, `notifyMentions`) + `parseMentions`. Each helper wraps writes in try/catch (best-effort).
- **Modified** `nextjs/app/api/tasks/route.ts` (POST) — calls `notifyTaskAssigned` when `assigneeId` is set, and `notifyTaskCompleted` if the task is created in DONE.
- **Modified** `nextjs/app/api/tasks/[id]/route.ts` (PATCH) — snapshots prior `assigneeId`/`status` before the update, then triggers `notifyTaskAssigned` on assignee change and `notifyTaskCompleted` on status transition into DONE (gated on prior !== DONE).
- **Modified** `nextjs/app/api/comments/route.ts` (POST) — calls `notifyMentions` with the new comment after creation.
- **New** API routes:
  - `nextjs/app/api/notifications/route.ts`               (GET)
  - `nextjs/app/api/notifications/unread-count/route.ts`  (GET)
  - `nextjs/app/api/notifications/[id]/read/route.ts`     (POST, fetch → 404 → 403 → mutate)
  - `nextjs/app/api/notifications/read-all/route.ts`      (POST)

### Next.js — frontend (Phases 4 + 5)

- **New** `nextjs/components/notifications-provider.tsx` — `NotificationsProvider` (React Context) plus `useNotifications` hook. Owns `unreadCount`, `items`, `loadingList` state; exposes `refreshCount`, `loadList`, `markRead`, `markAllRead`. Polls `GET /api/notifications/unread-count` every **30 s** while `document.visibilityState === "visible"`; pauses on `visibilitychange → hidden`, resumes on visible. `loadList()` lazy-fetches the full list and skips re-fetches within a **60 s** window. `markRead` and `markAllRead` are optimistic (decrement-or-zero locally first, roll back on `!res.ok` or thrown error).
- **New** `nextjs/components/notification-bell.tsx` — bell icon button with red unread-count badge. Hides badge at 0; caps display at `9+`. Click toggles a positioned dropdown panel; `loadList()` fires on open. Closes on outside click and on `Escape`. Pure JSX dropdown (no shadcn `<DropdownMenu>` / Radix wrapper) to avoid adding a primitive that doesn't yet exist in the codebase.
- **New** `nextjs/components/notification-dropdown.tsx` — header row (title + "Mark all as read" button, disabled when `unreadCount === 0`); scrollable list rendering up to **20** items via the local `NotificationRow` sub-component. Each row shows actor name (bold), event verb (`assigned you to` / `completed` / `mentioned you in`), task title or comment excerpt (truncated to 60 chars + ellipsis), and a relative timestamp via `Intl.RelativeTimeFormat`. Unread rows get a left blue border + `bg-blue-50/40` accent. Click anywhere on a row navigates to `/projects/<projectId>?task=<taskId>` and calls `markRead`; the dismissable `<X />` button calls `markRead` with `event.stopPropagation()` so it never navigates. Empty state: "You're all caught up.". Row is a `<div role="button" tabIndex={0}>` with keyboard handler (Enter / Space) — chosen over a `<button>` element so the inner dismiss `<button>` doesn't nest illegally.
- **Modified** `nextjs/app/layout.tsx` — wraps the authenticated branch in `<NotificationsProvider>` and drops `<NotificationBell />` into the existing `<nav>` between the page links and the user-name display. Provider only mounts when `getServerSession` returns a session, so anonymous pages don't poll.
- **New** Jest specs:
  - `tests/components/notifications-provider.test.tsx` — 4 tests: polls on mount, `loadList` populates items, `markRead` rolls back on failed POST, `markAllRead` zeroes count immediately. Mocks `global.fetch`.
  - `tests/components/notification-bell.test.tsx` — 5 tests: hides badge at 0, shows count, caps at `9+`, opens-and-loads on click, closes via the dropdown's `onClose` callback. Mocks the provider hook + a stub dropdown.
  - `tests/components/notification-dropdown.test.tsx` — 5 tests: empty state, renders rows, row click navigates + marks read, dismiss button marks read without navigating, "Mark all as read" disabled at 0 / fires `markAllRead` at >0. Mocks `next/navigation`'s `useRouter` and the provider hook.

## Verification status

- **Next.js**: `npm test` green at **22/22** (was 8 before this work — added 14 new tests across the provider, bell, and dropdown). `npx tsc --noEmit` reports zero errors in any production notification file. The pre-existing `toBeInTheDocument` / `toBeDisabled` type errors in `tests/components/*.test.tsx` are intentional-imperfection territory (matchers work at runtime via `jest.setup.js`, just untyped) — the new test files inherit the same shape. Schema applied successfully via `DATABASE_URL="file:./dev.db" npx prisma db push`; client regenerated.
- **FastAPI**: **NOT** verified. The local machine only has Python 3.9.6 — `pyproject.toml` requires ≥3.12, so `pytest`, `ruff`, `alembic`, and `uvicorn` could not be run. All FastAPI changes are static. Once a 3.12+ env exists, run:
  ```bash
  cd fastapi
  python3.12 -m venv .venv && source .venv/bin/activate
  pip install -e ".[dev]"
  alembic upgrade head        # should apply 001 + 002
  pytest -v                   # baseline must pass before adding tests
  ```
- **UI smoke test**: not run. Recommended next: `cd nextjs && DATABASE_URL="file:./dev.db" npm run seed && npm run dev`, sign in as alice, assign a task to bob in one tab, watch the bell badge tick from 0→1 in bob's tab within 30s.

## Decisions made (worth flagging)

### Frontend (Phase 4 + 5)

8. **No new dropdown primitive.** The plan suggested wrapping a shadcn `<DropdownMenu>` or `<Popover>`, but neither primitive exists in `components/ui/`. Adding a 100-LOC Radix wrapper just for the bell would expand the diff and risks template drift. Built the dropdown with `useState` + `useRef` + a `mousedown` outside-click listener instead — matches the codebase's hand-written component fidelity (`task-board.tsx`, `comment-thread.tsx`). If/when the project adopts a shared dropdown primitive, swap it in.
9. **No `SessionProvider` was added.** The codebase doesn't currently use NextAuth's client `useSession`. The provider mounts only inside the existing server-rendered `session ? ... : children` branch in `app/layout.tsx`, so polling never starts on anonymous pages. If a future feature needs `useSession()` on the client, that's an additive change.
10. **`?task=<id>` deep-link is wired but the project page doesn't honor it yet.** Clicking a notification row navigates to `/projects/<projectId>?task=<taskId>` and calls `markRead`, but the project detail page does not currently read the `task` query param to auto-open the task dialog. The plan flagged this as a decision point: the recommended ~10-LOC `useEffect` in `app/projects/[id]/page.tsx` is **not** done. Phase 5 still demoes correctly (badge ticks, dropdown opens, click navigates to the right project) — opening straight to the task is the polish.
11. **Dropdown row is a `<div role="button">`, not a `<button>`.** A `<button>` parent containing the dismiss `<button>` is invalid HTML and triggers a jsdom warning. Switched to `role="button" tabIndex={0}` with explicit Enter/Space key handling. Keyboard nav works the same; a11y semantics are preserved.
12. **Optimistic mutations roll back silently on failure.** No toast/error UI when a `markRead` POST fails — the row just snaps back to unread. The codebase uses sonner toasts elsewhere; if you'd prefer user-visible errors here, wire `toast.error("Couldn't mark as read")` into the catch blocks in `notifications-provider.tsx`.
13. **List is capped at 20 in the dropdown** (server returns 50 — see `app/api/notifications/route.ts`'s `take: 50`). The plan specified "most recent ~20 notifications". Trivial to bump.

### Backend (Phases 1–3)

1. **`actor_id` cascades on user delete.** The plan's "Cascade rules" line only specified the recipient cascade, leaving actor's behavior unspecified. Default FK behavior (RESTRICT) would make user deletion fail whenever the user had ever triggered a notification — that's a footgun. I made the actor FK Cascade on both tracks. If you want SetNull instead, you'll need to make `actorId` nullable too.
2. **Migration is hand-written, not autogenerated.** I couldn't run `alembic revision --autogenerate` (no Python 3.12). The existing `001_initial.py` is also hand-written, so this matches the in-tree style. Before merging, run autogenerate against `Base.metadata` to confirm there's no drift between what I wrote and what SQLAlchemy expects from the model — and that the model isn't otherwise causing diffs against the live DB.
3. **`assignee → null` PATCH does not notify.** The plan flagged this as a confirm-before-coding decision and the AC implies "no". The wiring matches: notify only when the new `assignee_id` is non-null AND differs from the prior value.
4. **Mentions on Next.js side filter case-insensitively in JS, not in Prisma.** SQLite doesn't support Prisma's `mode: "insensitive"`. The helper does a broad `findMany({ where: { NOT: { id: actorId } }, select: { id, name } })` and filters in memory by lowercased name. With a small user table this is fine. If/when the project moves to Postgres, this can be switched back to a `mode: "insensitive"` query.
5. **Task creation can fire `notify_task_completed`.** If a client POSTs a brand-new task already in status DONE, the Next.js POST handler and the FastAPI `create_task` will fire a completion notification. This is a deliberate symmetry decision; the Acceptance Criteria don't forbid it. Open question for the team if you'd rather only fire on status transitions through PATCH.
6. **Static `/read-all` route is declared before the dynamic `/{notification_id}/read` route in FastAPI.** Required for correct FastAPI route matching. If anyone reorders these, `read-all` will start returning 422 "value is not a valid integer".
7. **Best-effort writes are *fully* swallowed.** No logging on failure. CLAUDE.md flags "no logging" as the established style; if/when the project adopts a logger, switch the `except Exception:` blocks to log at warning.

## Cross-track contract

Pinned response shape (already in `add-notifications.md` plan, repeated here as the contract Phase 4 will build to):

```jsonc
{
  "id": "<cuid|int>",
  "type": "TASK_ASSIGNED" | "TASK_COMPLETED" | "MENTION",
  "read": false,
  "createdAt": "2026-04-29T12:00:00Z",
  "actor":   { "id": "...", "name": "Alice", "email": "a@x.com" },
  "task":    { "id": "...", "title": "...", "projectId": "..." } | null,
  "comment": { "id": "...", "content": "..." } | null
}
```

Field-name notes:
- Both tracks use `comment.content` (FastAPI `Comment.content`, Prisma `Comment.content`). The plan draft used `body` once — corrected to `content` in the schemas and the plan should be edited to match.
- Next.js wire `id` is `string` (cuid); FastAPI wire `id` is `int`. Per existing CLAUDE.md asymmetry — do not unify.
- Next.js timestamps: `createdAt` (camelCase) per Prisma. FastAPI timestamps: `created_at` (snake_case) per Pydantic default. The frontend hook in Phase 4 will need to handle both if it ever talks to the FastAPI backend; for the Next.js track only it's just `createdAt`.

## Blockers / open questions

- **No Python 3.12 on this machine.** All FastAPI changes are static. First reviewer with a 3.12+ env should:
  1. `pip install -e ".[dev]"` and resolve any lock issues
  2. `alembic upgrade head` from a clean DB (delete `taskforge.db` first if needed)
  3. `pytest -v` to confirm the 3 existing test files still pass with the wired `task_service` (the prior test suite tested `create_task` and `update_task` and may need fixture tweaks if they expected exact row counts on `notifications` to be 0)
  4. Run `uvicorn app.main:app --reload` and curl the four endpoints with a seeded user's bearer token to confirm the contract matches the Next.js shape.
- **Pre-existing TypeScript errors in `components/task-card.tsx`** (5 errors) are untouched. They predate this work and aren't blocking — flagged for the user only because `npx tsc --noEmit` shows them.
- **`tailwind-merge` downgrade in `nextjs/package.json`** from prior session is still uncommitted. Same blocker as the prior handoff doc — the user should resolve before committing.
- **`.claude/settings.json`** is still untracked. Same as above.

## What's left (per the original plan)

- **Phase 6** — FastAPI `pytest` cases (5 listed in plan: assign-creates / self-assign-skips / done-notifies-assignee+owner / mention-creates / read-all-only-touches-caller); seed-data updates for alice on both tracks (`nextjs/prisma/seed.ts` + `fastapi/app/seed.py` — 3 sample notifications each); README endpoint listing in `fastapi/README.md`'s "API Endpoints" section.
- **Polish (optional)**:
  - Honor `?task=<taskId>` on `app/projects/[id]/page.tsx` so notification clicks open the task dialog directly (~10 LOC `useEffect`).
  - Toast on optimistic-mutation failure.
  - "Auth-gating" Jest test on the API routes (plan lists this — currently the auth path is implicitly covered by the same pattern as other routes; an explicit test would slot into a new `tests/api/` dir).

## Suggested commit split

The diff is large enough that one PR is reasonable but a split is cleaner:

1. **Schema + types** — Prisma schema, `lib/types.ts`, FastAPI `notification.py` model + `__init__` exports, alembic 002, Pydantic schemas. Both tracks. Verifiable by db-push / alembic upgrade only.
2. **Helpers + wiring** — `notification_service.py` (FastAPI), `lib/notifications.ts` (Next.js), edits to `task_service.py`, `comments.py`, `tasks/route.ts`, `tasks/[id]/route.ts`, `comments/route.ts`. The triggers go live here.
3. **HTTP API** — `notifications.py` router + `main.py` registration; four Next.js route files. Endpoints become callable here.

Or merge as one PR if the reviewers prefer atomic feature drops.

## Quick-reference paths

```
fastapi/
  app/models/notification.py          [new]
  app/models/user.py                  [+notifications relation]
  app/models/__init__.py              [+exports]
  app/schemas/notification.py         [new]
  app/schemas/__init__.py             [+exports]
  app/services/notification_service.py [new]
  app/services/task_service.py        [+trigger calls]
  app/routers/notifications.py        [new]
  app/routers/comments.py             [+notify_mentions call]
  app/main.py                         [+router register]
  alembic/versions/002_add_notifications.py [new]

  

nextjs/
  prisma/schema.prisma                [+Notification model + relations]
  lib/types.ts                        [+NotificationType union + augmented type]
  lib/notifications.ts                [new]
  app/api/notifications/route.ts                  [new]
  app/api/notifications/unread-count/route.ts     [new]
  app/api/notifications/read-all/route.ts         [new]
  app/api/notifications/[id]/read/route.ts        [new]
  app/api/tasks/route.ts              [+trigger calls]
  app/api/tasks/[id]/route.ts         [+trigger calls]
  app/api/comments/route.ts           [+notifyMentions call]
  components/notifications-provider.tsx           [new]
  components/notification-bell.tsx                [new]
  components/notification-dropdown.tsx            [new]
  app/layout.tsx                                  [+provider + bell mount]
  tests/components/notifications-provider.test.tsx [new]
  tests/components/notification-bell.test.tsx    [new]
  tests/components/notification-dropdown.test.tsx [new]
```
