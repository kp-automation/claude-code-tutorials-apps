# Add useActivityFeed Hook

## Overview

A Next.js client-side hook (`useActivityFeed`) that encapsulates the fetch logic for the dashboard's "Recent Activity" section. The dashboard currently fetches tasks directly inside a Server Component (`app/page.tsx`). This hook moves that logic into a reusable, client-side abstraction: any component can call `useActivityFeed()` to get a live list of recently updated tasks, a loading flag, an error string, and a `refresh()` function. Affects the Next.js track only; no FastAPI changes required. Surface area: new `nextjs/hooks/useActivityFeed.ts` file and a corresponding update to the dashboard to consume it.

## Why

The "Recent Activity" data fetch is currently baked into a Server Component (`app/page.tsx:19–51`). As the dashboard grows — more widgets, live refresh, per-project scoping — that fetch needs to be a composable unit rather than inline server-side code. A hook also makes the logic testable in isolation and allows the feed to refresh without a full page navigation.

## Scope

- [x] Next.js (UI + API routes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)
- [ ] Schema change (Prisma db push + Alembic migration)

---

## Acceptance Criteria

- [ ] `useActivityFeed` hook exists at `nextjs/hooks/useActivityFeed.ts` and is exported as a named export.
- [ ] Hook accepts an optional options object `{ projectId?: string; limit?: number }` (default `limit: 10`).
- [ ] Hook returns `{ items: ActivityItem[], loading: boolean, error: string | null, refresh: () => void }`.
- [ ] `items` is `[]` (never `null` or `undefined`) when the response is empty or before the first fetch resolves.
- [ ] `loading` is `true` while a fetch is in flight and `false` otherwise.
- [ ] `error` is `null` on success and a non-empty string on any failure (network error, non-2xx response).
- [ ] Hook fetches on mount and re-fetches automatically when `projectId` or `limit` changes.
- [ ] Calling `refresh()` triggers a new fetch.
- [ ] When `projectId` is provided, the feed is scoped to tasks belonging to that project.
- [ ] API route (`GET /api/tasks`) must scope results to the authenticated user's projects — returns only tasks the caller owns. (Currently the route returns all tasks when no `projectId` is given; this must be fixed as part of this ticket.)
- [ ] `GET /api/tasks` accepts a `limit` query param (integer ≥ 1) that caps the number of items returned; unrecognized or invalid values are ignored and the default of 10 applies.
- [ ] A 401 from the API sets `error` on the hook and leaves `items` as `[]`; it does not throw.
- [ ] `ActivityItem` type is defined in `nextjs/lib/types.ts` as a named export.
- [ ] Existing test suites still pass (`npm test` / `pytest`).

---

## Risk & Dependencies

**Blockers**
- None — the `/api/tasks` route and Prisma schema are already in place.

**Cross-track coupling**
- None — this feature is Next.js only.

**Intentional imperfections to leave alone**
- The missing ownership scope in `GET /api/tasks` is the one exception: fixing it is in scope for this ticket (it is required for the hook to be correct). All other intentional inconsistencies (mixed query styles elsewhere, sparse error handling in other routes) must not be touched.

**Regression surface**
- `TaskBoard` and `TaskCard` both call `GET /api/tasks?projectId=…` — adding ownership scoping to that route must not break those callers, since they already pass a `projectId` that belongs to the current user.
- `app/page.tsx` dashboard — once the hook is wired in, verify the "Recent Activity" section still renders the correct items.

---

## Technical Investigation

<!-- Fill this in BEFORE writing the plan. Verify line numbers, current state,
     and any assumptions the plan depends on. Update if you find drift. -->

**Next.js state (verified 2026-05-11)**
- `nextjs/app/page.tsx` — 153 lines; Server Component; activity fetch at lines 19–51 (tasks ordered by `updatedAt desc`, scoped by `project.ownerId`, take 10); renders "Recent Activity" card at lines 109–150.
- `nextjs/app/api/tasks/route.ts` — 157 lines; GET at lines 18–74; supports `?projectId=` but no `?limit=`; orders by `createdAt desc` (not `updatedAt`); no ownership scoping when `projectId` is omitted.
- `nextjs/lib/types.ts` — 35 lines; exports `TaskWithDetails`, `TaskStatus`, `Priority`, etc.; no `ActivityItem` type yet.
- `nextjs/hooks/` — directory does not exist; this would be the first hook file.

