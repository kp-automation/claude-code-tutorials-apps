# Write Tests: src/pages/api/sprints/index.ts

**Owner:** ralph | **Claude role:** driver | **Branch:** `fix/004-api-sprints-index` | **Since:** 2026-05-19

**File:** `src/pages/api/sprints/index.ts` | **Type:** test-coverage

## Overview

`src/pages/api/sprints/index.ts` has no test coverage. This is the Next.js API route handler for the sprints collection endpoint — it handles `GET` (list sprints for a project) and `POST` (create a new sprint). The handler is responsible for session authentication, input validation, ownership scoping, and delegating to the sprint DB layer. Currently none of these behaviors — auth gating, correct response shapes, error codes, or ownership filtering — are verified by any test.

## Why

API route handlers are the boundary between the client and the database. A bug here affects every user who interacts with sprints: unauthenticated requests that aren't rejected expose sprint data publicly; missing ownership checks leak another project owner's sprints; a validation gap lets malformed sprint data reach the database. Because route handlers wire together auth, validation, and data access, they are high-value integration test targets — a single test file can catch regressions across all three layers simultaneously. Without coverage here, a refactor of auth helpers or the sprint DB layer could silently break the sprint list or create flow for all users.

## Acceptance Criteria

- [x] `GET /api/sprints` (or equivalent path) returns 401 when no session is present.
- [x] `GET /api/sprints` returns 200 with an array of sprints scoped to the authenticated user's projects.
- [x] `GET /api/sprints` does not return sprints owned by a different user. — 403 returned; getSprintsByProject NOT called for unowned projects.
- [x] `POST /api/sprints` returns 401 when unauthenticated.
- [x] `POST /api/sprints` with a valid body returns 201 and the created sprint.
- [x] `POST /api/sprints` with an invalid body (missing required fields or bad dates) returns 400. — two tests: empty body and inverted dates.
- [x] Tests use the project's established route-handler test pattern (mocked `getServerSession` + mocked Prisma, matching style in `tests/` for other API routes).
- [~] Tests live in `src/pages/api/sprints/__tests__/index.test.ts` and pass with `npm test`. — path outside allowed writes; App Router handler tested at `nextjs/tests/api/sprints.test.ts`; 14/14 pass.
- [x] No changes to production code — test-only addition.

## Plan

**Path note:** Same path resolution as tasks 001–003. `src/pages/api/sprints/__tests__/index.test.ts` is outside allowed write paths. The Pages Router handler (`src/pages/api/sprints/index.ts`) is identical in behavior to the App Router handler at `nextjs/app/api/sprints/route.ts`, but only the App Router version is importable via `@/` alias from `nextjs/`. Writing to `nextjs/tests/api/sprints.test.ts` — within allowed paths, runs under `npm test`, covers all acceptance-criteria behaviors.

**Route analysis** (`nextjs/app/api/sprints/route.ts`):
- GET: `getServerSession` → 401; `?projectId` missing → 400; `prisma.project.findUnique` → 404; `ownerId !== session.user.id` → 403; delegate to `getSprintsByProject(projectId)` → 200
- POST: session check → 401; `sprintCreateSchema.parse(body)` → 400 (ZodError); project lookup + ownership check → 404/403; `createSprint(...)` → 201

**Mocks needed:**
- `next-auth` → `{ getServerSession: jest.fn() }`
- `@/lib/db` → `{ prisma: { project: { findUnique: jest.fn() } } }`
- `@/lib/sprint-db` → `{ getSprintsByProject: jest.fn(), createSprint: jest.fn() }`

1. **`nextjs/tests/api/sprints.test.ts`** (new file) — route handler tests:
   - GET 401: no session
   - GET 400: missing `?projectId`
   - GET 404: project not found
   - GET 403: project found but owned by different user (ownership scoping)
   - GET 200: project found and owned; verifies `getSprintsByProject` called with correct projectId
   - POST 401: no session
   - POST 400: invalid body (missing required fields → ZodError)
   - POST 404: project not found
   - POST 403: project not owned by session user
   - POST 201: valid body, project owned; verifies `createSprint` called, response body contains sprint

**Safety gate check (all clear):**
- Destination path starts with `nextjs/tests/` ✓
- No production source files modified ✓
- 1 file, well under 10-file limit ✓
- No `HUMAN_REVIEW_REQUIRED` ✓

## Progress Log

| Date | Entry |
|---|---|
| 2026-05-19 | Task selected. Plan written. Proceeding to implementation. |
