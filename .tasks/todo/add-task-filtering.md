# Add Task Filtering & Search to TaskBoard

## Overview

Add client-side filtering and search functionality to the `TaskBoard` component. Users will be able to filter tasks by status and search by keyword, with filter state persisted in URL query parameters.

## Why

As projects grow, the kanban board becomes hard to navigate. Users need a way to narrow down tasks without leaving the board view — especially when triaging a backlog or checking what's assigned to a specific status.

## Acceptance Criteria

- [ ] Status filter using the `TaskStatus` enum (`TODO`, `IN_PROGRESS`, `DONE`) renders as a select or segmented control above the board
- [ ] Search input filters tasks by title (and optionally description) as the user types
- [ ] Active filters are reflected in URL query params via `next/navigation` (`useSearchParams` / `useRouter`) so the filtered view is shareable and survives a page refresh
- [ ] A "Clear filters" button resets both the status filter and the search input (and removes params from the URL)
- [ ] When no tasks match the active filters, each column shows an empty state rather than disappearing
- [ ] Filtering is purely client-side — no additional API calls

## Technical Notes

**Files to modify**
- `nextjs/components/task-board.tsx` — primary change; add filter/search state, derive filtered task lists per column, wire up URL params
- `nextjs/lib/types.ts` — confirm `TaskStatus` union is importable; no changes expected

**New components (create as needed)**
- `nextjs/components/task-filters.tsx` — encapsulates the status select + search input + clear button; receives current values and `onChange` callbacks as props

**URL param conventions**
- `?status=IN_PROGRESS` for status filter (omit param when "All")
- `?q=search+term` for keyword search

**Notes**
- Use `useSearchParams` (read) and `router.push` / `router.replace` (write) from `next/navigation`; wrap reads in a `Suspense` boundary if needed
- Keep filter logic colocated in `task-board.tsx` for now — extract to a hook only if it grows complex

## Plan

### 1. Confirm `TaskStatus` import (no file change)

`TaskStatus` is already exported from `nextjs/lib/types.ts` as `"TODO" | "IN_PROGRESS" | "DONE"`.
Import it in the new component and the updated board via `import { TaskStatus } from "@/lib/types"`.
No changes to `types.ts` needed.

---

### 2. Create `nextjs/components/task-filters.tsx`

New presentational component — owns no state, takes everything via props.

**Props interface:**
```ts
interface TaskFiltersProps {
  statusFilter: TaskStatus | "ALL";
  searchQuery: string;
  onStatusChange: (value: TaskStatus | "ALL") => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}
```

**UI:**
- `Select` from `@/components/ui/select` — options: All, To Do, In Progress, Done
- `Input` from `@/components/ui/input` — placeholder "Search tasks…", controlled by `searchQuery`
- Clear button (plain `Button` variant `ghost`) — render only when `statusFilter !== "ALL"` or `searchQuery !== ""`

**Verify:** `npx tsc --noEmit` passes. Component renders visibly above the board in the browser with no console errors.

---

### 3. Update `nextjs/components/task-board.tsx`

This is the main change. Three sub-steps in one file edit:

**3a. Add URL param reads**

Add `useSearchParams` to the existing `next/navigation` import.
Read initial values at the top of the component:

```ts
const searchParams = useSearchParams();
const statusParam = searchParams.get("status") as TaskStatus | null;
const qParam = searchParams.get("q") ?? "";
```

**3b. Add `updateFilters` helper**

