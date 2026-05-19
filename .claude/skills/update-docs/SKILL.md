---
name: update-docs
description: Analyzes recent Git changes in TaskForge and updates README, API reference, and CHANGELOG to reflect what changed. Run after landing new features or API changes.
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
---

# Update Docs Skill

Keep TaskForge's three documentation files in sync with the codebase after recent changes.

## Documents this skill maintains

| File | What it captures |
|------|-----------------|
| `README.md` | Feature list, quick-start instructions, seed credentials |
| `docs/api-reference.md` | Every HTTP endpoint: method, path, request body, response shape |
| `CHANGELOG.md` | Keep a Changelog format — add entries under `[Unreleased]` |

---

## Step 1 — Gather the change picture

Run all of these before touching any file:

```bash
# Commits since the last doc-tagged commit or last 20 if none
git log --oneline -20

# Files changed in the working tree vs HEAD (staged + unstaged + untracked summaries)
git diff HEAD --name-only
git diff --cached --name-only

# Broader view: everything not yet on main (adjust base branch if needed)
git diff main...HEAD --name-only 2>/dev/null || git diff HEAD~5...HEAD --name-only
```

Then read the actual diffs for files that are likely to affect docs:

```bash
# API layer changes
git diff main...HEAD -- \
  'fastapi/app/routers/*.py' \
  'fastapi/app/schemas/*.py' \
  'nextjs/app/api/**/*.ts' \
  'nextjs/lib/types.ts' \
  'nextjs/prisma/schema.prisma' \
  'fastapi/app/models/*.py' 2>/dev/null || \
git diff HEAD~5...HEAD -- \
  'fastapi/app/routers/*.py' \
  'fastapi/app/schemas/*.py' \
  'nextjs/app/api/**/*.ts' \
  'nextjs/lib/types.ts' \
  'nextjs/prisma/schema.prisma' \
  'fastapi/app/models/*.py'
```

Read the current state of any new or heavily-changed source files before updating docs — don't describe the diff, describe what the code *does now*.

---

## Step 2 — Classify the changes

Map changed source files to the documentation they affect:

| Changed path pattern | Likely doc impact |
|----------------------|-------------------|
| `fastapi/app/routers/<name>.py` (new file) | API reference: add full endpoint block; README: add feature if user-facing; CHANGELOG: Added |
| `fastapi/app/routers/<name>.py` (modified) | API reference: update request/response shapes or status codes; CHANGELOG: Changed or Fixed |
| `fastapi/app/schemas/<name>.py` | API reference: update request/response shapes for that resource |
| `nextjs/app/api/<path>/route.ts` (new) | API reference: add endpoint block; README + CHANGELOG same as above |
| `nextjs/app/api/<path>/route.ts` (modified) | API reference: update endpoint entry |
| `fastapi/app/models/<name>.py` or `nextjs/prisma/schema.prisma` | API reference: update field tables; README if new entity |
| `nextjs/lib/types.ts` | API reference: update enum value tables |
| `fastapi/app/main.py` | Check router registration — confirm API reference has all routers |
| `README.md`, `nextjs/README.md`, `fastapi/README.md` | No cascade; those are the source |
| `*.env.example` | README quick-start: update env var instructions |
| `fastapi/pyproject.toml` or `nextjs/package.json` | README prerequisites if runtime version changed |

If a change is purely internal (tests, migrations, refactors with no API surface change) note it in CHANGELOG but skip README and API reference.

---

## Step 3 — Update CHANGELOG.md

Location: `CHANGELOG.md` at the repo root.

Rules:
- All new entries go under `## [Unreleased]`. Never create a dated release section.
- Use exactly these subsection headers: `### Added`, `### Changed`, `### Fixed`, `### Removed`.
- One bullet per logical change. Lead with the resource/feature name in bold: `- **Notifications** — ...`
- Reference both tracks if the change applies to both: `(both tracks)`, `(FastAPI)`, `(Next.js)`.
- Keep bullets short — one sentence each. The what, not the how.
- Do not duplicate bullets already in `[Unreleased]`.

