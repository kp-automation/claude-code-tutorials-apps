---
name: TaskForge backlog defect patterns
description: Recurring bug shapes, test quirks, and cross-task dependencies observed in the 001–005 backlog run
type: project
---

## Bug shapes in this backlog

**null-guard via `!= ""`** (task 001): The pattern `if x != "":` instead of `if x is not None:` caused `None.upper()` AttributeError when the optional param was omitted. Common in Python code written quickly without thinking about None vs empty-string semantics.

**Pagination off-by-one** (task 002): `skip = page * per_page` instead of `(page - 1) * per_page` silently returned empty first pages. Tests that created tasks and expected counts all failed; tests that expected empty lists passed (masking the bug).

**Tasks 001 and 002 share `task_repository.py`** — the null-guard bug and pagination bug are in the same file and same method (`get_all`). After fixing 001, the previously-hidden pagination failures (now assertion errors instead of AttributeErrors) became visible. Fix order matters: 001 must come before 002 to see the cascade clearly.

**`test_task_repository.py` is a NEW untracked file** — all tests in it were pre-written for the bug backlog. Tests that test `get_all` without status were FAILING with AttributeError (task 001 bug); after 001 fix, pagination tests still failed (task 002 bug). After both fixes: all 25 repository tests pass.

**task-card.test.tsx has 4 pre-existing dueDate failures** — the test mock includes `dueDate: null` which isn't in the Prisma schema (no `dueDate` field on Task). The tests also lack `sprintId` (causing TS errors). These are intentional teaching surfaces; do NOT add `dueDate` to the schema (Schema Migration gate).

**SQLAlchemy identity map subtlety** (task 005): After `repo.update()`, a subsequent `repo.get_by_id()` call in the same session returns the SAME Python object (identity map). So `confirmed = repo.get_by_id(...)` after an update is always identical to `task`. The fix was to use `task.status` directly.

## Session v2 — 2026-05-19 (Tasks 001–004, test-coverage sprint backlog)

**All 4 tasks completed, 0 blocked.** No safety gates fired. No circuit breakers triggered.

**`src/` directory is a ROOT-LEVEL teaching parallel** — there are TWO `src/` directories:
1. `taskforge/src/` (root level): Pages Router sprint implementation (`components/sprint/`, `lib/sprint-*.ts`, `pages/api/sprints/`). Tests here are NOT picked up by Jest (runs from `nextjs/`). These tasks all referenced this path.
2. `taskforge/nextjs/src/` (inside nextjs): Has `__tests__/`, `lib/api/`, `utils/`. Tests here ARE picked up by Jest.

**Path resolution pattern** (tasks 001–004): All tasks specified `src/.../__tests__/` paths which are (a) outside allowed write paths and (b) not covered by Jest. Resolution: write to equivalent `nextjs/tests/` paths which satisfy both constraints. The source files in `src/` use `@/` imports that resolve to `nextjs/`, so tests at `nextjs/tests/` test the same production code.

**File mirroring**: `src/components/sprint/index.ts` == `nextjs/components/sprint/index.ts` (byte-for-byte identical). Same for `sprint-db.ts` and `sprint-validation.ts`. Always diff before deciding which file to test.

**Test locations used:**
- `nextjs/tests/components/sprint/index.test.tsx` — sprint barrel export (14 tests)
- `nextjs/tests/lib/sprint-db.test.ts` — sprint-db functions (17 tests)
- `nextjs/tests/lib/sprint-validation.test.ts` — Zod schemas (28 tests)
- `nextjs/tests/api/sprints.test.ts` — GET/POST /api/sprints (14 tests)

**Dialog mock pattern** (shadcn Radix portals in jsdom): Use a passthrough factory:
```ts
jest.mock("@/components/ui/dialog", () => {
  const passthrough = (testId) => ({ children }) =>
    React.createElement("div", { "data-testid": testId }, children);
  return { Dialog: passthrough("dialog-root"), DialogTrigger: passthrough("dialog-trigger"), ... };
});
```

**Zod datetime vs date strings**: `z.string().datetime()` requires full ISO 8601 datetime format (`"2026-06-01T00:00:00.000Z"`), NOT date-only strings (`"2026-06-01"`). Tests must use the full format.

**`z.string().min(1)` does NOT trim**: Whitespace-only strings pass unless the schema uses `.trim().min(1)`. Don't write tests asserting whitespace fails unless production code trims.

**Sprint route mocking pattern**: For `@/app/api/sprints/route` tests, mock `next-auth`, `@/lib/db` (project.findUnique), AND `@/lib/sprint-db` (getSprintsByProject, createSprint). The route delegates to both Prisma and the sprint-db module.

## Test fixture behavior

**FastAPI pagination in tests**: With `page=1, per_page=20` (defaults), any test creating fewer than 20 tasks and checking counts will return 0 results if the pagination offset is wrong. Tests that check for empty lists still pass because `skip=20` on 0 rows still returns [].

**`git stash --include-untracked` during loop**: Avoid using stash as checkpoints when `.tasks/` and `.claude/` are untracked — the stash captures them and you must `git stash pop` immediately. Use WIP commits or just track changes without stashing.

**Why:** Pre-existing failures that change shape (AttributeError → assertion error) are still "pre-existing" — they don't count against the "no regressions" acceptance criterion.

**How to apply:** When a task fix reveals previously-hidden failures from another task's bug, note them but don't fix them in the current task. The cascade between tasks 001→002 was expected and normal.
