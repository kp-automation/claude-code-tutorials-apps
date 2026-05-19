# Add Task Priority Levels

**Owner:** — | **Claude role:** handoff-pending | **Branch:** `feat/add-task-priority` | **Since:** 2026-05-08

## Overview

Add priority levels (LOW, MEDIUM, HIGH, URGENT) to tasks across both tracks, including a priority selector in the task form, a color-coded visual indicator in the task list, a sort-by-priority option on the kanban board, and a default of MEDIUM. Affects both the Next.js and FastAPI tracks.

## Why

Tasks need a way to communicate urgency at a glance. Without priority levels, teams have no structured way to distinguish blocking work from background tasks in the kanban view. Sorting by priority lets team members triage their columns without manually scanning card content.

## Acceptance Criteria

- [x] Priority field exists on the Task model in both tracks with values LOW / MEDIUM / HIGH / URGENT.
- [x] New tasks default to MEDIUM priority when no value is supplied.
- [x] Task creation form includes a priority selector (Next.js: project detail page form).
- [x] Task edit form includes a priority selector (Next.js: task detail page).
- [x] Task cards display a color-coded priority badge (LOW=blue, MEDIUM=yellow, HIGH=orange, URGENT=red).
- [x] API validates priority on create and update in both tracks (Zod in Next.js, Pydantic enum in FastAPI).
- [x] Kanban board has a "Sort by priority" option in the filter bar; selecting it orders cards within each column URGENT → HIGH → MEDIUM → LOW.
- [ ] `GET /api/tasks` in the FastAPI track accepts an optional `sort=priority` query param and returns tasks ordered URGENT first.
- [ ] Existing test suites still pass (`npm test` / `pytest`).

## Notes

Most of this feature is already in the codebase as of branch `feat/add-task-filtering`. The only gap is the sort-by-priority option — neither the UI filter bar nor the FastAPI list endpoint currently support ordering by priority.

Priority sort order across the app: URGENT (highest) → HIGH → MEDIUM → LOW (lowest). This maps to an integer weight `{ URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }` for client-side sort comparisons.

The FastAPI `GET /api/tasks` endpoint already has a `project_id` query param pattern in `fastapi/app/routers/tasks.py`; adding `sort` follows the same shape. The service layer (`get_tasks` in `task_service.py`) is where the `order_by` clause should be added to keep the router thin.

`TaskFilters` (`nextjs/components/task-filters.tsx`) currently renders a status select + search input. The sort control fits naturally alongside those as a third select. `TaskBoard` (`nextjs/components/task-board.tsx`) owns the `filtered` array and is the right place to apply client-side sort before splitting into columns.

Do not touch the intentional imperfections in `comments.py` (mixed query styles) while working on this.

## Plan

### Step summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | Next.js | `components/task-filters.tsx` | Add `sortOrder` prop + sort `<Select>` |
| 2 | Next.js | `components/task-board.tsx` | Read `sort` URL param, apply sort, wire callbacks |
| 3 | FastAPI | `app/routers/tasks.py` | Add `sort` query param, pass to service |
| 4 | FastAPI | `app/services/task_service.py` | Add `order_by` priority case in `get_tasks` |
| 5 | FastAPI | `tests/test_tasks.py` | Add sort tests |
| 6 | Both | — | Run full test suites |

---

### 1. `nextjs/components/task-filters.tsx` — add sort control

**Current state (verified):** 64 lines. Interface at lines 14–20; function signature + `isFiltering` at lines 22–29; status `<Select>` closes at line 46; `<Input>` at line 48.

**a. Extend the props interface** — replace lines 14–20:

```ts
// BEFORE (lines 14–20)
interface TaskFiltersProps {
  statusFilter: TaskStatus | "ALL";
  searchQuery: string;
  onStatusChange: (value: TaskStatus | "ALL") => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

// AFTER
interface TaskFiltersProps {
  statusFilter: TaskStatus | "ALL";
  searchQuery: string;
  sortOrder: "priority" | "none";
  onStatusChange: (value: TaskStatus | "ALL") => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: "priority" | "none") => void;
  onClear: () => void;
}
```

**b. Destructure the new props and widen `isFiltering`** — replace lines 22–29:

```ts
// BEFORE (lines 22–29)
export function TaskFilters({
  statusFilter,
  searchQuery,
  onStatusChange,
  onSearchChange,
  onClear,
}: TaskFiltersProps) {
  const isFiltering = statusFilter !== "ALL" || searchQuery !== "";

// AFTER
export function TaskFilters({
  statusFilter,
  searchQuery,
  sortOrder,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onClear,
}: TaskFiltersProps) {
  const isFiltering = statusFilter !== "ALL" || searchQuery !== "" || sortOrder !== "none";
```