Example entries:
```markdown
## [Unreleased]

### Added

- **Widgets** — Full CRUD for user-scoped widgets (`GET/POST /api/widgets`, `GET/PUT/DELETE /api/widgets/{id}`) in the FastAPI track. Widgets carry `name`, `description`, and `widget_type`.
- **Notifications** — In-app notification system with unread badge; new endpoints `GET /api/notifications`, `PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all` (both tracks).

### Changed

- **Tasks** — `PUT /api/tasks/{id}` now accepts partial updates; omitted fields are preserved (FastAPI).

### Fixed

- **Comments** — `GET /api/comments?taskId=` now returns 404 when the task does not exist instead of an empty list (Next.js).
```

---

## Step 4 — Update docs/api-reference.md

The file uses this repeating structure for each endpoint group. Match it exactly when adding new sections:

```markdown
## Widgets

### List widgets

`GET /api/widgets`

**Auth required:** Yes

**Response `200`**
```json
[
  {
    "id": 1,
    "name": "My Widget",
    "description": "Optional description",
    "widget_type": "CHART",
    "owner_id": 3,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Create widget

`POST /api/widgets`

**Auth required:** Yes

**Request body**
```json
{
  "name": "My Widget",
  "description": "Optional",
  "widget_type": "CHART"
}
```

**Response `201`** — same shape as a single widget object above.

---
```

Placement rules:
- New top-level resource sections go at the end, before any existing "Track differences" or appendix section.
- Existing sections: update in place — don't duplicate.
- When a field is added to an existing endpoint, add it to the example JSON and note it in a **Fields** table if the section has one.
- When an endpoint is removed, delete its block entirely.
- Keep the Contents list at the top of the file in sync: add/remove anchor links to match sections.

ID type note — include in new sections covering both tracks:
> **Note:** Next.js IDs are cuid strings; FastAPI IDs are integers. The response shape is otherwise identical.

---

## Step 5 — Update README.md

Only update README when:
- A new user-facing feature was added → add a bullet to the **Features** section.
- A new resource's seed credentials changed → update the credentials table.
- A new required env variable was added → update the Quick Start env setup block.
- A new prerequisite (runtime version bump) was introduced.

Do **not** update README for:
- Internal refactors or bug fixes.
- New API endpoints on an already-documented feature.
- Test or tooling changes.

Features section bullet format:
```markdown
- **Feature Name** — One-sentence description of what it does for the user
```

---

## Step 6 — Report

After all edits are complete, output a structured report:

```
## Documentation update summary

### Changes analyzed
- <N> commits examined
- <N> source files changed

### CHANGELOG.md
- Added <N> entries under [Unreleased]: <subsection list>

### docs/api-reference.md
- <"No changes needed" | list of sections added/updated/removed>

### README.md
- <"No changes needed" | list of bullets/sections touched>

### What was NOT documented
<List any changes that were intentionally skipped and why — e.g. "internal refactor in task_service.py: no API surface change">
```

---

## Rules and guardrails

- **Read before writing.** Always read the current content of a doc file before editing it. Never overwrite from memory.
- **Minimal diff.** Change only what the new code requires. Don't reformat, reorder, or "improve" unrelated sections.
- **Don't invent endpoints.** If you're unsure whether a route is complete and registered, run `grep "include_router" fastapi/app/main.py` and check `nextjs/app/api/` directory structure before documenting it.
- **Don't document dead code.** If a router file exists but isn't registered in `main.py`, note it in the report ("widgets router exists but is not registered — skipped") rather than documenting phantom endpoints.
- **Intentional imperfections stay.** The codebase has documented inconsistencies (mixed query styles, sparse error handling). Don't mention these as bugs in the changelog or suggest fixes in the docs.
- **Preserve existing formatting.** Match the heading level, code fence language tags, and table style already in each file.
- **Today's date is available in context** as `currentDate` — use it only if you need to note the date somewhere explicitly (you generally won't; CHANGELOG entries go in `[Unreleased]`).
