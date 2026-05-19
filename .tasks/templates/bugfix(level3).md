# [Bug Title — short, active description: "Task status update returns 403 for project owner"]

## Bug Summary

| Field | Value |
|-------|-------|
| **Severity** | <!-- Critical / High / Medium / Low --> |
| **Affected track(s)** | <!-- Next.js / FastAPI / Both --> |
| **Reported by** | <!-- Who or what surfaced it (user report, test failure, manual QA) --> |
| **Reported on** | <!-- YYYY-MM-DD --> |
| **Affects production** | <!-- Yes / No / Unknown --> |

---

## Observed Behavior

<!-- Exactly what happens. Include: error message, HTTP status code, UI state, stack trace,
     or test output — whichever is relevant. Copy-paste verbatim where possible. -->

```
<!-- Paste the actual error, response body, or console output here -->
```

## Expected Behavior

<!-- What the correct outcome should be. One or two sentences, concrete and testable.
     e.g. "PATCH /api/tasks/:id returns 200 with the updated task when called by the project owner." -->

---

## Impact

**Severity rationale**
<!-- Why this severity? Data loss? Auth bypass? UX degradation? Intermittent vs. deterministic? -->

**Who is affected**
<!-- All users / users in role X / users with Y data state / only in specific environment -->

**Data integrity risk**
<!-- Could this bug corrupt, silently drop, or expose data? "None" is a valid answer. -->

**Workaround available**
<!-- Yes (describe it briefly) / No -->

---

## Reproduction Steps

<!-- This is the most important section. The fix cannot be verified without a reliable repro.
     Be specific enough that someone unfamiliar with the bug can hit it on a clean checkout. -->

### Environment

| Item | Value |
|------|-------|
| Track | <!-- Next.js / FastAPI --> |
| Branch | <!-- e.g. main, feat/add-task-filtering --> |
| DB state | <!-- Fresh seed / specific data required (describe below) --> |
| Auth state | <!-- Which seeded user (e.g. alice@example.com / admin@taskforge.com) --> |
| Node/Python version | <!-- if version-specific --> |

### Preconditions

<!-- Set up any required data or state before running the steps.
     e.g. "A project exists with at least one task in IN_PROGRESS status." -->

```bash
# FastAPI — get a token and any IDs needed
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@taskforge.com","password":"alice123"}' | jq -r '.access_token')

# Or Next.js — log in via the UI as alice@example.com / password123
```

### Steps to reproduce

1. <!-- First action. Be precise: exact URL, request body, or UI interaction. -->
2. <!-- Second action. -->
3. <!-- ... -->

**Actual result at step N:**
```
<!-- Paste the actual output, response, or error exactly as it appears. -->
```

**Expected result at step N:**
```
<!-- What should have happened instead. -->
```

### Minimal reproduction (if simpler than the full steps above)

```bash
# The smallest possible curl / test / code snippet that triggers the bug
curl -s -X PATCH http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "DONE"}' | jq
```

---

## Root Cause Analysis

<!-- Where in the code does this go wrong and why?
     Work from the repro to the specific lines — don't guess.
     Distinguish symptom (what the bug looks like) from cause (why the code produces it). -->

### Symptom

<!-- What the bug looks like at the surface level.
     e.g. "PATCH /api/tasks/:id returns 403 even when the caller owns the project." -->

### Cause

<!-- The actual code defect: wrong condition, missing guard, incorrect query, off-by-one, etc.
     Reference the file and line number after investigation. -->

**File:** `<!-- fastapi/app/services/task_service.py -->`
**Line(s):** <!-- 42–48 -->

```python
# The defective code
# e.g. query filters by task.owner_id == user.id, but tasks don't have an owner_id —
# only projects do. This silently drops all rows for the project owner.
```

### Why it regressed / wasn't caught

<!-- Was there a test that should have caught this? Did a recent change introduce it?
     Check `git log -- <file>` or `git blame <file>` if the cause isn't obvious.
     "No test existed for this path" is a complete and valid answer. -->

---

## Affected Code

<!-- Exact locations. Distinguish read paths from write paths if both are affected. -->

**Next.js**
| File | Lines | Problem |
|------|-------|---------|
| `nextjs/app/api/<resource>/[id]/route.ts` | <!-- L42–48 --> | <!-- Description --> |
| `nextjs/components/<component>.tsx` | <!-- L12 --> | <!-- Description --> |

**FastAPI**
| File | Lines | Problem |
|------|-------|---------|
| `fastapi/app/services/<resource>_service.py` | <!-- L31–36 --> | <!-- Description --> |
| `fastapi/app/routers/<resource>.py` | <!-- L19 --> | <!-- Description --> |

---

## Fix Approach

### Chosen fix

<!-- Describe the approach in one paragraph. Be explicit about what changes and what doesn't.
     A bugfix should be the minimum change that makes the bug go away — no refactoring,
     no opportunistic cleanup, no behavior changes beyond the reported issue. -->

### Alternatives considered

<!-- Other ways you could fix it and why you're not using them. -->

