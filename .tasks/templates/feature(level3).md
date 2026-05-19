# [Feature Title]

## Overview

<!-- One paragraph: what the feature does, which tracks it affects (Next.js / FastAPI / both),
     and the surface area (new endpoint, schema change, UI component, etc.). -->

## Why

<!-- The user problem or product motivation. Why now? What stays broken or painful without it?
     Be specific — "teams can't X" is better than "this improves the UX". -->

## Scope

<!-- Delete lines that don't apply. -->
- [ ] Next.js (UI + API routes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)
- [ ] Schema change (Prisma db push + Alembic migration)

---

## Acceptance Criteria

<!-- Phrase each as a verifiable outcome: "X does Y when Z." -->

- [ ] <!-- Happy path: the feature works end-to-end for a normal user. -->
- [ ] <!-- API shape: endpoint, method, params, response fields, status codes. -->
- [ ] <!-- UI behavior: what the user sees and does (Next.js track). -->
- [ ] <!-- Default values: what fields default to when not supplied. -->
- [ ] <!-- Auth / access control: who can call this; 401 and 403 cases. -->
- [ ] <!-- 404 case: request for a missing record returns 404 with a clear message. -->
- [ ] <!-- 400 / 422 case: bad or missing input is rejected with a validation error. -->
- [ ] <!-- Edge case: empty list state is handled gracefully. -->
- [ ] Existing test suites still pass (`npm test` / `pytest`).

---

## Risk & Dependencies

<!-- Things that could cause silent breakage, cascade effects, or are prerequisites. -->

**Blockers**
<!-- Must be resolved before implementation starts. -->
- <!-- e.g. "Depends on PR #XX landing first" or "Requires migration XX to be applied" -->

**Cross-track coupling**
<!-- Fields, status codes, or behaviors that must stay in sync. -->
- <!-- e.g. "Priority enum values must match between lib/types.ts and app/models/task.py" -->

**Intentional imperfections to leave alone**
<!-- Sections of the codebase that look wrong but must not be touched. -->
- <!-- e.g. "comments.py mixed query style — do not clean up" -->

**Regression surface**
<!-- Components or routes that could break if this change is wrong. -->
- <!-- e.g. "TaskCard renders priority badge — verify it still renders after schema change" -->

---

## Technical Investigation

<!-- Fill this in BEFORE writing the plan. Verify line numbers, current state,
     and any assumptions the plan depends on. Update if you find drift. -->

**Next.js state (verified YYYY-MM-DD)**
- `nextjs/<file>.tsx` — <!-- N lines; relevant interface/function at lines X–Y -->
- `nextjs/<file>.ts` — <!-- current enum values / schema shape -->

**FastAPI state (verified YYYY-MM-DD)**
- `fastapi/app/routers/<resource>.py` — <!-- relevant endpoint at lines X–Y; current signature -->
- `fastapi/app/services/<resource>_service.py` — <!-- relevant function at lines X–Y -->
- `fastapi/app/models/<resource>.py` — <!-- relevant fields -->

**Key findings**
<!-- Anything surprising discovered during investigation that affects the plan. -->
- <!-- e.g. "No existing `from sqlalchemy import` line — new import must be added as line 1" -->

---

## Files to Modify

<!-- Concrete list. Delete the track that doesn't apply. -->

**Next.js**
| File | Change |
|------|--------|
| `nextjs/prisma/schema.prisma` | <!-- add field / enum value; then `npx prisma db push` --> |
| `nextjs/lib/types.ts` | <!-- add/update string-literal unions --> |
| `nextjs/app/api/<resource>/route.ts` | <!-- add endpoint / update handler --> |
| `nextjs/app/api/<resource>/[id]/route.ts` | <!-- detail route changes --> |
| `nextjs/components/<component>.tsx` | <!-- UI changes --> |

**FastAPI**
| File | Change |
|------|--------|
| `fastapi/app/models/<resource>.py` | <!-- field / enum change → must autogenerate migration --> |
| `fastapi/app/schemas/<resource>.py` | <!-- add/update Pydantic schema --> |
| `fastapi/app/routers/<resource>.py` | <!-- add endpoint / query param --> |
| `fastapi/app/services/<resource>_service.py` | <!-- add business logic --> |
| `fastapi/app/main.py` | <!-- register new router if applicable --> |
| `fastapi/tests/test_<resource>.py` | <!-- new test cases --> |

**New files to create**
| File | Purpose |
|------|---------|
| `nextjs/components/<component>.tsx` | <!-- description --> |
| `fastapi/app/routers/<new>.py` | <!-- must register in main.py --> |

---

## Data Model Changes

<!-- Delete this section if there are no schema changes. -->

### What changes

<!-- Describe added/changed fields, new relationships, or modified enum values. -->

**Next.js (`prisma/schema.prisma`)**
```prisma
// BEFORE
model Task {
  // ...existing field
}

// AFTER
model Task {
  // ...existing field
  newField  String  @default("VALUE")
}
```

Apply: `npx prisma db push && npx prisma generate`

