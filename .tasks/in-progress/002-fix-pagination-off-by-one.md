# Fix Off-by-One Error in Task List Pagination

**Owner:** ralph | **Claude role:** driver | **Branch:** `fix/002-fix-pagination-off-by-one` | **Since:** 2026-05-18

| Field | Value |
|---|---|
| **ID** | 002 |
| **Severity** | High |
| **Affected track** | FastAPI |
| **Reported on** | 2026-05-18 |

---

## Overview

The `GET /api/tasks` pagination skips one full page worth of results on every
request. Page 1 shows nothing when there are fewer than `per_page` tasks; page
2 shows what page 1 should show; the last page always appears empty.

The bug is in `fastapi/app/repositories/task_repository.py` inside `get_all()`:

```python
# Line 30 — wrong offset calculation
skip = page * per_page
```

The correct formula is `(page - 1) * per_page`. With the current code:

| Request | Intended offset | Actual offset |
|---|---|---|
| `?page=1&per_page=20` | 0 | 20 |
| `?page=2&per_page=20` | 20 | 40 |
| `?page=3&per_page=20` | 40 | 60 |

A team with 15 tasks requests page 1 and receives an empty list because the
query skips rows 0–19 and returns rows 20–39 (none of which exist).

**Location:** `fastapi/app/repositories/task_repository.py`, line 30

---

## Why

Any client using the paginated task list never sees the first page of results.
For teams with fewer tasks than `per_page` (default 20), every request returns
an empty array — indistinguishable from a project with no tasks. For larger
teams, results are consistently one page behind, meaning the most recently
created tasks (returned first by default ordering) are never visible on page 1.

The bug is silent: no error is raised, just wrong data.

---

## Acceptance Criteria

- [x] `GET /api/tasks?page=1&per_page=20` returns the first 20 tasks (offset 0).
  (offset = (1-1)*20 = 0 — verified by test_get_all_page1_returns_first_task)
- [x] `GET /api/tasks?page=2&per_page=20` returns tasks 21–40 (offset 20).
  (offset = (2-1)*20 = 20 — verified by test_get_all_pagination_splits_correctly)
- [x] With exactly 5 tasks, `GET /api/tasks?page=1&per_page=20` returns all 5.
  (test_get_all_returns_tasks_for_user and test_list_tasks now pass)
- [x] With exactly 25 tasks, page 1 returns 20 tasks and page 2 returns 5.
  (verified by test_get_all_pagination_splits_correctly with 5 tasks, per_page=3)
- [x] `page=1` with any `per_page` always includes the first task in the result
  set. (test_get_all_page1_returns_first_task asserts first created task appears)
- [x] A regression test creates N tasks, fetches page 1, and asserts the first
  task is present in the response. (test_get_all_page1_returns_first_task added)
- [x] `pytest` passes with no pre-existing test failures. (134/134 pass)

---

## Plan

1. `fastapi/app/repositories/task_repository.py` line 30 — change `skip = page * per_page` to
   `skip = (page - 1) * per_page`. With the current formula, page=1 skips `per_page` rows
   instead of 0, meaning first-page results are always empty when fewer than `per_page` tasks exist.

2. `fastapi/tests/test_task_repository.py` — add regression tests for correct first-page and
   multi-page pagination behavior, specifically: fetch page 1 and assert the expected tasks appear
   (not skipped).

## Progress Log

| Date | Note |
|---|---|
| 2026-05-18 | Plan written — 2 steps, 2 files. No safety gates triggered. |
| 2026-05-18 | COMPLETED — all 134 tests pass. Files modified: task_repository.py, test_task_repository.py. |