**c. Insert a sort `<Select>` after line 46 `</Select>`, before line 48 `<Input>`:**

```tsx
      <Select
        value={sortOrder}
        onValueChange={(v) => onSortChange(v as "priority" | "none")}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sort: Default</SelectItem>
          <SelectItem value="priority">Sort: Priority</SelectItem>
        </SelectContent>
      </Select>
```

No new imports needed — `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` are already imported at lines 6–12.

**Verify:** `npm run build` compiles without type errors.

---

### 2. `nextjs/components/task-board.tsx` — read URL param, sort, wire callbacks

**Current state (verified):** 129 lines. `statusParam` at line 22, `qParam` at line 23; `updateFilters` at lines 25–31; `isFiltering` at line 33; `filtered` at lines 35–39; `<TaskFilters>` at lines 52–58 (inside a `<Suspense>` wrapper — do not change the wrapper).

**a. Add `sortParam` after line 23:**

```ts
// ADD after line 23
const sortParam = searchParams.get("sort") as "priority" | null;
```

**b. Replace `updateFilters` (lines 25–31) to accept `sort`:**

```ts
// BEFORE (lines 25–31)
function updateFilters(status: TaskStatus | "ALL", q: string) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  const qs = params.toString();
  router.replace(qs ? `?${qs}` : "?");
}

// AFTER
function updateFilters(status: TaskStatus | "ALL", q: string, sort: "priority" | "none") {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  if (sort !== "none") params.set("sort", sort);
  const qs = params.toString();
  router.replace(qs ? `?${qs}` : "?");
}
```

**c. Replace `isFiltering` + `filtered` block (lines 33–39) to add priority sort:**

```ts
// BEFORE (lines 33–39)
const isFiltering = !!(statusParam || qParam);

const filtered = tasks.filter((t) => {
  const matchesStatus = !statusParam || t.status === statusParam;
  const matchesQuery = !qParam || t.title.toLowerCase().includes(qParam.toLowerCase());
  return matchesStatus && matchesQuery;
});

// AFTER
const isFiltering = !!(statusParam || qParam || sortParam);

const filtered = tasks.filter((t) => {
  const matchesStatus = !statusParam || t.status === statusParam;
  const matchesQuery = !qParam || t.title.toLowerCase().includes(qParam.toLowerCase());
  return matchesStatus && matchesQuery;
});

const PRIORITY_WEIGHT: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
if (sortParam === "priority") {
  filtered.sort((a, b) => (PRIORITY_WEIGHT[a.priority] ?? 4) - (PRIORITY_WEIGHT[b.priority] ?? 4));
}
```

`tasks.filter()` returns a new array, so mutating it with `.sort()` is safe even though `filtered` is declared with `const`.

**d. Replace `<TaskFilters>` (lines 52–58) to pass the new props:**

```tsx
// BEFORE (lines 52–58)
<TaskFilters
  statusFilter={statusParam ?? "ALL"}
  searchQuery={qParam}
  onStatusChange={(s) => updateFilters(s, qParam)}
  onSearchChange={(q) => updateFilters(statusParam ?? "ALL", q)}
  onClear={() => updateFilters("ALL", "")}
/>

// AFTER
<TaskFilters
  statusFilter={statusParam ?? "ALL"}
  searchQuery={qParam}
  sortOrder={sortParam ?? "none"}
  onStatusChange={(s) => updateFilters(s, qParam, sortParam ?? "none")}
  onSearchChange={(q) => updateFilters(statusParam ?? "ALL", q, sortParam ?? "none")}
  onSortChange={(sort) => updateFilters(statusParam ?? "ALL", qParam, sort)}
  onClear={() => updateFilters("ALL", "", "none")}
/>
```

**Verify:** `npm run dev`, open any project, select "Sort: Priority" — cards within each kanban column reorder URGENT → HIGH → MEDIUM → LOW without a full page reload. Selecting "Sort: Default" and "Clear filters" both restore the original order.

---

### 3. `fastapi/app/routers/tasks.py` — add `sort` query param

**Current state (verified):** `list_tasks` at lines 12–19. Only `project_id` query param; calls `get_tasks(db, current_user, project_id)`.

Replace lines 12–19:

