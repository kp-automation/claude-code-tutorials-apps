# Validation Report: untested-code — Gap Tests for `src/` Module

**Date:** 2026-05-18
**Status:** PASS WITH NOTES
**Pipeline Stage:** Review
**Files Reviewed:**
- `tests/untested-code/api-time-entries.test.ts`
- `tests/untested-code/hook-use-time-tracking.test.ts`
- `tests/untested-code/feature-time-tracker.test.tsx`
- `src/api/time-entries/route.ts` (source under test)
- `src/hooks/useTimeTracking.ts` (source under test)
- `src/components/features/TimeTracker.tsx` (source under test)
- `tests/api/time-entries.test.ts` (baseline — pattern reference)
- `tests/hooks/useTimeTracking.test.ts` (baseline — pattern reference)
- `tests/features/time-tracking.test.tsx` (baseline — pattern reference)
- `jest.config.js`, `jest.setup.js`

**Stack / Frameworks:** Next.js 15, TypeScript, React Testing Library, Jest (jsdom), `@testing-library/react` `renderHook` + `act` + `waitFor`, `next-auth` mocked, Prisma mocked via `@/lib/db`

---

## Discovery Summary

The root-level `jest.config.js` covers `tests/**/*.[jt]s?(x)`, maps `@/*` to `nextjs/*`, and uses jsdom as the default environment (with `@jest-environment node` overridable per file). Baseline suites in `tests/api/`, `tests/hooks/`, and `tests/features/` establish the mocking conventions: `jest.mock("next-auth", ...)`, `jest.mock("@/lib/db", ...)`, `global.fetch = jest.fn()`, and `beforeEach(jest.clearAllMocks)`. These conventions are matched exactly by the new gap-test files. The spec in `.tasks/todo/untested-code.md` identifies six groups of missing branch coverage and defines 12 named acceptance criteria.

---

## Per-Criterion Verdict

### api-time-entries.test.ts

| Criterion | Verdict | Notes |
|---|---|---|
| PATCH returns 400 when `durationSeconds` is negative | COVERED | `durationSeconds: -1` triggers Zod `positive()` in `timeEntryUpdateSchema`. Route source confirms this path exists (line 140). Assertion checks `status === 400` and that `body` has property `"error"`. |
| GET returns 500 when `task.findUnique` throws | COVERED | `mockTask.findUnique.mockRejectedValue(...)` forces the catch block at source line 58–63. Assertion matches `{ error: "Internal server error" }`. |
| GET returns 500 when `timeEntry.findMany` throws after ownership check passes | COVERED | `mockTask.findUnique` returns an owned task, then `mockTimeEntry.findMany.mockRejectedValue(...)`. Routes source at line 49 is the throw site; catch block at line 58–63 is exercised. |
| POST returns 500 when `timeEntry.create` throws after ownership check passes | COVERED | Ownership pass is simulated by returning `taskOwnedByUser`; `mockTimeEntry.create.mockRejectedValue(...)` hits the non-ZodError path of the catch block at source lines 116–119. |
| PATCH returns 500 when `timeEntry.update` throws after ownership check passes | COVERED | `mockTimeEntry.findUnique` returns `sampleEntry` (same `userId` as session), `mockTimeEntry.update.mockRejectedValue(...)`. Source catch at lines 166–170 is exercised. |
| DELETE returns 500 when `timeEntry.delete` throws after ownership check passes | COVERED | Same pattern as PATCH 500. Source catch at lines 207–211 is the target. |

### hook-use-time-tracking.test.ts