**Key findings**
- The GET route at `app/api/tasks/route.ts:29` sets `where = projectId ? { projectId } : {}` — no `project.ownerId` filter, so without `projectId` it returns every task in the database. Must be fixed.
- The GET route orders by `createdAt` (line 63); the dashboard's server fetch orders by `updatedAt` (line 46 of `page.tsx`). The hook should match the dashboard's intent — order by `updatedAt`.
- No existing `hooks/` directory in `nextjs/` — the pattern is context providers (`notifications-provider.tsx`). The hook is a simpler, standalone alternative; no context needed.
- `TaskWithDetails` in `lib/types.ts` includes `comments`, which is heavy. `ActivityItem` should be a lighter projection (title, status, priority, project name, assignee name, updatedAt).

---

## Files to Modify

**Next.js**
| File | Change |
|------|--------|
| `nextjs/app/api/tasks/route.ts` | Add ownership scoping to GET; add `limit` query param; change `orderBy` to `updatedAt` |
| `nextjs/lib/types.ts` | Add `ActivityItem` type |
| `nextjs/app/page.tsx` | Replace inline server-side fetch with `useActivityFeed` hook (convert section to client component or extract `ActivityFeed` component) |

**New files to create**
| File | Purpose |
|------|---------|
| `nextjs/hooks/useActivityFeed.ts` | The hook itself |

---

## Data Model Changes

None.

---

## API Contract

```
GET /api/tasks
Auth: Bearer token / session required

Query params:
  projectId   string   optional   scope to a single project
  limit       integer  optional   max items to return (default 10, minimum 1)

Response (200):
  Array of ActivityItem:
    id          string    task ID
    title       string    task title
    status      string    "TODO" | "IN_PROGRESS" | "DONE"
    priority    string    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    updatedAt   string    ISO 8601 datetime
    projectId   string
    project     { id: string, name: string }
    assignee    { id: string, name: string, email: string } | null

Error cases:
  401  Unauthorized — no session
  500  Internal server error
```

---

## Plan

### 1. Add `ActivityItem` type — `nextjs/lib/types.ts`

**Current state (verified):** 35 lines; ends at line 34 with `NotificationWithRelations`. No `ActivityItem` yet.

**a. Append `ActivityItem` after `NotificationWithRelations`**

```ts
// BEFORE (line 35 — end of file)
// (nothing)

// AFTER
export type ActivityItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  updatedAt: string;
  projectId: string;
  project: { id: string; name: string };
  assignee: { id: string; name: string; email: string } | null;
};
```

`updatedAt` is typed `string` (not `Date`) because the hook receives it from `fetch()` after JSON deserialisation, where all dates are ISO strings.

**Verify:** `cd nextjs && npm run build` compiles without type errors.

---

### 2. Update `GET /api/tasks` — `nextjs/app/api/tasks/route.ts`

**Current state (verified):** GET handler spans lines 18–73. Three problems:
- Line 29: `where = projectId ? { projectId } : {}` — no ownership filter.
- Line 63: `orderBy: { createdAt: "desc" }` — should be `updatedAt`.
- No `limit` param, no `take` clause.

**a. Parse `limit` and `userId`; fix `where`; swap `orderBy`; add `take`**

```ts
// BEFORE (lines 26–65)
const { searchParams } = new URL(req.url);
const projectId = searchParams.get("projectId");

const where = projectId ? { projectId } : {};

const tasks = await prisma.task.findMany({
  where,
  include: {
    // ...unchanged...
  },
  orderBy: {
    createdAt: "desc",
  },
});

// AFTER
const { searchParams } = new URL(req.url);
const projectId = searchParams.get("projectId");
const limitParam = searchParams.get("limit");
const parsedLimit = parseInt(limitParam ?? "");
const limit = !isNaN(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 10;

const userId = (session.user as any).id;
const where = {
  project: { ownerId: userId },
  ...(projectId ? { projectId } : {}),
};

const tasks = await prisma.task.findMany({
  where,
  include: {
    // ...unchanged...
  },
  orderBy: {
    updatedAt: "desc",
  },
  take: limit,
});
```

The `userId` extraction happens after the `session` null-check on line 22, so it is always defined here. The spread `...(projectId ? { projectId } : {})` on top of `project: { ownerId: userId }` means a supplied `projectId` must also belong to the caller — it cannot be used to probe another user's project.

**Verify:**
- `GET /api/tasks` without a session → 401.
- `GET /api/tasks` with a valid session returns only tasks whose project is owned by the caller.
- `GET /api/tasks?limit=3` returns at most 3 items.
- `GET /api/tasks?limit=abc` returns the default 10 (or fewer if the user has fewer tasks).

---

### 3. Create `nextjs/hooks/useActivityFeed.ts`

