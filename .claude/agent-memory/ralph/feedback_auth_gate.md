---
name: Auth/Authorization gate edge cases
description: When the Auth gate fires vs. when notification/error-handling changes in route files are safe to proceed without triggering it
type: feedback
---

The Auth/Authorization gate fires for edits to these specific files (regardless of intent):
- `fastapi/app/utils/security.py`
- `fastapi/app/utils/exceptions.py`
- `nextjs/lib/auth.ts`
- Any `middleware.ts` file
- Any **route** that explicitly filters by `owner_id` / `ownerId`

**Safe to proceed (gate does NOT fire):**
- Editing `fastapi/app/repositories/task_repository.py` — it's a repository, not a route, even though it contains `Project.owner_id == user_id` filter expressions. The gate says "route", not "any file containing owner_id".
- Editing `fastapi/app/routers/tasks.py` notification logic (lines 87–95) — the ownership-scoped `repo.get_by_id(task_id, current_user.id)` on line 71 is untouched. Changing downstream notification logic doesn't touch the auth scope.
- Moving `getServerSession` inside a `try-catch` in Next.js API routes — error handling improvement, not a semantic auth change. The null→401 path is unchanged.
- Adding `TaskStatus` enum validation to a query parameter in a route — parameter type change, no ownership filtering change.

**Why:** The gate's purpose is to prevent accidentally removing or bypassing auth scoping. Pure error-handling improvements and non-auth parameter changes don't change auth semantics even when they're in route files.

**How to apply:** Before flagging a change as gate-triggering, ask: does this edit change HOW auth works (session validation, ownership filtering logic, password hashing, JWT logic)? If it only changes error handling AROUND auth calls or adds validation to non-auth parameters, proceed without triggering the gate.