| Criterion | Verdict | Notes |
|---|---|---|
| `isSubmitting` true during in-flight `updateEntry`, false after success | COVERED | Promise held open via `mockReturnValueOnce(patchPromise)`. `isSubmitting` checked synchronously after non-awaited `act(() => { updateEntry(...) })`, then rechecked after promise resolves. |
| `isSubmitting` true during in-flight `updateEntry`, false after failure | COVERED | Same structure; resolves with `errorJson(500)`. |
| `isSubmitting` true during in-flight `deleteEntry`, false after success | COVERED | Same held-promise pattern, `deleteEntry` variant. |
| `isSubmitting` true during in-flight `deleteEntry`, false after failure | COVERED | Resolves with `errorJson(403)`. |
| `logManualEntry` returns false + `submitError` matching `/failed to save/i` when fetch throws | COVERED | `mockFetch.mockRejectedValueOnce(...)` for POST. Source catch block at line 165 (`setSubmitError("Failed to save time entry.")`) is the target. Regex `/failed to save/i` matches. |
| `updateEntry` returns false + `submitError` matching `/failed to update/i` when fetch throws | COVERED | Source catch at line 213 (`setSubmitError("Failed to update time entry.")`). Regex `/failed to update/i` matches. |
| `deleteEntry` returns false + `submitError` matching `/failed to delete/i` when fetch throws | COVERED | Source catch at line 247 (`setSubmitError("Failed to delete time entry.")`). Regex `/failed to delete/i` matches. |
| `refreshEntries` sets `entriesError` matching `/failed to load/i` when fetch throws | COVERED | `mockFetch.mockRejectedValue(...)` (no `Once` — affects mount fetch). Source catch at line 83 (`setEntriesError("Failed to load time entries.")`). Regex matches. |

### feature-time-tracker.test.tsx

| Criterion | Verdict | Notes |
|---|---|---|
| Edit PATCH 403 → alert matching `/only edit your own/i` | COVERED | Entry rendered with `userId: USER_ID` matches session `USER_ID`, so edit button appears. PATCH mock returns `errorResponse(403)`. Source hook sets `submitError("You can only edit your own time entries.")`. Component renders `<p role="alert">` containing that text when form is open (`isManualFormOpen || editingEntryId`). |
| Edit PATCH 404 → alert matching `/not found/i` | COVERED | Same setup with `errorResponse(404)`. Hook sets `submitError("Time entry not found.")`. Alert text matches `/not found/i`. |
| Stop timer opens form with pre-filled value ≥ 1 | COVERED | `handleStopTimer` in source (line 80–89) sets `durationSeconds: String(elapsedSeconds > 0 ? elapsedSeconds : 1)`. Since elapsed is 0 at immediate stop, pre-fill is "1". Test asserts `parseInt(value) >= 1`. |
| Stop form shows Save and Cancel buttons | COVERED | After Start + Stop, form opens with `activeForm === "stop"`. Save and Cancel buttons are present per source lines 259–270. |
| Log Time button absent while timer is running | COVERED | Source line 201: button only renders when `!isRunning && !isManualFormOpen && !editingEntryId`. After Start, `isRunning` is true; button absent. |
| Start Timer button absent while timer is running | COVERED | Source line 173: `isRunning` branch renders Stop button instead; Start button only in the `else` branch (line 192). After Start, absent. |

---

## Issues Found

### [Medium] `isSubmitting` mid-flight assertion is not guarded against timing races

- **File:** `tests/untested-code/hook-use-time-tracking.test.ts:78-79` and `:99-100`
- **Description:** The pattern `act(() => { result.current.updateEntry(ENTRY_ID, 7200); });` followed by `expect(result.current.isSubmitting).toBe(true)` synchronously asserts that the flag is `true` before the promise resolves. This works today because `setIsSubmitting(true)` is the very first synchronous operation inside `updateEntry` before any `await`, so the synchronous flush of `act()` sets it before returning. However, if the implementation were ever refactored to make the flag flip asynchronous (e.g., inside a microtask), this assertion would become a false positive that passes despite the flag not being set. The baseline suite in `tests/hooks/useTimeTracking.test.ts` uses the same pattern for `logManualEntry` (line 269-270), so this is consistent with the project's established style, but the risk is worth noting.
- **Recommendation:** Accept as-is given it matches the baseline pattern. If a stricter guard is desired, wrap the assertion in `await waitFor(() => expect(...).toBe(true))`, which would survive an asynchronous refactor.

### [Medium] `feature-time-tracker` edit-form tests do not `await` initial load before opening edit form

- **File:** `tests/untested-code/feature-time-tracker.test.tsx:88-91` and `:108-112`
- **Description:** Both edit-form tests use `waitFor(() => expect(screen.getByRole("button", { name: /edit time entry/i })).toBeInTheDocument())` to wait for the entry to load, then call `userEvent.click`. This is correct and sufficient. However, the `mockFetch` default is `mockResolvedValue(okResponse([]))` in `beforeEach`, and the tests override the first call with `okResponse([entry])`. The test correctly sequences: GET→entry list renders→edit button appears→click. No problem here — this note confirms the sequencing is sound.
- **Recommendation:** No action required; analysis is reassuring.

