# [FEATURE NAME]

## Overview

<!-- One paragraph describing what [FEATURE NAME] does and which track(s) it affects (Next.js / FastAPI / both). -->

## Why

<!-- The user problem or product motivation driving [FEATURE NAME]. Why now? What breaks or stays painful without it? -->

## Acceptance Criteria

- [ ] <!-- [FEATURE NAME] does X when Y. Phrase each criterion as a verifiable outcome. -->
- [ ] <!-- API shape: endpoint, method, params, response fields, expected status codes. -->
- [ ] <!-- UI behavior (if applicable): what the user sees or does. -->
- [ ] <!-- Auth / access control: who can call this; what 401 / 403 cases must be handled. -->
- [ ] <!-- Edge cases: empty state, missing record (404), bad input (400 / 422). -->
- [ ] Existing test suites still pass (`npm test` / `pytest`).

## Notes

<!-- Anything that doesn't fit elsewhere: related prior art in the codebase, intentional
     imperfections to leave alone, links to relevant CLAUDE.md sections, open questions,
     tradeoffs considered, or constraints the implementer should know before starting. -->

## Plan

<!-- Ordered steps. Each step = one logical unit of work. Steps that touch both tracks
     should call out Next.js and FastAPI sub-steps explicitly. -->

### 1. [STEP TITLE]

<!-- Describe what changes and why. Include key code shape if it matters. -->

**Verify:** <!-- How to confirm this step is complete before moving on. -->

---

### 2. [STEP TITLE]

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

All pre-existing tests must pass. New tests should cover the happy path, 401 / 403 access control, and 404 not-found cases.

---

### Step summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | | | |
| 2 | | | |
| 3 | Both | — | Run tests |

## Progress Log

<!-- Append a dated entry each time work is resumed or a milestone is reached.
     Keep entries short — one or two sentences. Most recent entry at the top. -->

| Date | Update |
|------|--------|
| YYYY-MM-DD | <!-- What was done / what's blocked / what's next. --> |
