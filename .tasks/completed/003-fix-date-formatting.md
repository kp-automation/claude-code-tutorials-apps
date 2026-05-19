# Fix UTC Date Formatting on Task Detail Page

**Owner:** ralph | **Claude role:** driver | **Branch:** `fix/003-fix-date-formatting` | **Since:** 2026-05-18

| Field | Value |
|---|---|
| **ID** | 003 |
| **Severity** | Medium |
| **Affected track** | Next.js |
| **Reported on** | 2026-05-18 |

---

## Overview

The "Created" and "Updated" timestamps on the task detail page always display
in UTC, regardless of the user's local timezone. Users outside UTC see dates
and times that are shifted by their UTC offset — for a user in UTC-5, a task
updated at 11:30 PM local time appears to have been updated at 4:30 AM the
following day.

The bug is in the task detail page component:

```tsx
// nextjs/app/projects/[id]/tasks/[taskId]/page.tsx — lines 184, 190
{new Date(task.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
{new Date(task.updatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
```

`toISOString()` always returns a UTC-normalized ISO 8601 string. The correct
approach is `toLocaleDateString()` / `toLocaleString()`, which respects the
browser's timezone.

A secondary instance of this pattern exists in the task card component:

```tsx
// nextjs/components/task-card.tsx — line 52
{new Date(task.updatedAt).toISOString().slice(0, 10)}
```

**Primary location:** `nextjs/app/projects/[id]/tasks/[taskId]/page.tsx`, lines 184 and 190
**Secondary location:** `nextjs/components/task-card.tsx`, line 52

---

## Why

Users in non-UTC timezones see incorrect timestamps throughout the task UI.
A task completed just before midnight local time shows the next day's date,
making activity timelines and audit trails unreliable. The hardcoded " UTC"
suffix on the detail page makes the mismatch visible and confusing to users
who are not in UTC.

This affects every user outside the UTC timezone — which includes most users
in production deployments.

---

## Acceptance Criteria

- [x] "Created" and "Updated" labels on the task detail page display dates and
  times in the user's local timezone, not UTC. (`toLocaleString()` used in page.tsx)
- [x] The task card's date stamp also reflects local date (not UTC date).
  (`toLocaleDateString()` used in task-card.tsx)
- [x] No hardcoded "UTC" suffix appears in any timestamp display.
  (removed "UTC" suffix; verified by `does not display a hardcoded UTC suffix` test)
- [x] A unit test for `TaskCard` verifies that the rendered date matches what
  `toLocaleDateString()` would produce for the given `updatedAt` value.
  (`renders updatedAt as local date string` test passes in task-card.test.tsx)
- [x] A unit test for the task detail page verifies the created/updated
  timestamps use local formatting. (task-detail.test.tsx created — 3/3 tests pass)
- [x] `npm test` passes with no pre-existing test failures. (Same 6 pre-existing
  failures as before: 4 dueDate in task-card.test.tsx, 2 in task-service.test.ts — none new)

---

## Plan

1. `nextjs/components/task-card.tsx` line 52 — change
   `new Date(task.updatedAt).toISOString().slice(0, 10)` to
   `new Date(task.updatedAt).toLocaleDateString()` so the card shows the user's
   local date instead of UTC.

2. `nextjs/app/projects/[id]/tasks/[taskId]/page.tsx` lines 184 and 190 — change
   both `toISOString().slice(0, 16).replace("T", " ") UTC` patterns to
   `toLocaleString()`. Remove the hardcoded " UTC" suffix.

3. `nextjs/tests/components/task-card.test.tsx` — add
   `renders updatedAt as local date string` test using `toLocaleDateString()` in
   the assertion (timezone-agnostic: both component and test call the same method).

4. `nextjs/tests/components/task-detail.test.tsx` (new file) — add a test that
   mocks `next/navigation`, `next-auth/react`, `@/src/lib/api/tasks`, and child
   components; renders `TaskDetailPage`; waits for task load; verifies timestamps
   use `toLocaleString()` format and do NOT contain the literal string "UTC".

## Progress Log

| Date | Note |
|---|---|
| 2026-05-18 | Plan written — 4 steps, 4 files (1 new). No safety gates triggered. Pre-existing failures in task-card.test.tsx: 4 dueDate tests (schema has no dueDate field — out of scope for this task). |