### [Low] `act()` warnings are emitted during stop-timer and timer-running tests

- **File:** `tests/untested-code/feature-time-tracker.test.tsx` (stop-timer and timer-running describe blocks, lines 124-167)
- **Description:** The stop-timer and timer-running tests use `fireEvent.click` (synchronous) to start/stop the timer and immediately assert UI state. Because the `TimeTracker` component also triggers an async `refreshEntries` on mount (fetched via `mockFetch` default), React emits `act(...)` warnings when the fetch resolves outside an `act` boundary. The `console.error` output confirms these warnings appear at runtime. Per the task spec and `CLAUDE.md`, these are pre-existing warnings acceptable for this codebase; the new tests do not introduce new *categories* of warning, only new instances from the same root cause (the mount-time fetch).
- **Recommendation:** Accept as-is per the spec's stated assumption: "The `act()` warnings emitted by the current suites are pre-existing and acceptable; new tests should not introduce new categories of warning." If the warnings become disruptive, wrapping each timer test's render in `await act(async () => { render(...) })` would suppress them, but this is out of scope for this task.

### [Low] `api-time-entries.test.ts` PATCH-400 assertion is weak on body content

- **File:** `tests/untested-code/api-time-entries.test.ts:93-94`
- **Description:** The negative-`durationSeconds` test asserts `expect(body).toHaveProperty("error")` — a presence check only. The source returns `{ error: error.errors }` where `error.errors` is a Zod issues array. The baseline suite (e.g. `tests/api/time-entries.test.ts:253`) asserts only `res.status === 400` without checking the body at all, so this test is already stronger than baseline. However, a tighter assertion like `expect(body.error).toBeInstanceOf(Array)` or `expect(body.error[0]).toHaveProperty("message")` would better confirm the Zod path (not just any 400).
- **Recommendation:** The current assertion is adequate for the spec's stated goal. A follow-up could strengthen it to `expect(Array.isArray(body.error)).toBe(true)`.

---

## Checklist Results

| Check | Result | Notes |
|---|---|---|
| Correctness | PASS | All 12 acceptance criteria are covered. Each test triggers the documented code path in the source. |
| Mock fidelity | PASS | Mocking conventions (`jest.mock("next-auth")`, `jest.mock("@/lib/db")`, `global.fetch = jest.fn()`, `beforeEach(jest.clearAllMocks)`) match the baseline suites exactly. |
| Assertion strength | PASS WITH NOTES | All assertions are specific enough to catch the stated regression. One weak case on PATCH-400 body (Low, noted above). |
| Test isolation | PASS | Every test file has `beforeEach(jest.clearAllMocks)`. No shared mutable state between tests. |
| False positive risk | PASS WITH NOTES | No false positives identified. The `isSubmitting` mid-flight pattern is a known timing dependency (Medium, noted above) but is not a false positive in the current implementation. |
| Scoped run (0 failures) | PASS | 3 suites, 20 tests, 0 failures. |
| Full run (no regressions) | PASS | 6 suites, 102 tests, 0 failures. All pre-existing tests remain green. |
| Coverage completeness | PASS | All 12 named acceptance criteria are present and covered. |

---

## Actual Test Run Results

**Scoped run** (`--testPathPattern="tests/untested-code"`):
- Test Suites: 3 passed, 3 total
- Tests: 20 passed, 20 total
- Failures: 0

**Full run** (all suites):
- Test Suites: 6 passed, 6 total
- Tests: 102 passed, 102 total
- Failures: 0

Pre-existing tests (82 tests across `tests/api/`, `tests/hooks/`, `tests/features/`) all continue to pass with no modification.

---

## Verdict

**PASS** — All 12 acceptance criteria from the spec are covered with passing tests. Both the scoped and full suite run with zero failures. The three notes above are advisory only; none is a blocking issue.

- One Medium note on the `isSubmitting` mid-flight assertion timing dependency is consistent with the project's established baseline pattern and poses no practical regression risk with the current implementation.
- One Medium note on `act()` warnings is pre-existing and explicitly accepted by the task spec.
- One Low note on the PATCH-400 assertion strength is an improvement opportunity, not a deficiency.

No blocking issues. The implementation is ready to advance in the pipeline.
