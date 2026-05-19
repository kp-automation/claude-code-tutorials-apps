# Write Tests: src/lib/sprint-validation.ts

**Owner:** ralph | **Claude role:** driver | **Branch:** `fix/003-sprint-validation` | **Since:** 2026-05-19

**File:** `src/lib/sprint-validation.ts` | **Type:** test-coverage

## Overview

`src/lib/sprint-validation.ts` has no test coverage. This file defines the Zod schema (or equivalent validation logic) that gates sprint creation and update requests — fields like `name` (required, min length), `startDate`, `endDate`, date ordering constraints (end must be after start), and any status transitions. None of the validation rules are exercised by tests, so invalid inputs that should be rejected could silently pass through to the database.

## Why

Validation is the first line of defense against bad data. If a sprint can be created with an end date before its start date, or with an empty name, that corruption propagates to every view that renders sprint data — the kanban board shows a malformed sprint card, date calculations break, and the UI can enter an unrecoverable state for the project owner. Validation logic is also pure and deterministic, making it the easiest surface to test exhaustively with fast unit tests. Leaving it untested means regressions in edge cases (empty strings, boundary dates, whitespace-only names) go undetected.

## Acceptance Criteria

- [x] Happy-path test: a fully valid sprint payload passes validation without errors.
- [x] Required-field tests: omitting `name`, `startDate`, or `endDate` (whichever are required) produces a validation error. — also covers missing projectId
- [x] Date ordering test: `endDate` before `startDate` is rejected with a descriptive error message. — message verified to contain "endDate must be greater than or equal to startDate"
- [x] Boundary tests: minimum-length name (e.g. 1 character) passes; zero-length name fails. Note: whitespace-only passes because `z.string().min(1)` doesn't trim — tests document actual behavior.
- [x] Tests are pure unit tests with no database or network calls — validation functions are invoked directly.
- [~] Tests live in `src/lib/__tests__/sprint-validation.test.ts` and pass with `npm test`. — path outside allowed writes; written to `nextjs/tests/lib/sprint-validation.test.ts`; all 28 tests pass.
- [x] No changes to production code — test-only addition.

## Plan

**Path note:** Same resolution as tasks 001–002. `src/lib/__tests__/sprint-validation.test.ts` is outside allowed write paths. Writing to `nextjs/tests/lib/sprint-validation.test.ts` (identical source, same `@/` alias, runs under `npm test`).

**Validation source:** `nextjs/lib/sprint-validation.ts` exports:
- `sprintCreateSchema` — Zod object: `name` (string, min 1), `startDate` / `endDate` (string, datetime ISO), `status` (optional enum), `projectId` (string) + refine endDate >= startDate
- `sprintUpdateSchema` — same fields all optional + same refine (only when both dates provided)

**Important:** `z.string().datetime()` requires full ISO 8601 datetime (e.g. `"2026-06-01T00:00:00.000Z"`), not date-only strings. `z.string().min(1)` does NOT trim — whitespace (" ") passes min(1). Tests will reflect actual implementation behavior.

1. **`nextjs/tests/lib/sprint-validation.test.ts`** (new file) — pure unit tests, no DB/network:
   - `sprintCreateSchema`: happy path, required-field failures (name/startDate/endDate/projectId), empty name fails, single-char name passes, endDate<startDate rejected with descriptive message, endDate==startDate passes, status optional/valid/invalid
   - `sprintUpdateSchema`: empty object passes, partial update passes, both-dates endDate<startDate rejected, only-startDate and only-endDate alone pass

**Safety gate check (all clear):**
- Destination path starts with `nextjs/tests/` ✓
- No production source files modified ✓
- 1 test file ✓
- No `HUMAN_REVIEW_REQUIRED` ✓

## Progress Log

| Date | Entry |
|---|---|
| 2026-05-19 | Task selected. Plan written. Proceeding to implementation. |
| 2026-05-19 | COMPLETED — all verification passed. Files modified: [nextjs/tests/lib/sprint-validation.test.ts]. Commit: 149662b. 28/28 tests pass, 23/23 suites pass. |
