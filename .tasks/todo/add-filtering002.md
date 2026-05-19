# Add Task Filtering — Backend Query Params

## Description

Extend the FastAPI and Next.js API layers to support query-parameter-based filtering on the `/api/tasks` endpoint, completing the backend half of the task filtering feature.

## Acceptance Criteria

- [ ] FastAPI `GET /api/tasks` accepts `status`, `priority`, `assignee_id`, and `q` as optional query params
- [ ] FastAPI `get_tasks` service chains `.filter()` calls for each provided param
- [ ] Next.js `GET /api/tasks` reads `status`, `priority`, `assigneeId`, and `q` from `searchParams` and applies them to the Prisma `where` clause
- [ ] Both tracks return consistent filtered results for matching param combinations
- [ ] Existing tests still pass; new tests cover at least one filter combination per track

## Plan

1. **FastAPI router** — add `status`, `priority`, `assignee_id`, `q` as `Optional[str]` / `Optional[int]` `Query` params to `list_tasks` in `fastapi/app/routers/tasks.py`; pass them through to the service.
2. **FastAPI service** — update `get_tasks` in `fastapi/app/services/task_service.py` to conditionally chain `.filter()` calls for each non-None param; `q` does a case-insensitive `LIKE` on title and description.
3. **Next.js API** — in `nextjs/app/api/tasks/route.ts`, read the four params from `req.nextUrl.searchParams` and build a Prisma `where` object that includes only provided filters.
4. **Tests** — add at least one parameterized test case in `fastapi/tests/test_tasks.py` and one in `nextjs/tests/` (or manually verify via `/docs`).

### Review Notes

**Critical**

- **UI uses client-side filtering — backend params won't help it without extra work.** `task-board.tsx:35-39` filters the pre-loaded `tasks` prop inline and never re-fetches when filters change. Adding query params to the API won't benefit the UI unless the project page is updated to pass those params on fetch and re-fetch on filter changes. Decide upfront: make filters server-side (board re-fetches) or document these as API-only additions.
- **`req.nextUrl.searchParams` is the wrong API.** The route handler is `GET(req: Request)` (standard `Request`, not `NextRequest`). `nextUrl` is `NextRequest`-only. Match the existing pattern at `route.ts:25`: `new URL(req.url).searchParams`.
- **Prisma + SQLite: `mode: 'insensitive'` is PostgreSQL-only.** The `q` search in the Next.js track will be case-sensitive with plain `contains`, or require a raw query / `toLowerCase` workaround. The plan says "case-insensitive" without flagging this constraint.

**Gaps**

- **The UI only exposes `status` and `q` — not `priority` or `assigneeId`.** `task-filters.tsx` has a status dropdown and a text search input only. The `priority` and `assignee_id`/`assigneeId` params added to the backends have no UI wiring yet; mark them explicitly as API-only in this task.
- **FastAPI enum validation is automatic.** Typing a Query param as `Optional[TaskStatus]` makes FastAPI validate it and return 422 automatically. No extra validation code needed — the note in the plan is misleading.

**Minor**

- **Service param ordering.** `get_tasks` already uses `(db, user, project_id)` — `user` before the domain arg — which is inconsistent with the CLAUDE.md convention (`user` last). Adding more filter params extends this inconsistency; decide whether to normalize the signature now.
- **Test directory should be `nextjs/tests/api/`.** That directory already exists (contains `widgets.test.ts`). The plan just says `nextjs/tests/` — be specific.

## Notes

- Builds on the UI wiring already done in commits `649c44b` (TaskFilters) and `803279c` (TaskBoard).
- FastAPI enums for `status` and `priority` are already defined in `app/models/task.py` — validate incoming strings against those values.
- Next.js `status` and `priority` values are plain strings validated by Zod; add an enum refinement to the query-param parsing if needed.
- Keep both tracks' filter param names semantically consistent: `assignee_id` (FastAPI) ↔ `assigneeId` (Next.js).
