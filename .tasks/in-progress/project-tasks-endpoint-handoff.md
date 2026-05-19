# Handoff — Project Tasks Endpoint + Prisma Enum Cleanup

Date: 2026-04-29
Branch: `main` (uncommitted)

## Accomplishments

1. **New endpoint: `GET /api/projects/{id}/tasks`** — returns all tasks for one project, on both tracks.
   - Next.js: `nextjs/app/api/projects/[id]/tasks/route.ts` (new file). Auth → 401, missing → 404, non-owner → 403, then `findMany` with `assignee`, `project`, `comments.author` includes.
   - FastAPI: `fastapi/app/routers/projects.py` adds `get_project_tasks` (lines ~68–76). Calls `get_project()` first to enforce ownership/404, then delegates to `task_service.get_tasks(db, user, project_id)`.

2. **Next.js: Prisma enums → plain strings.**
   - `nextjs/prisma/schema.prisma`: dropped the `Role`, `ProjectStatus`, `TaskStatus`, `Priority` enum blocks; columns now `String @default("...")`. This aligns with CLAUDE.md's stated convention ("stored as plain strings (not DB enums)") and matches what FastAPI ships (FastAPI still uses real Python `enum.Enum`s on the ORM side — only the Prisma schema changed).
   - `nextjs/lib/types.ts`: switched from re-exporting Prisma-generated enum types to hand-written string-literal unions (`"ADMIN" | "MEMBER" | "VIEWER"` etc.). The literal values are unchanged.

3. **CLAUDE.md heavily expanded** (+~520 lines) — this is the bulk of the diff. Adds Coding Conventions, Common Patterns (Next.js + FastAPI skeletons), and Rules sections.

## Current State

- **Working tree dirty, nothing committed.** `git status` shows the 5 modified files + the new `app/api/projects/[id]/tasks/route.ts` and `.claude/settings.json` + `nextjs/package-lock.json`.
- Last commit on `main`: `45f2373 apps code`. Branch up to date with `origin/main`.
- No tests written for the new endpoint on either track.
- `npx prisma db push` has **not** been run since the schema change — the local SQLite DB is still using the old enum-backed columns. Required before `npm run dev` will work.
- `alembic revision --autogenerate` has **not** been run on the FastAPI side. The router change is purely additive (new endpoint, no model changes), so no migration is actually needed here — but worth confirming `pytest` still passes.

## Decisions

- **Prisma enums removed to match the documented "plain string" convention.** The TS string-literal unions in `lib/types.ts` are now the single source of truth for valid values across the Next.js track. CLAUDE.md's "Rules → Cross-track" section calls out that adding new values requires touching `schema.prisma` defaults + `lib/types.ts` + the FastAPI Python enum — that workflow is preserved.
- **New endpoint is nested under `/projects/{id}/tasks` rather than filtered via `/tasks?projectId=...`.** Matches REST nesting style already used for `/projects/{id}/labels` on the FastAPI side.
- **Ownership check pattern:** FastAPI calls `get_project()` purely for its side-effect (raises `NotFoundException`/`ForbiddenException`); Next.js does the explicit two-step (`findUnique` → 404 → 403 → query). Both follow CLAUDE.md's Common Patterns.

## Blockers / Open Questions

- **`tailwind-merge` was downgraded `^2.7.0` → `^2.6.1` in `nextjs/package.json`.** Not obviously intentional — could be `npm install` resolving an older lockfile, or a deliberate pin to dodge a 2.7 issue. Confirm with the user before committing.
- **`.claude/settings.json` is untracked** but in a project-shared path. Decide whether to commit it (project policy) or add to `.gitignore`.
- **No tests.** CLAUDE.md flags "sparse tests" as intentional teaching surface, so this may be by design — but if this endpoint is meant to be production-shaped, add at least one Jest case (`tests/components/` doesn't fit; would need a `tests/api/` dir which doesn't currently exist) and one pytest case (`fastapi/tests/test_projects.py`).

## Next Steps

1. Run the migrations / sync:
   ```bash
   (cd nextjs && npx prisma db push && npx prisma generate)
   (cd fastapi && pytest)   # confirm new route doesn't break anything
   ```
2. Resolve the `tailwind-merge` version question with the user.
3. Decide on `.claude/settings.json` (commit vs. gitignore).
4. (Optional) Add one happy-path test per track for `GET /api/projects/{id}/tasks`, plus a 403-non-owner test.
5. Update the FastAPI README's "API Endpoints" section to list the new route — it's the documented contract listing per CLAUDE.md.
6. Commit. Suggested split: (a) schema + types refactor, (b) new endpoint on both tracks, (c) CLAUDE.md expansion. Or one combined commit if the user prefers.