**FastAPI (`app/models/<resource>.py`)**
```python
# BEFORE
class TaskPriority(enum.Enum):
    LOW = "LOW"

# AFTER
class TaskPriority(enum.Enum):
    LOW = "LOW"
    NEW_VALUE = "NEW_VALUE"
```

Apply:
```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

---

## API Contract

<!-- Document the new or changed endpoint so both tracks stay in sync.
     Delete if no new/changed endpoints. -->

```
METHOD /api/<resource>[/{id}]
Auth: Bearer token required

Query params:
  param_name   type     required   description

Request body (JSON):
  field_name   type     required   description

Response (200 / 201):
  field_name   type     description

Error cases:
  401  Unauthorized — no session / invalid token
  403  Forbidden — caller does not own the resource
  404  Not found — resource does not exist
  400/422  Validation error — bad or missing input
```

---

## Plan

<!-- Ordered steps. Each step = one logical, reviewable unit of work.
     Include exact file locations, before/after snippets, and a Verify gate.
     Update line numbers during investigation if they drift. -->

### 1. [Step title — track + file]

**Current state (verified):** <!-- N lines; what exists at the target location. -->

**a. [Sub-change description]**

```ts
// BEFORE (lines X–Y)
// ...existing code

// AFTER
// ...new code
```

**b. [Next sub-change if needed]**

```ts
// BEFORE (lines X–Y)
// ...

// AFTER
// ...
```

**Verify:** <!-- Exact command or manual check that confirms this step is done before moving on.
               e.g. "`npm run build` compiles without type errors." or
               "`GET /api/tasks` in /docs shows new query param." -->

---

### 2. [Step title — track + file]

**Current state (verified):** <!-- ... -->

```python
# BEFORE (lines X–Y)
# ...

# AFTER
# ...
```

**Verify:** <!-- ... -->

---

### 3. [Step title — track + file]

<!-- ... -->

**Verify:** <!-- ... -->

---

### 4. Write new tests

**Next.js** (`nextjs/tests/...`)
```ts
// Test: happy path
it("does X when Y", async () => {
  // ...
});

// Test: 401 unauthenticated
// Test: 403 wrong owner
// Test: 404 not found
```

**FastAPI** (`fastapi/tests/test_<resource>.py`)
```python
def test_<feature>_happy_path(client, auth_headers):
    # ...

def test_<feature>_unauthorized(client):
    # ...

def test_<feature>_not_found(client, auth_headers):
    # ...
```

**Verify:** New tests are isolated — they create their own fixtures and don't rely on ordering.

---

### 5. Run full test suites

```bash
# Next.js
cd nextjs && npm test

# FastAPI — full suite, then new tests in isolation
cd fastapi && pytest
cd fastapi && pytest -k "<new_test_keyword>" -v
```

All pre-existing tests must pass without modification.

---

### Step summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | Both | test files | Write tests |
| 5 | Both | — | Run full suites |

---

## Test Plan

<!-- What new tests are required and what they must cover.
     This is the spec; fill step 4 above with the implementation. -->

| Test | Track | Type | Covers |
|------|-------|------|--------|
| Happy path: create/read/update succeeds | Both | Integration | Main flow |
| Unauthenticated request → 401 | Both | Integration | Auth gate |
| Wrong-owner request → 403 | Both | Integration | Ownership gate |
| Missing record → 404 | Both | Integration | Not-found path |
| Bad input → 400/422 | Both | Integration | Validation |
| <!-- Edge case --> | | | |

---

## Rollback

<!-- What to revert if the feature needs to be pulled after landing.
     Delete this section if the change is purely additive with no schema migration. -->

**Next.js:** revert `schema.prisma`, run `npx prisma db push`.

**FastAPI:**
```bash
alembic downgrade -1
# then revert app/models/<resource>.py
```

**UI:** the component change is isolated to `<component>.tsx` — reverting that file is sufficient.

---

## Review Notes

<!-- Pre-implementation concerns, tradeoffs, open questions. Populate during planning or PR review. -->

**Critical** — will cause bugs or silent breakage if missed
<!-- e.g. "Must register new router in main.py or routes return 404 silently" -->

**Gaps** — plan doesn't address but probably should
<!-- e.g. "No test for the case where sort param is an unrecognized value" -->

**Minor** — non-blocking style / naming
<!-- e.g. "Consider renaming X to Y for consistency with existing endpoints" -->

---

## Progress Log

<!-- Append a dated entry each time work is resumed or a milestone is reached.
     Keep entries short — one or two sentences. Most recent entry at the top. -->

| Date | Update |
|------|--------|
| YYYY-MM-DD | <!-- What was done / what's blocked / what's next. --> |

---

## Completion

<!-- Fill in when this task is moved to done/. -->

**Branch:** `feat/...`
**Commits:**

**Summary of what shipped:**

**Decisions made:**
<!-- Tradeoffs accepted, alternatives ruled out, anything future-you should know. -->

**Known gaps / follow-up work:**

**Testing done:**
- [ ] `npm test` — X/X pass
- [ ] `pytest` — X/X pass
- [ ] Manual smoke test in browser (golden path + edge cases verified)
