# .tasks/

Shared task tracking for the TaskForge team. Plain markdown files, no external tooling required — the directory is the board.

---

## Structure

```
.tasks/
├── todo/          # Planned but not started
├── in-progress/   # Actively being worked on (one owner at a time)
├── done/          # Shipped or abandoned (with reason)
└── templates/     # Starter files — copy, don't edit in place
```

Handoff documents live alongside the task file they describe — same directory, `<task-name>-handoff.md`.

---

## Task Lifecycle

```
todo/ ──► in-progress/ ──► done/
               │
               └──► *-handoff.md   (when ownership transfers mid-task)
```

1. **Claim** — Move the file from `todo/` to `in-progress/` and fill in the [assignment block](#assignment).
2. **Work** — Update the `## Progress Log` section as you go. Check off acceptance criteria as they're met.
3. **Hand off** — If you're passing the task to someone else (or to a Claude Code session, or back from one), create a `<task-name>-handoff.md` in the same directory before stepping away. See [Handoff](#handoff).
4. **Complete** — Move the file to `done/`. Fill in the `## Completion` section. If a handoff doc exists, it stays alongside.

---

## File Naming

Use kebab-case, short, action-first:

```
add-task-priority.md
fix-comment-auth.md
refactor-project-service.md
spike-websocket-transport.md
```

Handoff files append `-handoff` to the task name:

```
add-task-priority-handoff.md
```

If a task produces multiple handoffs (multiple ownership transfers), append a number:

```
add-notifications-handoff.md        ← first transfer
add-notifications-handoff-2.md      ← second transfer
```

---

## Assignment

When you move a task to `in-progress/`, add an assignment block directly under the H1 title. This is the single source of truth for who owns the task right now and what role any AI session is playing.

```markdown
# Add Task Priority Levels

**Owner:** kelly-punzalan | **Claude role:** pair | **Branch:** `feat/add-task-priority` | **Since:** 2026-05-08
```

### Owner

The human developer responsible for the task. One person — if pairing, pick the one who owns the PR.

### Claude role

How Claude Code is involved. Use one of:

| Value | Meaning |
|---|---|
| `none` | No AI tooling used |
| `pair` | Developer and Claude Code working together interactively |
| `driver` | Claude Code doing most of the implementation; developer reviewing |
| `reviewer` | Developer implementing; Claude Code reviewing / auditing |
| `handoff-pending` | Claude Code completed a phase; human needs to pick up (see handoff doc) |

### When ownership changes

Update the assignment block in place — don't add a second one. The handoff document captures the full history of the transfer.

---

## Handoff

Write a handoff document whenever ownership of an in-progress task transfers: developer → developer, developer → Claude Code session, or Claude Code session → developer.

**When to write one:**
- You're stepping away from a partially-complete task and someone else (human or AI) will continue.
- A Claude Code session has completed a phase of work and the developer needs to verify, continue, or merge it.
- A task is blocked and you want to document the current state clearly before pausing.

**What goes in it:** use `templates/handoff.md`. The essentials are:
- Exactly what was done (file-level detail, not vague summaries)
- Current state of the working tree, branch, and tests
- Decisions made and why (tradeoffs future-you will need to understand)
- Blockers and open questions that must be resolved before continuing
- Concrete next steps in order

**What does NOT go in a handoff:**
- Things already covered in the task's `## Progress Log` (don't duplicate)
- Vague status like "mostly done" — be specific about what's done and what's not
- Future nice-to-haves that aren't blocking the task

After writing the handoff, update the assignment block in the task file:
```markdown
**Owner:** — | **Claude role:** handoff-pending | **Branch:** `feat/...` | **Since:** 2026-05-11
```

The `—` in Owner means "unassigned, waiting for pickup". Update it when someone claims the task.

---

## Templates

| Template | Use when |
|---|---|
| `feature.md` | Straightforward feature — requirements are clear, surface area is small to medium |
| `feature2.md` | Feature with heavy context — use when motivation and assumptions need detailed documentation |
| `feature(level3).md` | Complex feature — data model changes, cross-track API contract, multiple phases, risk of regression |
| `bugfix(level3).md` | Bug with non-obvious root cause — needs reproduction steps, impact analysis, and root-cause investigation |
| `refactor(level3).md` | Refactors that touch multiple files or change shared patterns |
| `spike(level3).md` | Time-boxed investigation — goal is a decision or a prototype, not shipped code |
| `handoff.md` | Ownership transfer document (not a task itself) |

**How to use:** copy the template to the right directory and rename it. Never edit the template in place.

```bash
cp .tasks/templates/feature.md .tasks/todo/my-new-feature.md
```

---

## Claude Code Integration

The `/pr` command reads the current branch and diff — it does not read `.tasks/` directly. However, a good practice is to link the task file in your PR description so reviewers have context:

```markdown
**Task:** `.tasks/in-progress/add-task-priority.md`
```

The `/onboard` command sets up the repo from scratch and does not depend on task state.

The `/deploy` command checks code readiness (tests, build, migrations) — it doesn't gate on task completion. Move a task to `done/` only after the PR is merged, not just because `/deploy` passes.

---

## Hygiene

- **One owner at a time.** A task in `in-progress/` should have exactly one human owner. If two people are working on it, one of you owns the PR and is listed; the other is a collaborator, not an owner.
- **Keep `in-progress/` small.** More than 3–4 tasks in `in-progress/` at once usually means something is stuck. Check for missing handoffs or blocked tasks.
- **Don't leave tasks in `in-progress/` indefinitely.** If work is paused with no imminent continuation, write a handoff doc and move the task back to `todo/` (or to `done/` if abandoned — add a note saying why).
- **The `## Progress Log` is append-only.** Add entries at the top (newest first). Don't rewrite history.
