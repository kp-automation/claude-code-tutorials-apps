# TaskForge

A lightweight Linear/Jira-style project management tool. Built as the hands-on companion project for the **Claude Code Tutorial Series** by Lumenalta.

TaskForge ships as **two independent, feature-identical implementations** — pick the stack that matches your background:

| Track | Stack | Directory |
|-------|-------|-----------|
| **Next.js** | Next.js 15, TypeScript, Prisma, SQLite, Tailwind, shadcn/ui | `./nextjs` |
| **FastAPI** | Python 3.12+, FastAPI, SQLAlchemy 2.0, SQLite, Pydantic v2 | `./fastapi` |

Both tracks implement the same features, the same HTTP API contract, and the same data model. Tutorial concepts apply regardless of which track you choose.

---

## Features

- **Authentication** — Email/password login and registration; three roles (ADMIN, MEMBER, VIEWER)
- **Projects** — Create, update, and archive projects; scoped to the owning user
- **Kanban board** — Drag tasks across three columns: TODO → IN_PROGRESS → DONE
- **Tasks** — Full CRUD with title, description, status, priority (LOW/MEDIUM/HIGH/URGENT), and optional assignee
- **Labels** — Project-scoped colored labels; assign multiple labels per task
- **Comments** — Threaded discussion on each task
- **Notifications** — In-app notifications for task assignments, completions, and mentions; unread badge in the UI
- **Widgets** — User-scoped custom widgets with full CRUD
- **Dashboard** — Task counts by status and recent activity feed
- **CSV Export** — Download all tasks in a project as a CSV file (id, title, description, status, priority, assignee, labels, timestamps); available via `GET /api/projects/:id/export` and the Export CSV button on the project page

---

## Quick Start

### Prerequisites

| Track | Requirement |
|-------|-------------|
| Next.js | Node.js 18+, npm |
| FastAPI | Python 3.12+ |

### Next.js track

```bash
cd nextjs
cp .env.example .env          # set DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
npm install
npx prisma db push
npm run seed
npm run dev
# Open http://localhost:3000
```

### FastAPI track

```bash
cd fastapi
cp .env.example .env          # set SECRET_KEY, CORS_ORIGINS
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
# API: http://localhost:8000 | Docs: http://localhost:8000/docs
```

---

## Installation

### Next.js — step by step

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL="file:./dev.db"
#   NEXTAUTH_URL="http://localhost:3000"
#   NEXTAUTH_SECRET="<a long random string>"

# 3. Create the SQLite database and apply the schema
npx prisma db push

# 4. Seed sample data
npm run seed
```

### FastAPI — step by step

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install runtime + dev dependencies
pip install -e ".[dev]"

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set:
#   SECRET_KEY=<a long random string>

# 4. Apply Alembic migrations (creates taskforge.db)
alembic upgrade head

# 5. Seed sample data
python -m app.seed
```

---

## Seed Credentials

### Next.js

| Email | Password | Role |
|-------|----------|------|
| alice@example.com | password123 | ADMIN |
| bob@example.com | password123 | MEMBER |
| charlie@example.com | password123 | VIEWER |

### FastAPI

| Email | Password | Role |
|-------|----------|------|
| admin@taskforge.com | admin123 | ADMIN |
| alice@taskforge.com | alice123 | MEMBER |
| bob@taskforge.com | bob123 | MEMBER |
| viewer@taskforge.com | viewer123 | VIEWER |

---

## Project Structure

```
taskforge/
├── README.md
├── CLAUDE.md                     # AI assistant context and coding conventions
├── ARCHITECTURE.md               # Component diagram and data-flow traces
│
├── nextjs/                       # Next.js 15 full-stack track
│   ├── app/
│   │   ├── api/                  # Route handlers (route.ts files)
│   │   │   ├── auth/             # NextAuth [...nextauth] + register
│   │   │   ├── projects/         # Projects + nested labels/tasks
│   │   │   ├── tasks/            # Tasks CRUD
│   │   │   ├── comments/         # Comments CRUD
│   │   │   ├── notifications/    # Notifications
│   │   │   └── widgets/          # Widgets CRUD
│   │   ├── auth/                 # /auth/login and /auth/register pages
│   │   ├── projects/             # Project list page + /[id] kanban detail page
│   │   ├── layout.tsx            # Root layout (SessionProvider, Toaster)
│   │   └── page.tsx              # Dashboard landing page
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Dialog, Select…)
│   │   ├── task-board.tsx        # Kanban board
│   │   ├── task-card.tsx         # Individual task card
│   │   ├── project-list.tsx      # Project list view
│   │   ├── comment-thread.tsx    # Per-task comment thread
│   │   ├── notification-bell.tsx
│   │   ├── notification-dropdown.tsx
│   │   └── notifications-provider.tsx
│   ├── lib/
│   │   ├── db.ts                 # Singleton Prisma client
│   │   ├── auth.ts               # NextAuth options + getServerSession helper
│   │   ├── types.ts              # Status/priority/role unions + augmented types
│   │   └── utils.ts              # cn() classname helper
│   ├── prisma/
│   │   ├── schema.prisma         # Authoritative schema for this track
│   │   └── seed.ts               # `npm run seed` entry point
│   └── tests/
│       ├── components/           # React Testing Library specs
│       └── lib/                  # Pure-module unit tests
│
├── fastapi/                      # FastAPI backend track
│   ├── app/
│   │   ├── main.py               # App factory, CORS middleware, router registration
│   │   ├── config.py             # pydantic-settings (.env loader)
│   │   ├── database.py           # Engine, SessionLocal, get_db dependency
│   │   ├── seed.py               # `python -m app.seed` entry point
│   │   ├── models/               # SQLAlchemy ORM models (one file per entity)
│   │   ├── schemas/              # Pydantic v2 request/response models
│   │   ├── routers/              # HTTP layer — auth, projects, tasks, comments,
│   │   │                         # notifications, widgets
│   │   ├── services/             # Business logic (auth, project, task,
│   │   │                         # notification, widget services)
│   │   └── utils/                # JWT helpers, password hashing, exception types
│   ├── alembic/
│   │   └── versions/             # Auto-generated migration scripts
│   ├── tests/                    # pytest + httpx; conftest.py overrides get_db
│   ├── pyproject.toml
│   └── Makefile                  # Shortcuts: install / dev / seed / run / migrate / test
│
└── .claude/
    └── rules/                    # Claude Code project-level rules
```