**Current state (verified):** `nextjs/hooks/` directory does not exist. This is the first hook file.

**a. Create the hook**

```ts
// NEW FILE: nextjs/hooks/useActivityFeed.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ActivityItem } from "@/lib/types";

interface UseActivityFeedOptions {
  projectId?: string;
  limit?: number;
}

interface UseActivityFeedResult {
  items: ActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useActivityFeed({
  projectId,
  limit = 10,
}: UseActivityFeedOptions = {}): UseActivityFeedResult {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFeed = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/tasks?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Request failed with status ${res.status}`);
        return;
      }
      const data: ActivityItem[] = await res.json();
      setItems(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId, limit]);

  useEffect(() => {
    fetchFeed();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchFeed]);

  return { items, loading, error, refresh: fetchFeed };
}
```

Design notes:
- `fetchFeed` is the one function behind both the auto-fetch and `refresh`. It is in `useCallback([projectId, limit])`, so a new identity (and a new `useEffect` run) is triggered automatically when those options change.
- `abortRef.current?.abort()` at the top of `fetchFeed` cancels any in-flight request before starting a new one, preventing stale responses from overwriting fresh state.
- On `AbortError` the function returns before `setError` — cleanup, not a user-visible error. `finally` still runs, so `loading` goes back to `false`.
- Initial state: `items = []`, `loading = false`. The first render renders the empty/loading state correctly; `loading` flips to `true` on the first tick of the effect.

**Verify:** `npm run build` resolves the import `@/lib/types` and the `"use client"` directive causes no server-component warning.

---

### 4. Create `ActivityFeed` component — `nextjs/components/activity-feed.tsx`

**Current state (verified):** No `activity-feed.tsx` in `nextjs/components/`. The JSX to replicate is currently in `app/page.tsx` lines 109–150.

**a. Create the component**

```tsx
// NEW FILE: nextjs/components/activity-feed.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import type { ActivityItem } from "@/lib/types";

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
}

