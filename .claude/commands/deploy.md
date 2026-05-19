Run a full pre-deploy readiness check for TaskForge — builds both tracks, runs the complete test suite, and reports whether the codebase is safe to ship. Does not push to any environment; that step is left to the team's deployment pipeline.

## Step 1 — Confirm branch and working tree state

```bash
git branch --show-current
git status --short
git log main..HEAD --oneline
```

Warn (but do not abort) if:
- There are uncommitted changes — list them so the developer can decide whether to stash or commit.
- The branch is behind `main` — recommend a rebase.

Abort if the working tree has staged but uncommitted changes to production-critical files (`.env`, `prisma/schema.prisma`, `alembic/versions/`).

## Step 2 — Run the full test suite

**Next.js:**
```bash
cd nextjs && npm test -- --passWithNoTests 2>&1
```

**FastAPI:**
```bash
cd fastapi && source .venv/bin/activate && pytest -v 2>&1
```

Record pass/fail and total counts for the report. **Do not proceed to build steps if any test fails.**

## Step 3 — Type-check and lint

**Next.js:**
```bash
cd nextjs && npx tsc --noEmit 2>&1
cd nextjs && npm run lint 2>&1
```

**FastAPI:**
```bash
cd fastapi && source .venv/bin/activate && ruff check app 2>&1
```

Flag errors (abort-worthy) vs warnings (report only). A TypeScript error or ruff `E`/`F` violation is abort-worthy. Lint warnings are noted but don't block.

## Step 4 — Production build (Next.js)

```bash
cd nextjs && npm run build 2>&1
```

This also runs the Next.js type-checker as a side effect. Report build output size summary if available.

FastAPI has no build step — `uvicorn` serves source directly.

## Step 5 — Verify database migrations are applied

```bash
cd fastapi && source .venv/bin/activate && alembic current 2>&1
alembic history --verbose 2>&1 | head -20
```

Warn if `alembic current` does not show `(head)` — it means unapplied migrations exist that would break the deployed app.

For Next.js, there is no migration workflow (`db push` is dev-only). Note this in the report.

## Step 6 — Check for hardcoded secrets

```bash
grep -r "password123\|admin123\|alice123\|bob123\|viewer123" \
  nextjs/app nextjs/lib fastapi/app \
  --include="*.ts" --include="*.tsx" --include="*.py" \
  --exclude-dir=".venv" 2>/dev/null
```

If any matches are found outside of seed/test files, **abort and report the file and line** — seed credentials must not appear in application code.

## Step 7 — Report

Print a final readiness summary:

```
=== Deploy Readiness Report ===

Branch: <branch-name>
Commit: <short SHA> — <commit message>

Tests
  Next.js   X passed, Y failed   [PASS / FAIL]
  FastAPI   X passed, Y failed   [PASS / FAIL]

Build
  Next.js   [PASS / FAIL / ERROR]
  FastAPI   N/A (no build step)

Type / Lint
  Next.js TS    [PASS / WARNINGS / ERRORS]
  Next.js ESLint [PASS / WARNINGS / ERRORS]
  FastAPI ruff  [PASS / WARNINGS / ERRORS]

Migrations
  FastAPI alembic   [HEAD / PENDING / UNKNOWN]
  Next.js           db push workflow — no migration state

Secrets scan  [CLEAN / FOUND — see above]

Overall: READY TO DEPLOY / NOT READY
```

If **NOT READY**, list each blocking issue with a one-line fix hint before the developer hands off to the deployment pipeline.