Writes both params back to the URL with `router.replace` (not `push`, so filters don't pollute browser history):

```ts
function updateFilters(status: TaskStatus | "ALL", q: string) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  const qs = params.toString();
  router.replace(qs ? `?${qs}` : "?");
}
```

**3c. Replace hardcoded column derivations with filtered ones**

Replace the current three `tasks.filter(t => t.status === "...")` calls with a shared filtered list, then split by status:

```ts
const filtered = tasks.filter((t) => {
  const matchesStatus = !statusParam || t.status === statusParam;
  const matchesQuery = !qParam || t.title.toLowerCase().includes(qParam.toLowerCase());
  return matchesStatus && matchesQuery;
});

const todoTasks      = filtered.filter((t) => t.status === "TODO");
const inProgressTasks = filtered.filter((t) => t.status === "IN_PROGRESS");
const doneTasks      = filtered.filter((t) => t.status === "DONE");
```

**3d. Render `<TaskFilters>` above the grid**

Wrap in `<Suspense fallback={null}>` to satisfy Next.js App Router's `useSearchParams` requirement, then pass URL-derived values and `updateFilters` callbacks:

```tsx
<Suspense fallback={null}>
  <TaskFilters
    statusFilter={statusParam ?? "ALL"}
    searchQuery={qParam}
    onStatusChange={(s) => updateFilters(s, qParam)}
    onSearchChange={(q) => updateFilters(statusParam ?? "ALL", q)}
    onClear={() => updateFilters("ALL", "")}
  />
</Suspense>
```

**3e. Update empty-state copy**

When a column has no tasks *and* a filter is active, show "No tasks match your filters" instead of the default copy. Check `statusParam || qParam` to distinguish the two cases.

**Verify:** `npx tsc --noEmit` passes. In the browser: status filter updates the URL and narrows columns; search input narrows by title; page refresh retains filters; clear button removes params and shows all tasks; a column with no matches shows the right empty state.

---

### 4. Run existing test suite

```bash
cd nextjs && npm test
```

No test files touch `task-board.tsx` or the new component today, so this is a regression check only. All pre-existing tests should still pass.

---

### Order summary

| Step | File | Action |
|------|------|--------|
| 1 | `lib/types.ts` | Read-only confirm, no edit |
| 2 | `components/task-filters.tsx` | Create |
| 3 | `components/task-board.tsx` | Modify |
| 4 | — | `npm test` regression check |



## Completion section

Add task filtering and search to TaskBoard                                                                        
                                                                                                                    
  Summary                                                                                                           
                                                                                                                    
  - Adds client-side status filtering and keyword search to the kanban board                                        
  - Filter state is persisted in URL query params (?status=, ?q=) so filtered views are shareable and survive page  
  refresh                                                                                                           
  - No new API calls — filtering is derived entirely from the already-fetched task list                             
                                                                                                                    
  Files changed                                                                                                     
                                                                                                                    
  ┌────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐  
  │                File                │                                 Change                                  │
  ├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ nextjs/components/task-filters.tsx │ New — presentational filter bar (status select, search input, clear     │
  │                                    │ button)                                                                 │
  ├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
  │ nextjs/components/task-board.tsx   │ Modified — reads URL params, derives filtered columns, renders          │
  │                                    │ TaskFilters                                                             │  
  ├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ nextjs/.eslintrc.json              │ New — ESLint baseline (was missing; npm run lint previously errored     │  
  │                                    │ with an interactive prompt)                                             │  
  └────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
                                                                                                                    
  How it works                                                                                                    

  TaskBoard reads ?status and ?q from the URL via useSearchParams. A single filtered pass over the task list applies
   both predicates, then the three column arrays are split from that result. TaskFilters is a purely presentational
  component that receives current values and callbacks — it owns no state. Filter changes call router.replace (not  
  push) so the browser back-button is not polluted with every keystroke.                                          

  Decisions made

  URL as the only source of truth — no useState for filter values. This means the filtered view is bookmarkable and 
  sharable by default, with no extra sync logic needed.
                                                                                                                    
  router.replace over router.push — typing in the search box would otherwise fill the history stack, making         
  back-navigation broken.
                                                                                                                    
  TaskFilters is fully prop-driven — it has no knowledge of the URL. This keeps it independently testable and       
  reusable if the board is ever embedded in a context without URL params.
                                                                                                                    
  Suspense wraps TaskFilters — satisfies the Next.js App Router requirement for components near useSearchParams     
  calls, preventing full-page SSR deoptimization.
                                                                                                                    
  ESLint rules configured to match documented codebase patterns — no-explicit-any is off (the as any cast on session
   user is the established pattern per CLAUDE.md), no-unused-vars is warn not error (intentional imperfections like
  unused catch bindings and dead state are teaching surface), no-empty-object-type is off (shadcn/ui primitive      
  pattern).                                                 

  Testing done

  - npm run lint — exits 0 across all three commits; warnings are pre-existing intentional patterns                 
  - npm test — 68/68 tests pass across all three commits with no regressions; the 2 pre-existing suite failures
  (Request is not defined in the Jest jsdom environment) are unrelated to this change and were present before work  
  began                                                     
                       
## GitHub Issue

https://github.com/kp-automation/claude-code-tutorials-apps/issues/1