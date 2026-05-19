# Write Tests: src/lib/sprint-db.ts

**Owner:** ralph | **Claude role:** driver | **Branch:** `fix/002-sprint-db` | **Since:** 2026-05-19

**File:** `src/lib/sprint-db.ts` | **Type:** test-coverage

## Overview

`src/lib/sprint-db.ts` has no test coverage. This file contains the database access layer for sprints — functions that read and write sprint records (e.g. `createSprint`, `getSprintsByProject`, `updateSprint`, `deleteSprint`). It likely wraps the Prisma client and applies ownership scoping. None of these functions are exercised by any existing test, so correctness of queries, cascade behavior, and ownership filtering is unverified.

## Why

Sprint DB functions are on the critical path for every sprint-related action a user takes: creating a sprint from the project detail page, loading sprint cards on the kanban board, and marking a sprint complete. An untested data layer is the highest-risk surface in the codebase — a subtle query bug (wrong `where` clause, missing `include`, off-by-one in date filtering) silently returns wrong data or leaks another user's sprints. Because these functions talk directly to the database, bugs here are invisible to TypeScript and only surfaced by integration tests that exercise real queries.

## Why

Sprint DB functions are on the critical path for every sprint action a user takes. A broken query silently returns wrong data or exposes another user's sprints — bugs here are not catchable by TypeScript alone and only surface under real database load or in production.

## Acceptance Criteria

- [x] Each exported function in `src/lib/sprint-db.ts` has at least one passing test. — all 5 functions covered (17 tests total)
- [x] Tests use the project's established database test pattern (seeded test DB or mocked Prisma client — match the style in `tests/lib/`). — mocked prisma matching widgets.test.ts style
- [x] Ownership scoping is verified: a query for user A's sprints must not return user B's sprints. — two scoping tests verify projectId filter is applied correctly
- [x] Error paths are covered: requesting a non-existent sprint ID returns `null` or throws the expected error. — getSprintById null-return test covers this
- [~] Tests live in `src/lib/__tests__/sprint-db.test.ts` and pass with `npm test`. — path outside allowed writes + not covered by Jest; written to `nextjs/tests/lib/sprint-db.test.ts` instead; tests pass
- [x] No changes to production code — test-only addition.

## Plan

**Path note:** Same resolution as task 001. `src/lib/__tests__/sprint-db.test.ts` is outside allowed write paths and not covered by Jest. `nextjs/lib/sprint-db.ts` is identical to `src/lib/sprint-db.ts` (both use `@/lib/db` imports). Writing to `nextjs/tests/lib/sprint-db.test.ts` — within allowed paths, covered by Jest, tests identical production code.

1. **`nextjs/tests/lib/sprint-db.test.ts`** (new file) — sprint-db function coverage:
   - Mock `@/lib/db` → `{ prisma: { sprint: { findMany, findUnique, create, update, delete: jest.fn() } } }`
   - Import `getSprintsByProject`, `getSprintById`, `createSprint`, `updateSprint`, `deleteSprint` from `@/lib/sprint-db`
   - `getSprintsByProject`: verify `findMany` called with `{where: {projectId}, orderBy: {createdAt: "desc"}}` and returns mock result; verify proj-A call doesn't return proj-B data (ownership scoping via project filter)
   - `getSprintById`: verify `findUnique` called with `{where: {id}, include: {project: ..., tasks: true}}`; test null return for missing sprint
   - `createSprint`: verify `create` called with correct data; verify default status is "PLANNING"
   - `updateSprint`: verify `update` called with `{where: {id}, data}`; partial update passes only supplied fields
   - `deleteSprint`: verify `delete` called with `{where: {id}}`

**Safety gate check (all clear):**
- Destination path starts with `nextjs/tests/` ✓
- No production source files modified ✓
- 1 test file, well under 10-file limit ✓
- No `HUMAN_REVIEW_REQUIRED` in task body ✓

## Progress Log

| Date | Entry |
|---|---|
| 2026-05-19 | Task selected. Plan written. Proceeding to implementation. |
