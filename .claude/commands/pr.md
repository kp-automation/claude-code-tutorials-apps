Create a pull request for the current branch. Runs tests, enforces branch-naming rules, and generates a meaningful PR description from the diff. Optional argument: PR title override — **$ARGUMENTS**

## Step 1 — Safety checks

```bash
git branch --show-current
git status --short
git log main..HEAD --oneline
```

**Abort with a clear message if any of these are true:**
- Current branch is `main` — never PR from main.
- Branch name doesn't follow the convention `<type>/<description>` (e.g. `feat/add-labels`, `fix/task-status-bug`, `chore/update-deps`). Suggest a rename: `git branch -m <new-name>`.
- There are no commits ahead of main (`git log main..HEAD` is empty) — nothing to PR.

## Step 2 — Identify which tracks changed

```bash
git diff main..HEAD --name-only
```

If files under `nextjs/` changed → run Next.js tests.
If files under `fastapi/` changed → run FastAPI tests.
If both changed → run both.

## Step 3 — Run tests for changed tracks

**Next.js** (if changed):
```bash
cd nextjs && npm test -- --passWithNoTests 2>&1
```

**FastAPI** (if changed):
```bash
cd fastapi && source .venv/bin/activate && pytest -v 2>&1
```

**Abort if any test fails.** Show the failing test output and tell the developer to fix the failures before creating the PR. Do not create a PR with a broken test suite.

## Step 4 — Summarize the diff for the PR description

```bash
git diff main..HEAD --stat
git log main..HEAD --pretty=format:"%s" 
```

Use the commit messages and changed files to write the PR description. Do not just list file names — describe what changed and why.

## Step 5 — Push and create the PR

```bash
git push -u origin HEAD
```

Then create the PR. Use **$ARGUMENTS** as the title if provided; otherwise derive a concise title (under 70 characters) from the commit messages.

Build the PR body by filling in `.github/pull_request_template.md`:

- **Summary**: 2–4 bullets derived from the commit messages describing what changed and why.
- **Tracks changed**: check the boxes found in Step 2.
- **Type of change**: infer from the diff (new files → feature, test-only changes → tests, etc.).
- **Test plan**: check the boxes for whichever tracks were tested in Step 3; leave "Manually verified" unchecked (the developer does that).
- **Migration notes**: check "FastAPI alembic" if any `fastapi/app/models/` or `alembic/versions/` files changed; check "Next.js prisma db push" if `nextjs/prisma/schema.prisma` changed; otherwise check "Not applicable".
- **AI assistance**: always check "AI-assisted" and fill in: "Claude Code (`/pr` command) generated this PR description from the diff. Code was authored by the developer."

```bash
gh pr create \
  --title "<derived or provided title>" \
  --body "$(cat <<'EOF'
<filled-in template body>
EOF
)"
```

Check the "Tracks changed" boxes based on what you found in Step 2.

## Step 6 — Report

Print the PR URL and a one-line summary of what was included (commit count, files changed, tracks affected).
