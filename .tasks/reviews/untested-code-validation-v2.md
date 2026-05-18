# Validation Report: untested-code — Gap Tests Follow-Up (v2)

**Date:** 2026-05-18
**Status:** PASS
**Pipeline Stage:** Review — post-fix verification
**Files Reviewed:**
- `tests/untested-code/api-time-entries.test.ts` (changed)
- `tests/untested-code/hook-use-time-tracking.test.ts` (unchanged, verified)
- `tests/untested-code/feature-time-tracker.test.tsx` (unchanged, verified)
- `src/api/time-entries/route.ts` (source under test, for fix correctness check)

**Stack / Frameworks:** Next.js 15, TypeScript, React Testing Library, Jest (jsdom / node env), `next-auth` mocked, Prisma mocked via `@/lib/db`

---

## Summary of Changes Since v1

Exactly one line was added to `tests/untested-code/api-time-entries.test.ts`. The addition is at line 94, immediately after the pre-existing `expect(body).toHaveProperty("error")` check at line 93, inside the `"returns 400 when durationSeconds is negative"` test:

```ts
expect(Array.isArray(body.error)).toBe(true);
```

No other file in the `tests/untested-code/` directory was modified.

---

## Per-Issue Verdict

### [Low] PATCH-400 weak body assertion — FIXED CORRECTLY

The v1 report identified that `expect(body).toHaveProperty("error")` was a presence-only check and recommended strengthening it to `expect(Array.isArray(body.error)).toBe(true)`.

**Placement:** The new assertion is on line 94, the line immediately following the existing `toHaveProperty` check (line 93), within the same `it` block and the same `describe("PATCH /api/time-entries/[id] — Zod validation", ...)` group. Placement is correct.

**Semantic correctness:** The PATCH handler at `src/api/time-entries/route.ts` lines 163–165 contains:

```ts
if (error instanceof z.ZodError) {
  return NextResponse.json({ error: error.errors }, { status: 400 });
}
```

`error.errors` is a `ZodIssue[]`, which is a JavaScript array. `Array.isArray(body.error)` will be `true` on this path and `false` on the non-Zod 500 path (where `body.error` is the string `"Internal server error"`). The assertion therefore precisely discriminates the Zod branch from all other error shapes and is semantically correct.

**The assertion also does not fire falsely on the 500 path** because the test inputs `{ durationSeconds: -1 }` to a mocked `entryParams()` with no `prisma.timeEntry.findUnique` setup — the route reaches the Zod parse at line 140 before any database call. Zod's `.positive()` constraint rejects `-1` and throws a `ZodError`, which is caught at line 164 and returns 400 with an array payload. There is no ambiguity.

The fix is correct, targeted, and sufficient.

### [Medium] `isSubmitting` mid-flight timing — CORRECTLY LEFT AS-IS

No change was made to `tests/untested-code/hook-use-time-tracking.test.ts`. The v1 report accepted this pattern as consistent with the project baseline (`tests/hooks/useTimeTracking.test.ts` uses the same synchronous `act(() => { ... })` → immediate assertion pattern). This decision remains valid. Nothing about the Low fix in the API test file affects the hook test file or the underlying timing concern.

### [Medium] `act()` warnings — CORRECTLY LEFT AS-IS

No change was made to `tests/untested-code/feature-time-tracker.test.tsx`. The `act()` warnings observed during the test run originate from the mount-time `refreshEntries` fetch resolving outside an `act` boundary inside the stop-timer and timer-running test groups, as described in v1. These are the same pre-existing warnings documented in CLAUDE.md as acceptable for this codebase. The Low fix introduces no new warning categories and does not interact with the component tests. The accept decision remains valid.

---

## Actual Test Run Results

**Scoped run** (`--testPathPattern="tests/untested-code" --no-coverage --verbose`):
- Test Suites: 3 passed, 3 total
- Tests: 20 passed, 20 total
- Snapshots: 0 total
- Time: 1.325 s
- Failures: 0

**Full run** (`--no-coverage`):
- Test Suites: 6 passed, 6 total
- Tests: 102 passed, 102 total
- Snapshots: 0 total
- Time: 2.315 s
- Failures: 0

Pre-existing 82 tests (across `tests/api/`, `tests/hooks/`, `tests/features/`, and `nextjs/tests/components/`) all continue to pass with no regressions.

---

## Checklist Results

| Check | Result | Notes |
|---|---|---|
| Fix placed correctly | PASS | Line 94, same `it` block, immediately after the `toHaveProperty` assertion it strengthens. |
| Fix semantically correct | PASS | `error.errors` is `ZodIssue[]`; `Array.isArray` is true on the Zod path and false on the 500 path. Assertion discriminates the target code path unambiguously. |
| No unintended changes to hook test | PASS | `hook-use-time-tracking.test.ts` is identical to v1 — confirmed by full read. |
| No unintended changes to feature test | PASS | `feature-time-tracker.test.tsx` is identical to v1 — confirmed by full read. |
| Medium issues still valid accept decisions | PASS | Neither Medium note is affected by the Low fix. Both remain consistent with project baseline. |
| Scoped suite (0 failures) | PASS | 20/20 tests pass. |
| Full suite (no regressions) | PASS | 102/102 tests pass. |

---

## Verdict

**PASS** — The Low fix is correctly placed and semantically accurate. Both Medium issues remain valid accept decisions. All 20 gap tests and all 102 total tests pass with zero failures. No new issues introduced.

The implementation is ready to advance in the pipeline.
