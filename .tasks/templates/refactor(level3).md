# [Refactor Title — describe the structural change: "Extract auth logic from tasks router into auth_service"]

## Refactor Summary

| Field | Value |
|-------|-------|
| **Type** | <!-- Extract / Rename / Move / Consolidate / Decouple / Simplify / Delete dead code --> |
| **Affected track(s)** | <!-- Next.js / FastAPI / Both --> |
| **Risk level** | <!-- Low (single file, private scope) / Medium (module boundary) / High (shared types, cross-track) --> |
| **Authorized by** | <!-- User request on YYYY-MM-DD / linked task / PR comment --> |

> **The golden rule:** external behavior must be identical before and after.
> No new features. No bug fixes. No opportunistic cleanup of adjacent code.
> If you find a bug while refactoring, file it separately and leave it alone here.

---

## What & Why

### What is structurally changing

<!-- Describe the structural transformation in one paragraph.
     Name the specific code unit (function, module, type, layer) being moved/renamed/extracted.
     e.g. "Moving the JWT decode logic currently inlined in three route handlers into a shared
     `get_current_user` dependency in app/utils/security.py." -->

### Why now

<!-- The concrete code-quality reason. Not "it's messy" — be specific.
     e.g. "The same 15-line validation block is copy-pasted into 4 route handlers.
     A change to validation rules requires editing 4 files instead of 1." -->

### What is NOT changing

<!-- Be explicit. This prevents scope creep and guards intentional imperfections.
     Anything not listed here is out of scope. -->

- External API contract (paths, methods, request/response shapes, status codes) — unchanged
- Database schema — unchanged
- Observed runtime behavior — unchanged
- Test expectations — unchanged (tests pass against the refactored code without edits)
- <!-- Any intentional imperfection near the refactor site — e.g. "comments.py mixed query style — do not touch" -->
- <!-- Any out-of-scope code that looks related but isn't — e.g. "auth router login handler — separate concern" -->

---

## Scope

