Walk a new developer through setting up TaskForge locally — both tracks — and confirm everything works before they write a single line of code.

## Step 1 — Check prerequisites

```bash
node --version
python3 --version
git --version
gh --version 2>/dev/null || echo "gh not installed (optional — needed for /pr)"
```

Report what was found. Flag clearly if Node < 18 or Python < 3.12, since both tracks require those minimums. `gh` is optional but needed for `/pr`.

## Step 2 — Set up the Next.js track

```bash
cd nextjs
cp .env.example .env 2>/dev/null || echo ".env already exists — skipping"
npm install
npx prisma db push
npm run seed
```

If `npm install` fails, show the error and stop — don't proceed to Prisma steps.

## Step 3 — Set up the FastAPI track

```bash
cd fastapi
cp .env.example .env 2>/dev/null || echo ".env already exists — skipping"
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
```

If the venv activate fails on Windows (non-bash shell), instruct the developer to run `source .venv/Scripts/activate` instead.

## Step 4 — Verify both tracks pass tests

```bash
cd nextjs && npm test -- --passWithNoTests 2>&1 | tail -20
```

```bash
cd fastapi && source .venv/bin/activate && pytest -q 2>&1 | tail -20
```

## Step 5 — Print onboarding summary

After all steps succeed, print this block verbatim (fill in any PASS/FAIL from the test run):

```
=== TaskForge — You're ready to go ===

Dev servers
  Next.js   →  cd nextjs && npm run dev      →  http://localhost:3000
  FastAPI   →  cd fastapi && make run         →  http://localhost:8000
                                                 http://localhost:8000/docs  (OpenAPI)

Seed credentials
  Next.js   alice@example.com   / password123  (ADMIN)
            bob@example.com     / password123  (MEMBER)
            charlie@example.com / password123  (VIEWER)

  FastAPI   admin@taskforge.com / admin123     (ADMIN)
            alice@taskforge.com / alice123     (MEMBER)
            bob@taskforge.com   / bob123       (MEMBER)
            viewer@taskforge.com/ viewer123    (VIEWER)

Key reading
  CLAUDE.md        — conventions, patterns, rules
  ARCHITECTURE.md  — component diagram, data-flow traces
  .claude/rules/   — fastapi-router-registration, git-workflow

Tests
  Next.js   →  cd nextjs && npm test
  FastAPI   →  cd fastapi && pytest -v

Next step: create a feature branch and start coding.
  git checkout -b feat/<your-feature>
```

If any step failed, show the error output and do NOT print the summary — instead, describe what went wrong and how to fix it.
