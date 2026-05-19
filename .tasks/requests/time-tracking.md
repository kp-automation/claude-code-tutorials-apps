# Feature Request: Time Tracking

**Priority:** High — requested by 3 enterprise customers

## Overview

Add time tracking to TaskForge so users can log hours spent on individual tasks. The feature covers a start/stop timer, manual time entry management (create, edit, delete), and project/user-level time reports. Both the Next.js and FastAPI tracks are in scope — this is a cross-track data model change requiring a new `TimeEntry` entity, new API endpoints, and UI components for the timer and entry list.

## Why

Enterprise customers need accurate records of time spent per task to generate client invoices and analyze team productivity. Without built-in time tracking, users resort to external tools and manual reconciliation, which is error-prone and slows down billing cycles. Three enterprise customers have explicitly requested this as a condition for continued or expanded usage.

## Assumptions

- A `TimeEntry` belongs to a `Task` and a `User` (the person who logged it). Entries are not project-scoped directly — they are accessed via the task.
- Only the user who created a time entry can edit or delete it (ownership-scoped, consistent with tasks and comments).
- The timer is client-side: the UI tracks the start timestamp locally and submits a completed entry on stop. There is no server-side "active timer" state to persist or recover from.
- Duration is stored in seconds (integer) on the server. Display formatting (h/m/s) is handled client-side.
- Time reports are read-only aggregations — no separate "report" entity is stored; reports are computed from existing `TimeEntry` rows filtered by project or user.
- Manual entry (without using the timer) must also be supported so users can log time retroactively.
- This feature does not introduce billing or invoicing logic — it surfaces data only.
- Roles (ADMIN/MEMBER/VIEWER) do not gate time entry access beyond the existing ownership model. A VIEWER may not be able to log time (TBD with stakeholders — flagged as a gap).

## Acceptance Criteria

- [ ] A user can start a timer on a task; starting a timer records the current timestamp client-side.
- [ ] A user can stop a running timer; stopping creates a `TimeEntry` with the computed duration and an optional description.
- [ ] A user can manually create a time entry on a task by supplying a duration and optional description without using the timer.
- [ ] A user can view all time entries for a task they have access to, ordered by most recent first.
- [ ] A user can edit the duration and description of a time entry they own.
- [ ] A user can delete a time entry they own.
- [ ] `GET /api/tasks/{id}/time-entries` returns all entries for a task (401 if unauthenticated, 404 if task not found, 403 if caller does not own the parent project).
- [ ] `POST /api/tasks/{id}/time-entries` creates a new entry (422 on invalid duration, e.g. zero or negative seconds).
- [ ] `PATCH /api/time-entries/{id}` updates an owned entry (403 if caller is not the entry owner).
- [ ] `DELETE /api/time-entries/{id}` deletes an owned entry (403 if caller is not the entry owner).
- [ ] `GET /api/projects/{id}/time-report` returns total seconds and entry count grouped by user for all tasks in the project.
- [ ] Deleting a task cascades to its time entries (no orphaned rows).
- [ ] Existing test suites still pass (`npm test` / `pytest`).

## Plan

<!-- To be filled in during planning. -->