```python
# BEFORE (lines 12–19)
@router.get("", response_model=list[Task])
def list_tasks(
    project_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tasks, optionally filtered by project_id"""
    return get_tasks(db, current_user, project_id)

# AFTER
@router.get("", response_model=list[Task])
def list_tasks(
    project_id: int | None = Query(None),
    sort: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tasks, optionally filtered by project_id"""
    return get_tasks(db, current_user, project_id, sort)
```

No other changes in this file.

**Verify:** Restart uvicorn and confirm `GET /api/tasks` in `/docs` now shows a `sort` query parameter.

---

### 4. `fastapi/app/services/task_service.py` — add priority ordering

**Current state (verified):** Line 1 is `from sqlalchemy.orm import Session` — there is **no** existing `from sqlalchemy import ...` line, so the new import is added as a new first line. `get_tasks` is at lines 10–18.

**a. Insert a new import at line 1 (before `from sqlalchemy.orm import Session`):**

```python
# ADD as new line 1
from sqlalchemy import case
```

**b. Replace `get_tasks` signature and body (lines 10–18) to accept `sort` and apply `order_by`:**

```python
# BEFORE (lines 10–18)
def get_tasks(db: Session, user: User, project_id: int | None = None) -> list[Task]:
    """Get tasks, optionally filtered by project"""
    # Authorization is enforced through the project join...
    query = db.query(Task).join(Project).filter(Project.owner_id == user.id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    return query.all()

# AFTER
def get_tasks(db: Session, user: User, project_id: int | None = None, sort: str | None = None) -> list[Task]:
    """Get tasks, optionally filtered by project"""
    # Authorization is enforced through the project join...
    query = db.query(Task).join(Project).filter(Project.owner_id == user.id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if sort == "priority":
        priority_order = case(
            (Task.priority == "URGENT", 0),
            (Task.priority == "HIGH", 1),
            (Task.priority == "MEDIUM", 2),
            (Task.priority == "LOW", 3),
            else_=4,
        )
        query = query.order_by(priority_order)
    return query.all()
```

The `else_=4` handles any future priority value gracefully by sorting it last. The `case()` tuple positional syntax is compatible with SQLAlchemy 2.0's legacy `db.query()` interface already in use throughout this service.

**Verify:** `GET /api/tasks?sort=priority` in `/docs` (with a valid Bearer token) returns tasks with URGENT tasks first. `GET /api/tasks` (no param) returns tasks in the unchanged default insertion order.

---

### 5. `fastapi/tests/test_tasks.py` — add sort tests

**Current state (verified):** File uses a `project_id` fixture (lines 9–14) and a `_create_task` helper (line 31–33). Append the two tests below at the end of the file — they follow the same fixture + helper pattern already established.

```python
def test_list_tasks_sort_by_priority(client, auth_headers):
    proj = client.post(
        "/api/projects", json={"name": "Sort Test"}, headers=auth_headers
    ).json()
    for priority in ["LOW", "URGENT", "MEDIUM", "HIGH"]:
        client.post(
            "/api/tasks",
            json={"title": f"Task {priority}", "project_id": proj["id"], "priority": priority},
            headers=auth_headers,
        )

    response = client.get(
        f"/api/tasks?project_id={proj['id']}&sort=priority", headers=auth_headers
    )
    assert response.status_code == 200
    weights = {"URGENT": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    returned = [t["priority"] for t in response.json()]
    assert returned == sorted(returned, key=lambda p: weights.get(p, 4))


def test_list_tasks_default_order_unchanged(client, auth_headers):
    proj = client.post(
        "/api/projects", json={"name": "Default Order"}, headers=auth_headers
    ).json()
    client.post(
        "/api/tasks",
        json={"title": "Only task", "project_id": proj["id"]},
        headers=auth_headers,
    )
    response = client.get(f"/api/tasks?project_id={proj['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
```

Note: these tests create their own projects rather than reusing the `project_id` fixture to avoid cross-test pollution from the sort order check.

---

### 6. Run tests

```bash
# Next.js
cd nextjs && npm test

# FastAPI — run full suite first, then the new sort tests in isolation
cd fastapi && pytest
cd fastapi && pytest -k "sort_by_priority or default_order_unchanged" -v
```

All pre-existing tests must pass without modification.

## Progress Log

| Date | Update |
|------|--------|
| 2026-05-08 | Task created. Priority field, form selectors, color badge, and API validation already exist in both tracks. Remaining work: sort-by-priority in TaskFilters/TaskBoard (Next.js) and `sort` query param in FastAPI. |
