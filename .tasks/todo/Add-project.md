# Add Project Edit, Archive, and Delete UI

## Description

Both tracks already implement the full project CRUD API (`PATCH`/`PUT`, `DELETE`, status toggle), but the Next.js UI only surfaces project creation. Users have no way to rename a project, update its description, archive it, or delete it from the interface. This task adds those three actions — edit, archive/unarchive, and delete — to the project list and detail views.

## Why

A user who creates a project and later wants to rename it, wind it down, or remove it entirely is stuck — the actions exist in the API but are completely unreachable from the UI. Without edit and archive, projects accumulate without any way to manage them. Without delete, there is no way to clean up mistakes or test projects.

## Scope

- [x] Next.js (UI + API routes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)

The API contract is already complete on both tracks. Only the Next.js UI layer is in scope.

## Acceptance Criteria

- [ ] Each project card on the projects list page has an actions menu (or inline buttons) with **Edit**, **Archive/Unarchive**, and **Delete** options
- [ ] **Edit** opens a prefilled dialog with the current `name` and `description`; submitting sends `PATCH /api/projects/[id]` and refreshes the list
- [ ] **Archive** sends `PATCH /api/projects/[id]` with `{ status: "ARCHIVED" }` and **Unarchive** sends `{ status: "ACTIVE" }`; the card icon updates to reflect the new state without a full page reload
- [ ] **Delete** shows a confirmation prompt before sending `DELETE /api/projects/[id]`; on confirm the project is removed from the list
- [ ] The same Edit / Archive / Delete actions are available from the project detail page header
- [ ] A non-owner viewing a shared project (i.e., if the API returns 403) sees no edit/archive/delete controls — the UI should not surface actions the user cannot perform
- [ ] Error states are surfaced to the user (e.g., if the PATCH or DELETE request fails, the dialog stays open and shows an inline error rather than silently failing)
- [ ] Existing test suites still pass (`npm test`)

## Technical Notes

### Files to modify

**Next.js**
- `nextjs/components/project-list.tsx` — add an actions menu to each project card; wire edit/archive/delete callbacks
- `nextjs/app/projects/[id]/page.tsx` — add Edit / Archive / Delete buttons to the project header
- `nextjs/app/api/projects/[id]/route.ts` — no changes needed; `PATCH` and `DELETE` are already implemented

### New files

- `nextjs/components/project-actions.tsx` — (optional) encapsulate the edit dialog + archive toggle + delete confirmation if the logic grows large enough to warrant extraction

### API contract

These endpoints already exist and are unchanged:

```
PATCH /api/projects/[id]
Body: { name?: string, description?: string, status?: "ACTIVE" | "ARCHIVED" }
Response 200: updated project object
Errors: 401, 403, 404, 400 (Zod validation)

DELETE /api/projects/[id]
Response 200: { success: true }
Errors: 401, 403, 404
```

## Plan

<!-- Left blank intentionally — to be filled in before implementation begins. -->

## Review Notes

**Critical**
- The edit dialog must prefill from the current project state, not from stale form state left over from a previous open. Reset or reinitialize the form fields when the dialog opens.
- `DELETE` cascades to all tasks, labels, and comments. The confirmation prompt should warn the user: "Deleting this project will permanently remove all its tasks and comments."

**Gaps**
- The project list currently has no way to distinguish which projects the current user owns vs. projects that might surface in the future (e.g., shared projects). For now, assume all listed projects are owned by the current user (matches the existing `where: { ownerId }` filter), so all cards show actions.

**Minor**
- Archive/Unarchive should toggle based on the current `project.status` value — one button, not two separate menu items.
- Use `router.refresh()` after mutations (consistent with how `fetchProjects` + `router.refresh()` is already called in `app/projects/page.tsx`).

## Notes

- The `PATCH` route at `nextjs/app/api/projects/[id]/route.ts` already validates `status` as `z.enum(["ACTIVE", "ARCHIVED"])` — no route changes needed.
- The project detail page (`app/projects/[id]/page.tsx`) already imports `useRouter` — reuse it for post-mutation refresh.
- Match the existing dialog pattern from `app/projects/page.tsx` (create project) for the edit dialog shape.

---

## Completion

<!-- Fill this in when the task is moved to done/. -->

**Branch:** `feat/...`
**Commits:**

**Summary of what shipped:**

**Decisions made:**

**Known gaps / follow-up work:**

**Testing done:**
- [ ] `npm test` — X/X pass
- [ ] Manual smoke test in browser
