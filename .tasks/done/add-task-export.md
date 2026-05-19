# Add Task Export to CSV

## Goal

Allow users to export tasks from a project to a CSV file, covering both the Next.js and FastAPI tracks.

## Scope

- Add a `GET /api/projects/:id/export` endpoint that returns tasks as a CSV download
- Implement in both tracks (Next.js route handler + FastAPI router/service)
- Include task fields: id, title, description, status, priority, assignee, labels, createdAt, updatedAt

## Tasks

- [x] FastAPI: add `GET /api/projects/{project_id}/export` endpoint returning `text/csv`
- [x] FastAPI: add export logic in `project_service.py` (or a new `export_service.py`)
- [x] Next.js: add `GET /api/projects/[id]/export/route.ts` returning a CSV response
- [x] Both: scope export by current user ownership (no exporting other users' projects)
- [x] Both: write integration tests for the export endpoint

## Notes

- Response should set `Content-Disposition: attachment; filename="tasks.csv"` and `Content-Type: text/csv`
- Labels should be serialized as a semicolon-separated string within the CSV cell
- No UI changes required unless explicitly requested

## Completion

**Status:** Done — merged to `main` via PR #1 (`anderson-ct/claude-code-tutorials-apps`)
**Date:** 2026-05-11
**Branch:** `feature/add-task-export` (squash-merged, branch deleted)

### What was delivered

- **`nextjs/lib/utils/csv.ts`** — `tasksToCSV()` utility with RFC-4180 quoting; `TaskForExport` interface
- **`nextjs/app/api/projects/[id]/export/route.ts`** — GET handler; auth + ownership check + CSV response
- **`nextjs/app/projects/[id]/page.tsx`** — "Export CSV" button with browser download; shows "No tasks to export." message for empty projects
- **`fastapi/app/utils/csv_export.py`** — `tasks_to_csv()` using stdlib `csv.writer`
- **`fastapi/app/services/task_service.py`** — `get_tasks_for_export()` with `selectinload` for labels and assignee (avoids N+1)
- **`fastapi/app/routers/projects.py`** — `GET /{project_id}/export` endpoint
- **`nextjs/tests/api/export.test.ts`** — 8 Jest tests (auth, 404, 403, CSV shape, quoting, email fallback)
- **`fastapi/tests/test_export.py`** — 7 pytest tests (auth, 404, 403, header row, multi-row, column count, cross-user isolation)
- `README.md` and `CHANGELOG.md` updated

### Post-scope additions

- Empty-task guard added to `handleExport` after PR review (shows inline message instead of downloading a header-only CSV)
