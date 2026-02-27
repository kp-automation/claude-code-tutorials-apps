# TaskForge

A project management application built as a companion project for the **Claude Code Tutorial Series**.

TaskForge is a lightweight project management tool — think a simplified Linear/Jira. It serves as the hands-on project that learners build and improve throughout the 17-tutorial learning path.

## Choose Your Track

TaskForge is available in two independent implementations. Pick the one that matches your preferred tech stack:

| Track | Tech Stack | Directory |
|-------|------------|-----------|
| 🟦 **Next.js** | Next.js 15, TypeScript, Prisma, SQLite, Tailwind, shadcn/ui | `./nextjs` |
| 🟩 **FastAPI** | Python 3.12+, FastAPI, SQLAlchemy, SQLite, Pydantic v2 | `./fastapi` |

Both tracks implement the **same features** and **same API contract**, so tutorial concepts apply regardless of which track you choose.

---

## Quick Start

### Next.js Track 🟦

```bash
cd nextjs
npm install
npx prisma db push
npm run seed
npm run dev
# Open http://localhost:3000
```

### FastAPI Track 🟩

```bash
cd fastapi
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
# Open http://localhost:8000/docs
```

---

## Core Features

| Feature | Description |
|---------|-------------|
| **Projects** | Create, list, and archive projects with name, description, status |
| **Tasks** | CRUD for tasks with title, description, status (todo/in-progress/done), priority, assignee |
| **Comments** | Threaded comments on tasks |
| **Users** | Basic auth (email/password), roles (admin, member, viewer) |
| **Labels/Tags** | Categorize tasks with colored labels |
| **Dashboard** | Overview with task counts by status, recent activity |

---

## Data Model

Both tracks share the same data model:

```
User
├── id, email, password, name, role
└── Projects (owner)
    ├── id, name, description, status
    ├── Tasks
    │   ├── id, title, description, status, priority
    │   ├── Comments
    │   │   └── id, content, author
    │   └── Labels (many-to-many)
    │       └── id, name, color
    └── Labels
```

---

## Tutorial Progression

This starter code is intentionally imperfect — the tutorials progressively improve it:

| Tutorial | What You'll Add/Fix |
|----------|---------------------|
| T2: CLAUDE.md | Write/improve the project's CLAUDE.md |
| T4: Define→Plan→Iterate | Add task filtering & search |
| T5: Rules/Commands/Skills | Build custom slash commands |
| T7: Refactoring | Extract shared API client / repository pattern |
| T8: Documentation | Auto-generate API docs, README, ADRs |
| T9-T17 | Advanced features: notifications, activity feed, MCP, subagents, agent teams |

---

## Default Credentials (Seed Data)

After running the seed script:

| Email | Password | Role |
|-------|----------|------|
| admin@taskforge.dev | password123 | Admin |
| alice@taskforge.dev | password123 | Member |
| bob@taskforge.dev | password123 | Member |
| viewer@taskforge.dev | password123 | Viewer |

---

## Project Structure

```
taskforge/
├── README.md           # This file
├── CLAUDE.md           # AI assistant context (improve in T2)
├── nextjs/             # 🟦 Next.js implementation
├── fastapi/            # 🟩 FastAPI implementation
├── .claude/            # Claude Code config (built in T5+)
├── .tasks/             # Task workflow files (built in T4+)
└── docs/               # Documentation (generated in T8)
```

---

## License

MIT — Built for the Claude Code Tutorial Series by Lumenalta.