<!-- Delete lines that don't apply. -->
- [ ] Next.js (UI + API routes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (shared type or behavior — both tracks must move in sync)

---

## Behavior Contract

<!-- The behaviors this refactor must preserve, stated as verifiable assertions.
     These are NOT new acceptance criteria — they are the current behavior written down
     so it can be confirmed unchanged after the work is done. -->

**API behavior (unchanged)**
- [ ] <!-- e.g. "GET /api/tasks returns 401 when unauthenticated" -->
- [ ] <!-- e.g. "PATCH /api/tasks/:id returns 403 when caller does not own the project" -->
- [ ] <!-- e.g. "POST /api/tasks returns 201 with the created task on valid input" -->

**Internal behavior (unchanged)**
- [ ] <!-- e.g. "task_service.get_tasks filters by project owner_id, not task assignee" -->
- [ ] <!-- e.g. "TokenExpiredError from JWT decode produces a 401, not a 500" -->

**Type/interface contract (unchanged)**
- [ ] <!-- e.g. "TaskWithRelations includes assignee.name and project.id" -->
- [ ] <!-- e.g. "TaskStatus union is 'TODO' | 'IN_PROGRESS' | 'DONE' — no new values added" -->

---

## Behavior Baseline

<!-- Capture the current state BEFORE touching any code.
     This is the snapshot you compare against at the end to prove equivalence.
     Fill in actual results, not expected — run the commands. -->

### Test suite results (pre-refactor)

```bash
# Next.js
cd nextjs && npm test -- --verbose 2>&1 | tail -20
# Record: X tests, Y passed, Z failed, W skipped

# FastAPI
cd fastapi && pytest -v 2>&1 | tail -20
# Record: X passed, Y failed, Z warnings
```

**Next.js baseline:** <!-- e.g. "47 tests, 47 passed, 0 failed" -->
**FastAPI baseline:** <!-- e.g. "31 passed, 0 failed" -->

> These numbers must match exactly after the refactor. Any test count change requires explanation.

### Manual smoke test (pre-refactor)

<!-- Record the current behavior for each behavior contract item above.
     Use curl or browser — paste actual output. -->

```bash
# Example: capture current response shape for the affected endpoint
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@taskforge.com","password":"alice123"}' | jq -r '.access_token')

curl -s http://localhost:8000/api/tasks -H "Authorization: Bearer $TOKEN" | jq '[.[:2]]'
# Paste actual output here:
```

---

## Current State Inventory

<!-- Document every file and function being restructured.
     Verified line numbers required — check before writing the plan. -->

### Files being changed

**Next.js**
| File | Current role | Lines | What changes |
|------|-------------|-------|-------------|
| `nextjs/<file>.ts` | <!-- e.g. "contains duplicated auth check" --> | <!-- L12–28 --> | <!-- Extract to lib/auth-helpers.ts --> |
| `nextjs/<file>.tsx` | <!-- ... --> | <!-- ... --> | <!-- ... --> |

**FastAPI**
| File | Current role | Lines | What changes |
|------|-------------|-------|-------------|
| `fastapi/app/routers/<resource>.py` | <!-- ... --> | <!-- L14–31 --> | <!-- ... --> |
| `fastapi/app/services/<resource>_service.py` | <!-- ... --> | <!-- ... --> | <!-- ... --> |

### Functions / types being moved or renamed

| Name | Current location | New location | Change type |
|------|-----------------|--------------|-------------|
| `<!-- functionName -->` | `<!-- file:line -->` | `<!-- new file -->` | <!-- Move / Rename / Extract / Delete --> |
| `<!-- TypeName -->` | `<!-- file:line -->` | `<!-- new file -->` | <!-- ... --> |

### New files to create (if extracting)

| File | Purpose |
|------|---------|
| `<!-- nextjs/lib/<module>.ts -->` | <!-- Extracted helpers --> |
| `<!-- fastapi/app/services/<name>_service.py -->` | <!-- Extracted business logic --> |

---

## Call-Site Audit

<!-- Every place the code being changed is imported or called.
     Missing a call site means a broken import or wrong behavior after the refactor.
     Use grep to find them — don't rely on memory. -->

```bash
# Find all references — run these before writing the plan
grep -rn "functionName\|TypeName" nextjs/
grep -rn "function_name\|ClassName" fastapi/app/
```

**Next.js call sites**
| File | Line | Usage | Update required |
|------|------|-------|-----------------|
| `<!-- file.ts -->` | <!-- L24 --> | <!-- import { X } from "..." --> | <!-- Update import path --> |
| `<!-- file.tsx -->` | <!-- L8 --> | <!-- const result = X(args) --> | <!-- Signature unchanged / args change --> |

**FastAPI call sites**
| File | Line | Usage | Update required |
|------|------|-------|-----------------|
| `<!-- routers/tasks.py -->` | <!-- L18 --> | <!-- from app.services.x import fn --> | <!-- Update import --> |
| `<!-- tests/test_tasks.py -->` | <!-- L44 --> | <!-- monkeypatch.patch("app.services.x.fn") --> | <!-- Update patch path --> |

> Patch paths in tests are especially fragile — mocks reference the import location of the symbol,
> not its definition location. Update test mocks to reflect the new module path.

---

## Target State

<!-- What the code looks like after. Write the destination design before touching any files.
     This is the spec the implementation steps build toward. -->

### New structure

```
<!-- Show the module/file layout after the refactor.
     e.g. for an extraction:

     BEFORE                          AFTER
     fastapi/app/routers/tasks.py    fastapi/app/routers/tasks.py  (thin)
       - get_current_user logic        - imports from security.py
       - JWT decode logic            fastapi/app/utils/security.py  (new)
                                       - get_current_user()
                                       - decode_token()
-->
```

### Key interface / signature after

```python
# FastAPI — new or moved function signature
def extracted_function(db: Session, ..., user: User) -> ReturnType:
    ...
```

```ts
// Next.js — new or moved function signature
export function extractedHelper(args: ArgsType): ReturnType {
  ...
}
```

---

## Refactor Strategy

### Approach

<!-- Atomic (all files in one commit) vs. incremental (old + new coexist briefly, then old removed).
     Incremental is safer for cross-cutting changes; atomic is fine for single-file extractions. -->

- [ ] **Atomic** — all changes in a single commit; no intermediate broken state
- [ ] **Incremental** — add new location first, migrate call sites one-by-one, delete old location last

### Order of changes

<!-- Which file changes first and why. For moves: create destination → update call sites → delete source.
     For renames: never rename and move in the same step. -->

1. <!-- e.g. "Create new module / extracted function at destination" -->
2. <!-- e.g. "Update call site A (most isolated)" -->
3. <!-- e.g. "Update call site B" -->
4. <!-- e.g. "Delete old location / remove duplication" -->
5. <!-- e.g. "Update tests / mocks to new import paths" -->

### Cross-track sync point

<!-- If both tracks change: do they move together or can one track land first?
     "Both tracks must move in the same PR" vs. "FastAPI can land first; Next.js follows." -->

---

## Implementation Plan

<!-- One step per logical unit of work (usually one file).
     Include BEFORE / AFTER diffs and a Verify gate per step.
     Do not combine unrelated changes in one step. -->

### 1. [Create / modify — track + file]

**Current state (verified YYYY-MM-DD):** <!-- N lines; relevant code at lines X–Y. -->

```python
# BEFORE (lines X–Y)
# ... existing code being extracted or replaced ...

# AFTER
# ... restructured code (same behavior, different structure) ...
```

**Behavior preserved because:** <!-- One sentence — e.g. "Same logic, just moved; no branch or condition changed." -->

**Verify:** <!-- e.g. "`pytest tests/test_tasks.py` still passes (no import errors, same results)." -->

---

### 2. [Update call site — track + file]

**Current state (verified):** <!-- Import or usage at line X. -->

```ts
// BEFORE (line X)
import { oldLocation } from "@/old/path";

// AFTER
import { newLocation } from "@/new/path";
```

**Verify:** <!-- e.g. "`npm run build` compiles without missing-module errors." -->

---

### 3. [Delete old location / remove duplication — track + file]

<!-- Only after all call sites are updated. Never delete before confirming zero remaining references. -->

```bash
# Confirm zero remaining references before deleting
grep -rn "oldFunctionName\|old_function_name" nextjs/ fastapi/app/
# Expected: no output
```

```python
# BEFORE — lines being deleted
# ... duplicated or now-dead code ...

# AFTER — (deleted; file may be removed entirely if now empty)
```

**Verify:** <!-- e.g. "File deleted; `pytest` and `npm test` still pass." -->

---

### 4. Update test mocks / patch paths (if applicable)

<!-- Mocks that reference import paths must be updated to the new location. -->

```python
# BEFORE
monkeypatch.setattr("fastapi.app.routers.tasks.old_function", mock_fn)

# AFTER
monkeypatch.setattr("fastapi.app.utils.security.new_function", mock_fn)
```

**Verify:** <!-- Tests that use mocks pass and mock calls register (i.e., mock is actually invoked). -->

---

### 5. Run full test suites

```bash
# Next.js
cd nextjs && npm test

# FastAPI
cd fastapi && pytest -v
```

Compare against the **Behavior Baseline** counts recorded above.
Any new failure or count change must be explained before continuing.

---

### Step summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | | | Create / modify |
| 2 | | | Update call site |
| 3 | | | Delete old code |
| 4 | Both | test files | Update mocks |
| 5 | Both | — | Run full suites |

---

## Behavior Equivalence Verification

<!-- Run after all steps are complete. Prove behavior is identical, not just "seems fine". -->

### Test suite (post-refactor)

```bash
cd nextjs && npm test -- --verbose 2>&1 | tail -20
cd fastapi && pytest -v 2>&1 | tail -20
```

**Result:** <!-- X/X pass — matches pre-refactor baseline exactly -->

### Manual smoke test (post-refactor)

<!-- Re-run the same commands from the Behavior Baseline section. Compare output line by line. -->

```bash
# Re-run baseline curl from above
curl -s http://localhost:8000/api/tasks -H "Authorization: Bearer $TOKEN" | jq '[.[:2]]'
# Paste actual output:
```

**Diff from baseline:** <!-- "None" or explain any difference — an unexpected diff is a regression. -->

### Behavior Contract sign-off

<!-- Check each item from the Behavior Contract section. -->

- [ ] API behavior: all items confirmed unchanged
- [ ] Internal behavior: all items confirmed unchanged
- [ ] Type/interface contract: all items confirmed unchanged

---

## Risk Assessment

**High-risk areas**
<!-- Changes that could silently break things — import resolution, mock paths, cascade effects. -->
- <!-- e.g. "Renaming a module while tests mock its internal path — mock stops intercepting" -->
- <!-- e.g. "Moving a function used in both tracks — one track may lag and hit import error" -->

**Intentional imperfections near the refactor site — do not touch**
<!-- Per CLAUDE.md: mixed query styles, sparse error handling, duplicated fetch logic, etc. -->
- <!-- e.g. "comments.py lines 44–60 — mixed ORM / raw SQL is intentional teaching surface" -->
- <!-- e.g. "tasks route.ts has no structured error logging — intentional, do not add it" -->

**Bugs found during investigation — file separately, do not fix here**
<!-- List any real bugs discovered while reading the code. They belong in their own fix/ task. -->
- <!-- e.g. "task_service.py line 82 appears to skip the owner check on updates — not this task" -->

---

## Review Notes

<!-- Pre-implementation concerns, tradeoffs, open questions. Populate during planning or PR review. -->

**Critical** — will cause breakage if missed
<!-- e.g. "pytest mocks reference the import site, not the definition site — update all patch paths" -->

**Gaps** — not addressed in the plan but probably should be
<!-- e.g. "No test covers the extracted function in isolation — might be worth adding one" -->

**Minor** — non-blocking style observations
<!-- e.g. "Extracted module naming could be more consistent with existing utils/ conventions" -->

---

## Progress Log

<!-- Append a dated entry each time work is resumed or a milestone is reached.
     Most recent entry at the top. One or two sentences per entry. -->

| Date | Update |
|------|--------|
| YYYY-MM-DD | <!-- What was audited / what was moved / what's blocked / what's next. --> |

---

## Completion

<!-- Fill in when this task is moved to done/. -->

**Branch:** `refactor/...`
**Commits:**

**Structural change summary:**
<!-- What moved where. e.g. "Extracted get_current_user from 3 router files into utils/security.py." -->

**Behavior equivalence confirmed:**
- [ ] Pre/post test counts match (`npm test`: X/X, `pytest`: X/X)
- [ ] Manual smoke test output matches baseline
- [ ] Behavior Contract items all checked off

**Bugs found and filed separately:**
<!-- List any fix/ tasks created as a result of this work, or "None." -->

**Known gaps / follow-up:**
<!-- Anything explicitly left out of scope that a reviewer should be aware of. -->
