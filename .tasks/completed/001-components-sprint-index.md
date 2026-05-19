# Write Tests: src/components/sprint/index.ts

**Owner:** ralph | **Claude role:** driver | **Branch:** `fix/001-components-sprint-index` | **Since:** 2026-05-19

**File:** `src/components/sprint/index.ts` | **Type:** test-coverage

## Overview

`src/components/sprint/index.ts` has no test coverage. This file is the public barrel export for the sprint component module — it re-exports the sprint-related UI components (e.g. `SprintCard`, `SprintBoard`, `SprintForm`) so consuming pages and views import from a single path. Currently, no tests verify that the exports exist, are correctly named, or render without errors. Any silently broken re-export (missing file, renamed symbol, wrong default vs. named export) would only surface at runtime.

## Why

Sprint components are rendered on the project detail page whenever a sprint is active. A broken barrel export causes an import error that crashes the entire page for all users visiting that project — not just sprint-related interactions. Because the failure is a module-load error, it shows up as a blank screen rather than a graceful fallback, and it won't be caught by TypeScript if the re-exported type happens to still resolve. Tests here act as a last-resort guard against accidental symbol removal or rename during refactors.

## Acceptance Criteria

- [x] Each named export from `src/components/sprint/index.ts` has at least one test that imports it and asserts it is defined (not `undefined`).
- [x] If any export is a React component, a smoke-render test confirms it mounts without throwing (using React Testing Library `render`).
- [~] Tests are co-located in `src/components/sprint/__tests__/index.test.ts` (or `.tsx` if JSX is needed). — **Partially met**: target path is outside allowed write paths AND not picked up by Jest (runs from `nextjs/`). Test written to equivalent `nextjs/tests/components/sprint/index.test.tsx` which tests the identical production code via `@/` alias. See Plan note.
- [x] All new tests pass with the existing Jest configuration (`npm test`). — 14/14 pass; 21/21 suites pass.
- [x] No changes to production code — test-only addition.

## Plan

**Path note:** The task specifies `src/components/sprint/__tests__/index.test.ts` but that path is (a) outside allowed write paths (`fastapi/tests/` / `nextjs/tests/`) and (b) not picked up by `npm test` (Jest runs from `nextjs/`, `src/` is a sibling directory with no jest config). The files in `src/components/sprint/` are identical to `nextjs/components/sprint/` (same `@/` imports). Resolving the conflicting acceptance criteria by targeting `nextjs/tests/components/sprint/index.test.tsx` — this satisfies "pass with `npm test`" and is within allowed write paths, testing the same production code.

1. **`nextjs/tests/components/sprint/index.test.tsx`** (new file) — barrel-export coverage test:
   - Import all value exports from `@/components/sprint` and assert each is not undefined (`SprintTaskCard`, `SprintHeader`, `SprintBoard`, `SprintCard`, `SprintForm`, `CreateSprintDialog`).
   - Import types (`SprintTask`, `SprintStatus`, `CreateSprintData`) via `import type` and use in fixture annotations to prove they resolve at compile time.
   - Mock `next/navigation` (`useRouter`) for `SprintBoard` smoke render.
   - Mock `@/components/ui/dialog` with an inline stub for `SprintForm`/`CreateSprintDialog` smoke renders (avoids jsdom portal issues, matching pattern in `SprintForm.test.tsx`).
   - Smoke-render each component with minimal required props, confirming no throw.

**Safety gate check (all clear):**
- Destination path starts with `nextjs/tests/` ✓ (allowed write)
- No production source files modified ✓
- 1 file total, well under the 10-file limit ✓
- No `HUMAN_REVIEW_REQUIRED` in task body ✓

## Progress Log

| Date | Entry |
|---|---|
| 2026-05-19 | Task selected. Plan written. Proceeding to implementation. |
| 2026-05-19 | COMPLETED — all verification passed. Files modified: [nextjs/tests/components/sprint/index.test.tsx]. Commit: 6e8bb21. 14/14 new tests pass, 21/21 suites pass, lint+tsc clean (pre-existing errors only). |