---

## Data Model

Both tracks model the same entities and relationships:

```
User (role: ADMIN | MEMBER | VIEWER)
└── Project (status: ACTIVE | ARCHIVED)
    ├── Task (status: TODO | IN_PROGRESS | DONE, priority: LOW | MEDIUM | HIGH | URGENT)
    │   ├── Comment
    │   └── Label  (many-to-many via TaskLabel)
    ├── Label (name, color hex)
    └── Notification (type: TASK_ASSIGNED | TASK_COMPLETED | MENTION)

Widget  (user-scoped, independent of projects)
```

**Cascade rules:**
- Deleting a **Project** cascades to its tasks, labels, and comments.
- Deleting a **User** cascades to owned projects; sets `assigneeId` to null on assigned tasks.

**ID types differ by track:** Next.js uses `cuid()` strings; FastAPI uses integer auto-increment IDs.

---

## API Endpoints

Both tracks expose the same API surface. FastAPI adds interactive docs at `/docs` (Swagger UI) and `/redoc`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in; returns JWT (FastAPI) or sets session cookie (Next.js) |
| GET | `/api/auth/me` | Current user profile |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects owned by the current user |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/{id}` | Get a project with its tasks and labels |
| PUT | `/api/projects/{id}` | Update a project |
| DELETE | `/api/projects/{id}` | Delete a project (cascades to tasks/comments/labels) |
| GET | `/api/projects/{id}/tasks` | List tasks for a specific project |
| GET | `/api/projects/{id}/labels` | List labels for a project |
| POST | `/api/projects/{id}/labels` | Create a label |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks (`?project_id=` to filter by project) |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/{id}` | Get a task with its comments and labels |
| PUT | `/api/tasks/{id}` | Update a task (status, priority, assignee, etc.) |
| DELETE | `/api/tasks/{id}` | Delete a task |

### Comments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks/{id}/comments` | List comments on a task |
| POST | `/api/tasks/{id}/comments` | Add a comment |
| DELETE | `/api/comments/{id}` | Delete a comment |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications for the current user (newest first) |
| GET | `/api/notifications/unread-count` | Count of unread notifications |
| POST | `/api/notifications/read-all` | Mark all notifications as read |
| POST | `/api/notifications/{id}/read` | Mark one notification as read |

### Widgets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/widgets` | List widgets owned by the current user |
| POST | `/api/widgets` | Create a widget |
| GET | `/api/widgets/{id}` | Get a widget |
| PUT | `/api/widgets/{id}` | Update a widget |
| DELETE | `/api/widgets/{id}` | Delete a widget |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API root — returns name and docs link (FastAPI) |
| GET | `/health` | Health check — returns `{"status": "healthy"}` (FastAPI) |

---

## Usage Examples

### Next.js — UI

Open `http://localhost:3000`. You are redirected to `/auth/login` if not signed in. After login, the dashboard shows task counts and a recent-activity feed. Navigate to **Projects** to create a project, then open a project to access the kanban board. Click any task card to open its detail view with an edit form and comment thread. The notification bell in the header shows unread counts.

### FastAPI — REST API

The full interactive API reference is at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc`.

**Authenticate and get a token:**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@taskforge.com", "password": "admin123"}'
# Returns: {"access_token": "...", "token_type": "bearer"}
```

**Create a project:**

```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "description": "Optional description"}'
```

**Create a task:**

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "First task", "project_id": 1, "priority": "HIGH"}'
```

**List tasks filtered by project:**

```bash
curl "http://localhost:8000/api/tasks?project_id=1" \
  -H "Authorization: Bearer <token>"
