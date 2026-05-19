# Handoff — [Task Title]

**Date:** YYYY-MM-DD
**From:** <!-- developer name or "Claude Code (session <id>)" -->
**To:** <!-- developer name or "Claude Code" or "team (unassigned)" -->
**Source task:** `.tasks/in-progress/<task-name>.md`
**Branch:** `feat/...` <!-- include current commit SHA if mid-task: (abc1234) -->
**Working tree:** <!-- Clean / Dirty — list modified files if dirty -->

---

## What Was Completed

<!-- Be specific. Describe changes at the file level, not the feature level.
     "Added X to Y" is better than "implemented notifications".
     For each significant file, note what was added/changed and any non-obvious decisions. -->

### [Track or component — e.g. "FastAPI backend" or "Next.js API routes"]

- **`path/to/file.py`** — <!-- what changed; any gotchas -->
- **`path/to/file.ts`** — <!-- what changed; any gotchas -->

### [Track or component]

- **`path/to/file.tsx`** — <!-- what changed; any gotchas -->

---

## Current State

### Working tree

```bash
# Paste output of: git status --short
```

### Tests

<!-- Run before writing this handoff. Report exact counts. -->

| Track | Result | Notes |
|---|---|---|
| Next.js (`npm test`) | <!-- X/X pass / NOT RUN / FAILING --> | <!-- any failures or skips to note --> |
| FastAPI (`pytest -v`) | <!-- X/X pass / NOT RUN / FAILING --> | <!-- any failures or skips to note --> |

### What works right now

<!-- A developer picking this up should be able to verify these manually in < 5 minutes. -->

- [ ] <!-- e.g. "npm run dev starts without errors" -->
- [ ] <!-- e.g. "POST /api/notifications returns 201 with a seeded user's token" -->
- [ ] <!-- e.g. "Bell badge increments in the browser when a task is assigned" -->

### What is NOT done yet

<!-- Reference the source task's acceptance criteria — list unchecked items here. -->

- [ ] <!-- AC item from source task -->
- [ ] <!-- AC item from source task -->

---

## Decisions Made

<!-- Document decisions the next person needs to understand to continue correctly.
     Format: decision → why. Don't document obvious choices. -->

1. **[Decision]** — <!-- Why this approach over the alternative. What would break if changed. -->
2. **[Decision]** — <!-- ... -->

---

## Blockers & Open Questions

<!-- Things that cannot be resolved without information the next person must gather.
     Mark each as: [BLOCKING] must resolve before continuing, or [QUESTION] non-blocking but worth resolving. -->

- **[BLOCKING]** <!-- Description. Who can answer / what to check. -->
- **[QUESTION]** <!-- Description. -->

---

## Next Steps

<!-- Ordered. Concrete enough that someone unfamiliar with the task can start without asking questions. -->

1. <!-- First thing to do — include the exact command or file path. -->
2. <!-- ... -->
3. <!-- ... -->

---

## Quick-Reference: Changed Files

<!-- Copy-paste from `git diff --name-only main..HEAD` if available.
     Makes it fast for the receiver to orient without reading the full diff. -->

```
<!-- paste file list here -->
```