| Option | Why not chosen |
|--------|----------------|
| <!-- e.g. "Fix the query at the router level" --> | <!-- e.g. "Moves logic into the router — violates thin-router convention" --> |
| <!-- ... --> | <!-- ... --> |

### Intentional imperfections to leave alone

<!-- Per CLAUDE.md: don't fix adjacent issues, mixed query styles, sparse error handling, etc.
     List anything near the bug site that looks wrong but must stay unchanged. -->
- <!-- e.g. "comments.py mixed query style at line 55 — do not touch" -->

---

## Implementation Plan

<!-- Step-by-step fix. Each step = one file, one change.
     Include exact before/after code so the fix is reviewable before it's applied.
     Keep changes surgical — only touch lines that are part of the defect. -->

### 1. [Fix description — track + file]

**Current state (verified YYYY-MM-DD):** <!-- N lines; defective code at lines X–Y. -->

```python
# BEFORE (lines X–Y)
# ... defective code ...

# AFTER
# ... corrected code ...
```

**Why this fixes it:**
<!-- One sentence connecting the changed code to the root cause. -->

**Verify:** <!-- Exact check that confirms this step resolved the issue.
               Run the minimal repro — paste the expected output. -->

---

### 2. [Fix description — track + file, if cross-track]

```ts
// BEFORE (lines X–Y)
// ...

// AFTER
// ...
```

**Why this fixes it:** <!-- ... -->

**Verify:** <!-- ... -->

---

### 3. Add a regression test

<!-- Write a test that would have caught this bug.
     The test should fail on the BEFORE code and pass on the AFTER code.
     Place it in the existing test file for this resource. -->

**FastAPI** (`fastapi/tests/test_<resource>.py`)
```python
def test_<bug_description>(client, auth_headers):
    # Arrange: set up the exact data state that triggers the bug
    # ...

    # Act: perform the action that was failing
    response = client.patch("/api/<resource>/1", json={...}, headers=auth_headers)

    # Assert: confirm the correct outcome (not the buggy one)
    assert response.status_code == 200
    assert response.json()["field"] == expected_value
```

**Next.js** (`nextjs/tests/...` — add to existing spec if one exists)
```ts
it("<bug description>", async () => {
  // ...
});
```

**Verify:** Run the new test against the BEFORE code to confirm it fails (proves the test is meaningful), then against the AFTER code to confirm it passes.

---

### 4. Re-run the original reproduction steps

After the fix is applied, walk through the **Reproduction Steps** section above exactly as written.

**Expected result:** the observed behavior no longer occurs and the expected behavior is confirmed.

---

### 5. Run full test suites

```bash
# Next.js
cd nextjs && npm test

# FastAPI
cd fastapi && pytest
```

All pre-existing tests must pass without modification.

---

### Step summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | | | Fix defect |
| 2 | | | Fix defect (if cross-track) |
| 3 | Both | test files | Add regression test |
| 4 | Both | — | Re-run repro steps |
| 5 | Both | — | Full test suite |

---

## Regression Checks

<!-- What must still work correctly after the fix.
     List the behaviors that live near the fix site and could accidentally break. -->

- [ ] <!-- Happy path that was already working: e.g. "Authorized owner can update task status" -->
- [ ] <!-- Adjacent auth path: e.g. "Non-owner still receives 403" -->
- [ ] <!-- Related endpoint: e.g. "GET /api/tasks/:id still returns correct task" -->
- [ ] <!-- Other track: e.g. "Same operation in the Next.js track behaves consistently" -->
- [ ] <!-- Edge case near the fix: e.g. "Task with no assignee still updates cleanly" -->
- [ ] Existing test suites pass without modification.

---

## Test Plan

<!-- Which new tests are added to prevent this bug from regressing.
     If the answer is "none — covered by step 3", say so explicitly. -->

| Test | Track | File | What it proves |
|------|-------|------|----------------|
| <!-- Bug scenario: state X + action Y → result Z --> | | | Regression guard |
| <!-- Related auth path still enforced --> | | | Auth contract unchanged |
| <!-- ... --> | | | |

---

## Progress Log

<!-- Append a dated entry each time work is resumed or a milestone is reached.
     Most recent entry at the top. One or two sentences per entry. -->

| Date | Update |
|------|--------|
| YYYY-MM-DD | <!-- What was investigated / what was found / what was fixed / what's next. --> |

---

## Completion

<!-- Fill in when this task is moved to done/. -->

**Branch:** `fix/...`
**Commits:**

**Root cause (one sentence):**
<!-- Final confirmed cause — should match the Root Cause Analysis above unless it changed. -->

**Fix summary:**
<!-- What changed. Reference file + line range. -->

**Regression test added:**
- [ ] Yes — `<test name>` in `<file>`
- [ ] No — reason: <!-- ... -->

**Repro steps re-run after fix:**
- [ ] Bug no longer triggers
- [ ] Expected behavior confirmed

**Testing done:**
- [ ] `npm test` — X/X pass
- [ ] `pytest` — X/X pass
- [ ] Manual smoke test of the exact repro steps
- [ ] Manual check of regression list above
