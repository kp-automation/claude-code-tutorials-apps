# Add Task Unassign (Task Detail / Edit Page)

## Description

Both API tracks already accept `{ assigneeId: null }` / `{ assignee_id: null }` in their task update endpoints — clearing an assignee works at the API level today. The missing piece is a UI surface where a user can change or remove the assignee on an existing task. The kanban board already routes every task card click to `/projects/[id]/tasks/[taskId]`, but that page does not exist. This task creates it: a task detail page that shows task fields and lets the user edit the assignee (including clearing it back to "Unassigned"), using the user list from `GET /api/users` introduced in Add-assign-project.

## Why

Once a task is created with an assignee, there is no way to remove or change that person from the UI. The only recourse is a raw API call. This breaks the basic task lifecycle: reassigning work when priorities shift, or unassigning a task when the original person is no longer responsible, is a routine operation that should be one click from the board.

## Scope

- [x] Next.js (UI + API routes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)

Both APIs already support `PATCH`/`PUT` with `assigneeId: null`. No API changes are needed on either track. Only the Next.js UI is in scope.

## Acceptance Criteria

- [ ] Clicking a task card on the kanban board navigates to `/projects/[id]/tasks/[taskId]` and renders a task detail page (currently a dead link — the page file does not exist)
- [ ] The task detail page displays the task's `title`, `description`, `status`, `priority`, and current assignee
- [ ] The assignee field is rendered as a dropdown pre-populated from `GET /api/users`, matching the picker added in Add-assign-project; the current assignee is pre-selected
- [ ] An "Unassigned" option is always present at the top of the assignee dropdown; selecting it and saving sends `PATCH /api/tasks/[id]` with `{ assigneeId: null }` and updates the display
- [ ] Selecting a different user and saving sends `PATCH /api/tasks/[id]` with the new `assigneeId`; the task card on the board reflects the change after navigating back
- [ ] Saving with no changes does not trigger an unnecessary API call
- [ ] The page shows a 404-style message if the task ID does not exist (`GET /api/tasks/[id]` returns 404)
- [ ] A back link returns the user to the parent project's kanban board (`/projects/[id]`)
- [ ] Existing test suites still pass (`npm test`)

## Technical Notes

### Files to modify

**Next.js**
- None — all changes are new files

### New files

- `nextjs/app/projects/[id]/tasks/[taskId]/page.tsx` — task detail page: fetches task via `GET /api/tasks/[taskId]` and users via `GET /api/users`; renders read-only fields plus an editable assignee selector; submits `PATCH /api/tasks/[taskId]`

### API contract

These endpoints already exist and are unchanged:

```
GET /api/tasks/[id]
Response 200: full task object including assignee { id, name, email } | null
Errors: 401, 404

PATCH /api/tasks/[id]
Body: { assigneeId: string | null }   ← null clears the assignee
Response 200: updated task object
Errors: 401, 404, 400 (Zod validation)
```

The `GET /api/users` endpoint is introduced in Add-assign-project (prerequisite).

## Plan

<!-- Left blank intentionally — to be filled in before implementation begins. -->

## Review Notes

**Critical**
- `assigneeId: null` must be sent explicitly in the PATCH body — omitting the field entirely (an empty `{}`) does nothing because `taskUpdateSchema` uses `.optional()` and Prisma's update skips undefined keys. Use `{ assigneeId: null }` not `{}` when the user picks "Unassigned."
- The Next.js Zod schema already allows `null`: `assigneeId: z.string().nullable().optional()`. No schema change is needed — but confirm the fetch call serializes `null` correctly (JSON.stringify preserves `null`; `undefined` would drop the key).
- This task depends on `GET /api/users` existing (Add-assign-project). If that task hasn't shipped yet, stub a hardcoded user list for local development or ship both tasks together.

**Gaps**
- The detail page will render all task fields but this task only makes the **assignee** editable. Status and priority are displayed read-only. Editing other fields (title, description, status, priority) is a follow-on task.
- There is no ownership check in `GET /api/tasks/[id]` on the Next.js track — any authenticated user can fetch any task by ID. The FastAPI track hides tasks behind project ownership. This is a pre-existing inconsistency (intentional per CLAUDE.md); do not introduce a fix here.
- No `PATCH` authorization check on the Next.js side — any authenticated user can patch any task by ID. Same pre-existing gap; leave it unless explicitly asked to fix.

**Minor**
- Pre-select the current assignee in the `Select` by comparing `task.assignee?.id` against the user list; default to `"unassigned"` sentinel value if `assignee` is null.
- Use `router.back()` for the back link if the referrer is always the project board; use an explicit `href="/projects/[id]"` if you want reliable navigation regardless of how the user arrived.

## Notes

- `nextjs/app/api/tasks/[id]/route.ts` `GET` already includes `assignee { id, name, email }` and the full `comments` thread — the detail page gets everything it needs from one fetch.
- The notification guard in the PATCH handler (`"assigneeId" in data && updatedTask.assigneeId && ...`) means unassigning (`null`) correctly does **not** send a `TASK_ASSIGNED` notification — no changes needed to the notification logic.
- The board's `handleTaskClick` in `task-board.tsx:45` already calls `router.push(\`/projects/${projectId}/tasks/${taskId}\`)` — this page just needs to exist at that path to become reachable.

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
- [ ] Manual smoke test in browser
