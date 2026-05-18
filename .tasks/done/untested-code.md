# Untested Code — Gap Tests for the `src/` Module

## Overview

The root-level `src/` module (`src/api/time-entries/route.ts`, `src/hooks/useTimeTracking.ts`, `src/components/features/TimeTracker.tsx`) has baseline tests in `tests/api/`, `tests/hooks/`, and `tests/features/`, but several code paths are not exercised by those suites. This task adds targeted tests for the missing branches and edge cases, placed in a dedicated `tests/untested-code/` directory for traceability. No source code changes are required.

## Why

The existing suites cover the happy path and primary error codes (401, 403, 404, 400) but leave silent gaps:

- **Route handler `catch` blocks** (GET, POST, PATCH, DELETE) are never triggered — a DB outage or unexpected exception would produce a 500, but no test would catch a regression in that path.
- **PATCH negative `durationSeconds`** is validated by Zod (`positive()`), but only zero is tested; the negative branch goes unverified.
- **`isSubmitting` lifecycle** for `updateEntry` and `deleteEntry` in the hook is untested — a regression could leave the UI spinner stuck with no failing test.
- **Network-error `catch` branches** (when `fetch` itself throws) exist in all three mutation methods and `refreshEntries`, but are never exercised; a broken error message string would ship silently.
- **Component-level error rendering** for edit-form 403 and 404 paths are covered in the hook tests but not in the component's own RTL suite, leaving a gap between hook behavior and what the user actually sees.

## Assumptions

- The `src/` module files (`route.ts`, `useTimeTracking.ts`, `TimeTracker.tsx`) are complete and correct; this task adds tests only, not source changes.
- The root-level `jest.config.js` already resolves `@/*` to `nextjs/*`, covers `tests/**/*.ts?(x)`, and is runnable via `node ./nextjs/node_modules/.bin/jest --config jest.config.js`.
- New test files placed under `tests/untested-code/` are automatically discovered by the existing Jest config (`testMatch: ["<rootDir>/tests/**/*.[jt]s?(x)"]`).
- Mocking conventions from the existing suites apply: `jest.mock("next-auth", ...)`, `jest.mock("@/lib/db", ...)`, and `global.fetch = jest.fn()`.
- The `act()` warnings emitted by the current suites are pre-existing and acceptable; new tests should not introduce new categories of warning.
- No changes to `package.json`, `jest.config.js`, or `tsconfig.json` are needed.

## Acceptance Criteria

- [ ] `tests/untested-code/api-time-entries.test.ts` exists and covers:
  - PATCH returns 400 when `durationSeconds` is negative (Zod `positive()` branch).
  - GET returns 500 when `task.findUnique` throws unexpectedly.
  - GET returns 500 when `timeEntry.findMany` throws after the ownership check passes.
  - POST returns 500 when `timeEntry.create` throws after the ownership check passes.
  - PATCH returns 500 when `timeEntry.update` throws after the ownership check passes.
  - DELETE returns 500 when `timeEntry.delete` throws after the ownership check passes.
- [ ] `tests/untested-code/hook-use-time-tracking.test.ts` exists and covers:
  - `isSubmitting` is `true` during an in-flight `updateEntry` call and `false` after resolution (success and failure).
  - `isSubmitting` is `true` during an in-flight `deleteEntry` call and `false` after resolution (success and failure).
  - `logManualEntry` returns `false` and sets `submitError` matching `/failed to save/i` when `fetch` throws.
  - `updateEntry` returns `false` and sets `submitError` matching `/failed to update/i` when `fetch` throws.
  - `deleteEntry` returns `false` and sets `submitError` matching `/failed to delete/i` when `fetch` throws.
  - `refreshEntries` sets `entriesError` matching `/failed to load/i` when `fetch` throws.
- [ ] `tests/untested-code/feature-time-tracker.test.tsx` exists and covers:
  - Saving an edit when PATCH returns 403 renders an alert matching `/only edit your own/i`.
  - Saving an edit when PATCH returns 404 renders an alert matching `/not found/i`.
  - Clicking Stop after starting the timer opens the duration form with a pre-filled numeric value ≥ 1.
  - The Stop form shows Save and Cancel buttons.
  - The Log Time button is absent while the timer is running.
  - The Start Timer button is absent while the timer is running.
- [ ] Running `node ./nextjs/node_modules/.bin/jest --config jest.config.js --no-coverage --testPathPattern="tests/untested-code"` reports 0 failures.
- [ ] Running the full suite (`node ./nextjs/node_modules/.bin/jest --config jest.config.js --no-coverage`) still passes all pre-existing tests without modification.

## Plan

<!-- To be filled in before implementation begins. -->
