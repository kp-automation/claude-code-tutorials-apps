# Add Task Assignee Picker

## Description

Both tracks already accept `assigneeId` / `assignee_id` on task create and update, and `task-card.tsx` already renders the assignee name (or "Unassigned"). The missing piece is the UI to actually set it: there is no assignee selector in the create task dialog, and no `GET /api/users` endpoint on either track to populate one. This task adds that endpoint and wires it into the task creation form.

## Why

Users create tasks but have no way to assign them to a teammate from the UI. The assignee field silently goes unset on every task, making the "Assigned to" display on every task card permanently show "Unassigned." The notification system (`notifyTaskAssigned`) already fires when `assigneeId` is provided — once the picker is in place, assignment notifications start working automatically with no additional changes.

## Scope

- [x] Next.js (UI + API routes)
- [x] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)

No schema or model changes. Both tracks need a new `GET /api/users` endpoint; only the Next.js track needs UI changes.

## Acceptance Criteria

- [ ] `GET /api/users` returns an array of all users `[{ id, name, email }]`; requires authentication — unauthenticated requests receive `401`
- [ ] The create task dialog in `app/projects/[id]/page.tsx` includes an **Assignee** dropdown populated from `GET /api/users`
- [ ] The Assignee field is optional — a task can still be created without selecting anyone
- [ ] Selecting an assignee and submitting sends `assigneeId` in the `POST /api/tasks` body; the task card immediately shows the assigned user's name
- [ ] Leaving the Assignee blank creates the task with no assignee (`"Unassigned"` on the card)
- [ ] FastAPI `GET /api/users` returns the same `[{ id, name, email }]` shape (integer IDs); requires a valid Bearer token
- [ ] Both endpoints scope the response to fields safe to expose — no `password` / `password_hash` in the response
- [ ] Existing test suites still pass (`npm test` / `pytest`)

## Technical Notes

### Files to modify

**Next.js**
- `nextjs/app/projects/[id]/page.tsx` — add Assignee `Select` to the create task form; fetch `/api/users` on mount alongside `fetchProject`

**FastAPI**
- `fastapi/app/main.py` — import and register the new `users` router

### New files

- `nextjs/app/api/users/route.ts` — `GET` handler: auth check → `prisma.user.findMany({ select: { id, name, email } })` → return array
- `fastapi/app/routers/users.py` — `GET /api/users` returning `list[UserPublic]`; must be registered in `app/main.py`
- `fastapi/app/schemas/user.py` — `UserPublic` schema (`id`, `name`, `email`); no password field

### API contract

```
GET /api/users
Auth: session cookie (Next.js) / Bearer token (FastAPI)

Response 200 — array of user objects:
  id     string (Next.js) / int (FastAPI)   user identifier
  name   string                              display name
  email  string                              email address

Error cases:
  401  Unauthorized — no valid session / token
```

No filtering, pagination, or search in this iteration — return all users.

## Plan

<!-- Left blank intentionally — to be filled in before implementation begins. -->

## Review Notes

**Critical**
- Never include `password` (Next.js) or `password_hash` (FastAPI) in the response — use an explicit `select` / `UserPublic` schema that excludes it.
- The FastAPI router must be registered in `app/main.py` with both an import line and an `app.include_router(...)` call — see `.claude/rules/fastapi-router-registration.md`. A missing registration silently produces 404s with no startup error.
- The Next.js `GET /api/users` handler does not scope by ownership — it returns all users in the system. This is intentional: you need to assign to any teammate, not just projects you own. But confirm this is acceptable before shipping.

**Gaps**
- This does not add an assignee picker to the **task edit** flow (there is no task edit dialog yet — task detail is at `/projects/[id]/tasks/[taskId]` but that route has no page file). Treat this as API + create-form only for now.
- Returning all users without project-membership scoping means you can assign anyone in the system to a task. A future membership model would narrow this list, but that is out of scope here.

**Minor**
- The `Select` component from `@/components/ui/select` is already used in the create task form for priority — reuse the same pattern for the assignee picker.
- Load users once on mount alongside `fetchProject`, not on dialog open, to avoid a loading flash inside the dialog.

## Notes

- The `notifyTaskAssigned` call in `nextjs/app/api/tasks/route.ts:106–112` already fires when `task.assigneeId` is set — task assignment notifications work automatically once the picker is wired up, with no changes to the notification service.
- FastAPI does not yet have a `UserPublic` Pydantic schema — this task introduces it. Place it in `fastapi/app/schemas/user.py` following the `Base → Response` chain (no Create/Update needed here).
- Keep the FastAPI router thin: one endpoint, delegates to a `get_users` service function in `fastapi/app/services/user_service.py` (new file, minimal — just `db.query(User).all()`).

---

## Completion

<!-- Fill this in when the task is moved to done/. -->

**Branch:** `feat/...`
**Commits:**

**Summary of what shipped:**

**Decisions made:**

**Known gaps / follow-up work:**

**Testing done:**
- [ ] `npm test` — X/X pass
- [ ] `pytest` — X/X pass
- [ ] Manual smoke test in browser