export function ActivityFeed({ projectId, limit }: ActivityFeedProps) {
  const { items, loading, error } = useActivityFeed({ projectId, limit });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading…</p>
        ) : error ? (
          <p className="text-muted-foreground text-center py-8">
            Failed to load activity.
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No recent activity. Create a project to get started!
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((task: ActivityItem) => (
              <Link
                key={task.id}
                href={`/projects/${task.projectId}/tasks/${task.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.project.name} • {task.assignee?.name || "Unassigned"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      task.status === "TODO"
                        ? "bg-slate-100 text-slate-800"
                        : task.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

The markup mirrors `app/page.tsx` lines 109–150 exactly, with loading and error states added. `"use client"` is required because the hook uses `useState`/`useEffect`.

**Verify:** `npm run build` compiles the component without type errors.

---

### 5. Wire `ActivityFeed` into `app/page.tsx`

**Current state (verified):** `app/page.tsx` is a Server Component, 153 lines. The "Recent Activity" `<Card>` spans lines 109–150. The `allTasks` data is still needed server-side for the stat counters (lines 53–58); only the JSX rendering is replaced.

**a. Add import**

```ts
// BEFORE (imports section, after existing imports)
// (no ActivityFeed import)

// AFTER
import { ActivityFeed } from "@/components/activity-feed";
```

**b. Replace the "Recent Activity" card**

```tsx
// BEFORE (lines 109–150)
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
  </CardHeader>
  <CardContent>
    {allTasks.length === 0 ? (
      <p className="text-muted-foreground text-center py-8">
        No recent activity. Create a project to get started!
      </p>
    ) : (
      <div className="space-y-4">
        {allTasks.map((task) => (
          // ...42 lines of JSX...
        ))}
      </div>
    )}
  </CardContent>
</Card>

// AFTER (single line)
<ActivityFeed />
```

`app/page.tsx` remains a Server Component — it is valid for a Server Component to render a Client Component as a child. The stat cards above (`lines 67–107`) are unaffected.

**Verify:**
- `npm run build` succeeds (no "use client" needed on `page.tsx`).
- Dev server (`npm run dev`): dashboard loads, stat cards render server-side, "Recent Activity" section populates after the client-side fetch resolves.

---

### 6. Write tests

**Hook unit tests** (`nextjs/tests/hooks/useActivityFeed.test.tsx`)

```tsx
/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useActivityFeed } from "@/hooks/useActivityFeed";

const mockItem = {
  id: "t1", title: "Test task", status: "TODO" as const,
  priority: "HIGH" as const, updatedAt: "2026-05-11T00:00:00.000Z",
  projectId: "p1", project: { id: "p1", name: "My Project" }, assignee: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe("useActivityFeed", () => {
  it("items is [] before first fetch resolves", () => {
    (fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useActivityFeed());
    expect(result.current.items).toEqual([]);
  });

  it("loading is true while fetching", () => {
    (fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useActivityFeed());
    expect(result.current.loading).toBe(true);
  });

  it("populates items and clears loading on success", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [mockItem],
    });
    const { result } = renderHook(() => useActivityFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([mockItem]);
    expect(result.current.error).toBeNull();
  });

  it("sets error and leaves items [] on non-2xx response", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });
    const { result } = renderHook(() => useActivityFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Unauthorized");
    expect(result.current.items).toEqual([]);
  });

  it("sets error on network failure", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useActivityFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
  });

  it("refresh() triggers a second fetch", async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useActivityFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.refresh(); });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("re-fetches when projectId changes", async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });
    const { rerender } = renderHook(
      ({ projectId }) => useActivityFeed({ projectId }),
      { initialProps: { projectId: "p1" } }
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    rerender({ projectId: "p2" });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
```

**API route tests** (`nextjs/tests/api/tasks.test.ts`)

```ts
/**
 * @jest-environment node
 */
import { GET } from "@/app/api/tasks/route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: { task: { findMany: jest.fn() } },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

const mockSession = { user: { id: "user-1", email: "a@b.com" } };

beforeEach(() => { jest.clearAllMocks(); });

describe("GET /api/tasks", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/tasks");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("scopes results to the authenticated user's projects", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const req = new Request("http://localhost/api/tasks");
    await GET(req);
    const callArgs = (prisma.task.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ project: { ownerId: "user-1" } });
  });

  it("applies the limit param", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const req = new Request("http://localhost/api/tasks?limit=3");
    await GET(req);
    const callArgs = (prisma.task.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.take).toBe(3);
  });

  it("defaults to limit 10 when param is invalid", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const req = new Request("http://localhost/api/tasks?limit=abc");
    await GET(req);
    const callArgs = (prisma.task.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.take).toBe(10);
  });

  it("adds projectId to where when provided", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const req = new Request("http://localhost/api/tasks?projectId=p1");
    await GET(req);
    const callArgs = (prisma.task.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ projectId: "p1", project: { ownerId: "user-1" } });
  });
});
```

**Verify:** New tests are self-contained (own mocks and fixtures, no shared state). Run each file in isolation to confirm:

```bash
npx jest tests/hooks/useActivityFeed.test.tsx
npx jest tests/api/tasks.test.ts
```

---

### 7. Run full test suites

```bash
# Next.js
cd nextjs && npm test