```

---

## Configuration

### Next.js (`nextjs/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite file path (Prisma format) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Base URL for NextAuth callbacks |
| `NEXTAUTH_SECRET` | *(required)* | Secret used to sign JWT session tokens |

### FastAPI (`fastapi/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./taskforge.db` | SQLAlchemy connection string |
| `SECRET_KEY` | *(required — change in production)* | HMAC key for JWT signing |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime in minutes |
| `DEBUG` | `true` | Debug mode |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins |

---

## Development Workflow

### Next.js daily loop

```bash
cd nextjs
npm run dev          # hot-reload dev server at http://localhost:3000
npm run lint         # ESLint (eslint-config-next)
npm run build        # production build + type-check
```

**Schema changes:**

```bash
# After editing nextjs/prisma/schema.prisma:
npx prisma db push       # apply to dev.db (no migrations folder — db push is the workflow)
npx prisma generate      # regenerate the Prisma client
npx prisma studio        # visual database browser at http://localhost:5555
```

**Reset the database:**

```bash
rm prisma/dev.db && npx prisma db push && npm run seed
```

### FastAPI daily loop

```bash
cd fastapi
source .venv/bin/activate
uvicorn app.main:app --reload    # http://localhost:8000
ruff check app                   # lint
ruff check --fix app             # auto-fix lint issues
```

**Schema changes:**

```bash
# After editing app/models/*.py:
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

**Reset the database:**

```bash
rm taskforge.db && alembic upgrade head && python -m app.seed
```

**Makefile shortcuts:**

```bash
make install   # pip install -e .
make dev       # pip install -e ".[dev]"
make run       # uvicorn app.main:app --reload
make migrate   # alembic upgrade head
make seed      # python -m app.seed
make test      # pytest -v
make test-cov  # pytest with HTML coverage report
make clean     # remove build artefacts and databases
```

---

## Testing

### Next.js (Jest + React Testing Library)

```bash
cd nextjs
npm test                                          # full suite
npm run test:watch                                # watch mode
npx jest tests/components/task-card.test.tsx      # single file
npx jest -t "renders task title"                  # single test by name
```

### FastAPI (pytest + httpx)

```bash
cd fastapi
pytest                                            # full suite
pytest -v                                         # verbose
pytest tests/test_tasks.py                        # single file
pytest tests/test_tasks.py::test_create_task      # single test
pytest -k "create"                                # by keyword expression
pytest --cov=app --cov-report=html                # coverage → htmlcov/index.html
```

### Both tracks (after a cross-cutting change)

```bash
(cd nextjs && npx prisma db push && npm test)
(cd fastapi && alembic revision --autogenerate -m "..." && alembic upgrade head && pytest)
```

---

## Contributing

### Branch and commit rules

- **Never commit directly to `main`.** All changes go through a feature branch.
- Name branches descriptively: `feat/add-notifications`, `fix/task-status-bug`, `docs/update-readme`.
- Run the relevant test suite before committing (`npm test` / `pytest`).
- Write meaningful commit messages — describe *what changed and why*, not just "fix" or "update".

```bash
# Example workflow
git checkout -b feat/add-label-filtering
# ... make changes ...
npm test            # or: pytest
git add <files>
git commit -m "feat: add label filtering to task list endpoint"
```

### Intentional imperfections

This codebase intentionally contains teaching surface for the Claude Code Tutorial Series:

- **Inconsistent error handling** — some routes use the service layer; others have inline logic
- **Mixed query styles** — the FastAPI comments router mixes ORM and raw `select()` calls (marked with `# Intentional inconsistency:` comments)
- **Sparse test coverage** — delete operations and several edge cases have no tests
- **Duplicated fetch logic** — Next.js components fetch data directly rather than through a shared client
- **Missing validations** — several endpoints have minimal input validation
- **Ownership gap** — the Next.js task-create handler does not verify that the caller owns the target project (FastAPI does check this)

Do not fix these opportunistically. They are left in place for tutorials to address explicitly.

### Adding a new resource

When adding a new entity to either track:

**Next.js:**
1. Add the model to `nextjs/prisma/schema.prisma`
2. Run `npx prisma db push && npx prisma generate`
3. Add route handlers in `nextjs/app/api/<resource>/route.ts` and `[id]/route.ts`
4. Export any new types from `nextjs/lib/types.ts`

**FastAPI:**
1. Add the SQLAlchemy model in `fastapi/app/models/<resource>.py`
2. Run `alembic revision --autogenerate -m "add <resource>"` then `alembic upgrade head`
3. Add Pydantic schemas in `fastapi/app/schemas/<resource>.py` (Base → Create → Update → Response chain)
4. Add business logic in `fastapi/app/services/<resource>_service.py`
5. Add the router in `fastapi/app/routers/<resource>.py`
6. **Register the router in `fastapi/app/main.py`** — both the import and `app.include_router(...)` call. A missing registration produces silent 404s with no startup error.

Keep both tracks in sync when the change affects the shared data model or API contract.

---

## License

MIT — Built for the Claude Code Tutorial Series by Lumenalta.
