# Add Task Filtering

## Description

Implement task filtering and search functionality across both the Next.js and FastAPI tracks.

## Acceptance Criteria

- [ ] Filter tasks by status (TODO, IN_PROGRESS, DONE)
- [ ] Filter tasks by priority (LOW, MEDIUM, HIGH, URGENT)
- [ ] Filter tasks by assignee
- [ ] Search tasks by title/description keyword
- [ ] Filters are reflected in the UI (TaskFilters component)
- [ ] Filters wire into the TaskBoard component
- [ ] FastAPI `/api/tasks` supports query params for filtering
- [ ] Both tracks return consistent filtered results

## Plan

1. **Extend `TaskFilters` component** — add `priorityFilter`, `assigneeFilter`, and `members` props; add priority select and assignee select UI controls.
2. **Extend `TaskBoard`** — derive unique assignees from the tasks array, add `?priority` and `?assignee` URL params, apply them in the client-side filter logic, pass new props to `TaskFilters`.
3. **FastAPI query params** — add `status`, `priority`, `assignee_id`, `q` as optional `Query` params to `list_tasks` router; update `get_tasks` service to chain `.filter()` calls for each.
4. **Next.js API query params** — read `status`, `priority`, `assigneeId`, `q` from `searchParams` in `GET /api/tasks` and apply to the Prisma `where` clause for cross-track consistency.

## Notes

- TaskFilters presentational component already exists (commit `649c44b`)
- TaskBoard wires filtering and search (commit `803279c`)
- FastAPI task_service and task router may need query param support added
