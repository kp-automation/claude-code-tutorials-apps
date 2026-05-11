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