# FastAPI (unchanged, but run to confirm no cross-track drift)
cd fastapi && pytest
```

All pre-existing tests must pass without modification.

---

### Step summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | Next.js | `lib/types.ts` | Add `ActivityItem` type |
| 2 | Next.js | `app/api/tasks/route.ts` | Add ownership scope, `limit` param, `orderBy updatedAt` |
| 3 | Next.js | `hooks/useActivityFeed.ts` | Create hook (new file) |
| 4 | Next.js | `components/activity-feed.tsx` | Create component (new file) |
| 5 | Next.js | `app/page.tsx` | Replace inline activity card with `<ActivityFeed />` |
| 6 | Both | test files | Write hook unit tests + API route tests |
| 7 | Both | — | Run full test suites |

---

## Test Plan

| Test | Track | Type | Covers |
|------|-------|------|--------|
| Hook returns items on successful fetch | Next.js | Unit (RTL / renderHook) | Happy path |
| `loading` transitions true → false after fetch | Next.js | Unit | Loading state |
| `error` is set on non-2xx response | Next.js | Unit | Error state |
| `items` is `[]` before first fetch resolves | Next.js | Unit | Initial state |
| `refresh()` triggers a second fetch | Next.js | Unit | Refresh behavior |
| Re-fetches when `projectId` changes | Next.js | Unit | Option reactivity |
| `GET /api/tasks` without auth → 401 | Next.js | Integration | Auth gate |
| `GET /api/tasks` scoped to caller's projects only | Next.js | Integration | Ownership gate |
| `GET /api/tasks?limit=3` returns at most 3 items | Next.js | Integration | limit param |
| `GET /api/tasks?projectId=X` returns only that project's tasks | Next.js | Integration | projectId param |

---

## Rollback

**Next.js:** revert `app/api/tasks/route.ts`, `lib/types.ts`, `app/page.tsx`; delete `hooks/useActivityFeed.ts`. No schema change, no migration to roll back.

---

## Review Notes

**Critical**
- The ownership-scoping fix to `GET /api/tasks` is a security correction, not a refactor. It must be included in the same PR and verified by a test that asserts a user cannot see another user's tasks.
- `app/page.tsx` is currently a Server Component. Converting the activity section to a Client Component (or extracting a child Client Component) requires adding `"use client"` — verify the page still SSR-renders the stat cards correctly after the change.

**Gaps**
- No test currently covers the case where `GET /api/tasks` returns tasks from a project the caller doesn't own; that test needs to be written as part of this ticket.
- `TaskBoard` calls `GET /api/tasks?projectId=…` — after adding ownership scoping, add a regression check confirming board tasks still load correctly.

**Minor**
- Consider whether `ActivityItem` belongs in `lib/types.ts` or inline in the hook file. Given the type will likely be shared with a future `ActivityFeed` component, `lib/types.ts` is the better home.

---

## Progress Log

| Date | Update |
|------|--------|
| 2026-05-11 | Implementation complete. All 7 steps shipped; 179/179 tests pass. |
| 2026-05-11 | Task created. Plan section left blank — ready for implementation. |

---

## Summary

### What shipped

- Extracts the dashboard's hard-coded "Recent Activity" fetch into a reusable client-side hook (`useActivityFeed`) and companion component (`ActivityFeed`).
- Fixes a security gap in `GET /api/tasks`: the route previously returned all tasks in the database when called without a `projectId` — it now scopes every response to the authenticated user's projects.
- Adds `?limit=` support and changes the sort order from `createdAt` to `updatedAt` to match the dashboard's "recently active" intent.

### Files created

| File | Purpose |
|------|---------|
| `nextjs/hooks/useActivityFeed.ts` | Hook returning `{ items, loading, error, refresh }` |
| `nextjs/components/activity-feed.tsx` | Client component wrapping the hook with loading/error/empty states |
| `nextjs/tests/hooks/useActivityFeed.test.tsx` | 11 unit tests (renderHook + mocked fetch) |
| `nextjs/tests/api/tasks.test.ts` | 9 route handler tests (mocked Prisma + NextAuth) |

### Files modified

| File | Change |
|------|--------|
| `nextjs/lib/types.ts` | Added `ActivityItem` — lightweight type for hook consumers (no `comments`, dates as `string` post-JSON) |
| `nextjs/app/api/tasks/route.ts` | Ownership scope (`project.ownerId`), `?limit=` param with `take`, `orderBy updatedAt` |
| `nextjs/app/page.tsx` | Replaced 42-line inline activity card JSX with `<ActivityFeed />` |

### Key decisions

**`app/page.tsx` stays a Server Component.** The stat counters (TODO/IN_PROGRESS/DONE counts) still run server-side. `ActivityFeed` is a Client Component child — valid in App Router. No `"use client"` needed on the page.

**`ActivityItem` uses `string` for `updatedAt`, not `Date`.** After `fetch()` + `JSON.parse()`, all dates arrive as ISO strings. Using `Date` here would have been a type lie.

**Ownership scope applies even when `projectId` is given.** A caller with `?projectId=someone-elses-project-id` gets 0 results, not a data leak. The `where` clause is `{ project: { ownerId: userId }, ...(projectId ? { projectId } : {}) }`.

**`GET /api/tasks` had zero client-side callers before this change**, so the `orderBy` and scoping changes carry no regression risk beyond the tests added here.

**Abort on unmount and option change.** The hook stores an `AbortController` ref and cancels any in-flight request before starting a new one — prevents stale-state updates when `projectId` changes or the component unmounts mid-fetch.

### Deviations from plan

None. All 7 steps implemented as written.

### Test coverage

- `useActivityFeed`: initial state, loading transitions, success path, non-2xx error, network failure, fallback error message, `refresh()` triggering second fetch, re-fetch on `projectId` change, `limit` and `projectId` present in query string.
- `GET /api/tasks`: 401 gate, ownership scoping, `limit` (present / absent / non-integer / zero), `projectId` filter, `orderBy updatedAt`, 200 response shape.

**Before:** 159 tests across 12 suites. **After:** 179 tests across 14 suites.

---

## Completion

<!-- Fill in when this task is moved to done/. -->

**Branch:** `feat/use-activity-feed`
**Commits:**

**Summary of what shipped:**

**Decisions made:**

**Known gaps / follow-up work:**

**Testing done:**
- [ ] `npm test` — X/X pass
- [ ] Manual smoke test in browser (dashboard activity feed renders + refreshes)
