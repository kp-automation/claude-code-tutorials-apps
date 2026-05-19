# [Feature Title]

<!-- Add this line when you move the file to in-progress/ — remove it from the template copy -->
<!-- **Owner:** your-name | **Claude role:** none/pair/driver/reviewer | **Branch:** `feat/...` | **Since:** YYYY-MM-DD -->

## Description

<!-- One paragraph: what the feature does and which track(s) it affects (Next.js / FastAPI / both). -->

## Why

<!-- The user problem or product motivation. Why now? What breaks without it? -->

## Scope

<!-- Which tracks are in scope? Delete the line(s) that don't apply. -->
- [ ] Next.js (UI + API routes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)

## Acceptance Criteria

- [ ] <!-- Specific, verifiable outcome. Phrase as "X does Y when Z." -->
- [ ] <!-- API shape: endpoint, method, params, response fields, status codes -->
- [ ] <!-- UI behavior if applicable: what the user sees/does -->
- [ ] <!-- Auth / access control: who can call this, what 401/403 cases exist -->
- [ ] <!-- Edge cases: empty state, missing record (404), bad input (400/422) -->
- [ ] Existing test suites still pass (`npm test` / `pytest`)

## Technical Notes

### Files to modify

<!-- List known files. Delete the section that doesn't apply. -->

**Next.js**
- `nextjs/app/api/<resource>/route.ts` — <!-- what changes -->
- `nextjs/app/api/<resource>/[id]/route.ts` — <!-- what changes -->
- `nextjs/components/<component>.tsx` — <!-- what changes -->
- `nextjs/lib/types.ts` — <!-- add/update unions if new status/priority values -->
- `nextjs/prisma/schema.prisma` — <!-- schema change, then `npx prisma db push` -->

**FastAPI**
- `fastapi/app/routers/<resource>.py` — <!-- add endpoint(s) -->
- `fastapi/app/services/<resource>_service.py` — <!-- add business logic -->
- `fastapi/app/schemas/<resource>.py` — <!-- add/update Pydantic schemas -->
- `fastapi/app/models/<resource>.py` — <!-- model change → must generate migration -->

### New files

<!-- List files to create. Delete if none. -->
- `nextjs/components/<component>.tsx` — <!-- purpose -->
- `fastapi/app/routers/<new>.py` — <!-- must register in main.py -->

### Data model changes

<!-- If schema changes: describe added/changed fields and migration steps. Delete if none. -->

**Next.js:** edit `prisma/schema.prisma`, then `npx prisma db push && npx prisma generate`.

**FastAPI:** edit `app/models/<resource>.py`, then:
```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### API contract

<!-- Document the new/changed endpoint so both tracks can stay in sync. -->

```
METHOD /api/<resource>[/{id}]
Auth: Bearer token required

Request body / query params:
  field_name   type     required   description

Response (200 / 201):
  field_name   type     description

Error cases:
  401  Unauthorized — no session / invalid token
  403  Forbidden — caller does not own the resource
  404  Not found — resource does not exist
  400/422  Validation error — bad input
```

## Plan

<!-- Ordered steps. Each step = one logical unit of work (one file, one decision). -->
<!-- Steps that touch both tracks should note "Next.js" and "FastAPI" sub-steps. -->

### 1. <!-- Step title -->

<!-- Describe the change. Include key code snippets if the shape matters. -->

**Verify:** <!-- How to confirm this step is done before moving on. -->

---

### 2. <!-- Step title -->

<!-- ... -->

**Verify:** <!-- ... -->

---

### 3. Run tests

```bash
# Next.js
cd nextjs && npm test

# FastAPI
cd fastapi && pytest
```

All pre-existing tests should pass. New tests should cover:
- Happy path
- 401 / 403 access control
- 404 not found

---

### Order summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | Next.js | `...` | Create / Modify |
| 2 | FastAPI | `...` | Create / Modify |
| 3 | Both | — | Run tests |

## Review Notes

<!-- Pre-implementation concerns, tradeoffs, gotchas. Populated during planning / PR review. -->

**Critical**
<!-- Things that will cause bugs or silent breakage if missed. -->

**Gaps**
<!-- Things the plan doesn't address but probably should. -->

**Minor**
<!-- Style, naming, conventions — non-blocking. -->

## Notes

<!-- Anything that doesn't fit above: related commits, prior art in the codebase,
     intentional imperfections to leave alone, links to relevant CLAUDE.md sections. -->

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
- [ ] `pytest` — X/X pass
- [ ] Manual smoke test in browser
