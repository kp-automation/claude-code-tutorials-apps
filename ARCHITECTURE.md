# TaskForge — Architecture

## System Overview

TaskForge is a project management tool (Jira/Linear-lite) implemented as two **fully independent, parallel tracks** sharing the same logical data model and HTTP API contract.

| | Next.js Track | FastAPI Track |
|---|---|---|
| Language | TypeScript | Python 3.12+ |
| Framework | Next.js 15 (App Router) | FastAPI 0.115+ |
| ORM | Prisma 5 | SQLAlchemy 2.0 |
| Database | SQLite (`prisma/dev.db`) | SQLite (`taskforge.db`) |
| Auth | NextAuth v4 — cookie-based JWT sessions | python-jose — Bearer tokens |
| Schema migration | `prisma db push` (no history) | Alembic versioned revisions |
| ID type | cuid() strings | auto-increment integers |
| Input validation | Zod at route boundary | Pydantic at router + DB Enum columns |

Both tracks serve `localhost:3000` (Next.js) and `localhost:8000` (FastAPI) independently. They do not communicate with each other at runtime.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                              │
└────────────────┬───────────────────────────────┬─────────────────────┘
                 │ HTTP (pages + API routes)      │ HTTP (JSON API)
                 ▼                                ▼
┌───────────────────────────────┐  ┌──────────────────────────────────┐
│       NEXT.JS TRACK           │  │         FASTAPI TRACK            │
│  localhost:3000               │  │  localhost:8000                  │
│                               │  │                                  │
│  ┌─────────────────────────┐  │  │  ┌────────────────────────────┐  │
│  │    App Router (pages)   │  │  │  │       main.py              │  │
│  │  /dashboard             │  │  │  │  app factory + CORS        │  │
│  │  /projects/[id]         │  │  │  └────────────┬───────────────┘  │
│  │  /auth/login|register   │  │  │               │ include_router   │
│  └──────────┬──────────────┘  │  │  ┌────────────▼───────────────┐  │
│             │                  │  │  │        Routers             │  │
│  ┌──────────▼──────────────┐  │  │  │  auth / projects / tasks   │  │
│  │    API Route Handlers   │  │  │  │  comments / notifications  │  │
│  │  app/api/               │  │  │  │  widgets                   │  │
│  │  ├─ auth/               │  │  │  └────────────┬───────────────┘  │
│  │  ├─ projects/[id]/      │  │  │               │ delegates to     │
│  │  ├─ tasks/[id]/         │  │  │  ┌────────────▼───────────────┐  │
│  │  ├─ comments/           │  │  │  │        Services            │  │
│  │  ├─ notifications/      │  │  │  │  auth_service              │  │
│  │  └─ widgets/            │  │  │  │  project_service           │  │
│  └──────────┬──────────────┘  │  │  │  task_service              │  │
│             │                  │  │  │  notification_service      │  │
│  ┌──────────▼──────────────┐  │  │  │  widget_service            │  │
│  │    lib/ (shared)        │  │  │  └────────────┬───────────────┘  │
│  │  ├─ db.ts  (Prisma)     │  │  │               │ queries          │
│  │  ├─ auth.ts (NextAuth)  │  │  │  ┌────────────▼───────────────┐  │
│  │  ├─ types.ts            │  │  │  │   Models (SQLAlchemy ORM)  │  │
│  │  └─ utils.ts            │  │  │  │  user / project / task     │  │
│  └──────────┬──────────────┘  │  │  │  comment / label / notif.  │  │
│             │                  │  │  └────────────┬───────────────┘  │
│  ┌──────────▼──────────────┐  │  │               │                  │
│  │      SQLite DB          │  │  │  ┌────────────▼───────────────┐  │
│  │   (prisma/dev.db)       │  │  │  │      SQLite DB             │  │
│  └─────────────────────────┘  │  │  │   (taskforge.db)           │  │
│                               │  │  └────────────────────────────┘  │
└───────────────────────────────┘  └──────────────────────────────────┘
```

---

## Data Flow

### Authentication — Next.js

```
Browser
  POST /api/auth/callback/credentials  { email, password }
        │
        ▼
  NextAuth CredentialsProvider
        │
        ▼
  lib/auth.ts:20  authorize(credentials)
    ├─ guard: missing fields → return null (→ 401 redirect)
    ├─ prisma.user.findUnique({ where: { email } })
    ├─ user not found → return null
    ├─ bcryptjs.compare(plain, user.password) → wrong → return null
    └─ return { id, email, name, role }
        │
        ▼
  lib/auth.ts:49  jwt callback
    └─ token.id = user.id; token.role = user.role
        │
        ▼
  lib/auth.ts:56  session callback
    └─ session.user.id = token.id; session.user.role = token.role
        │
        ▼
  Signed JWT written to httpOnly cookie (managed by NextAuth)

─── Every subsequent API route ────────────────────────────────────────
  getServerSession(authOptions)  →  reads cookie → verifies JWT → session
  !session?.user                 →  401
  (session.user as any).id       →  identity used for ownership checks
```

### Authentication — FastAPI

```
Client
  POST /api/auth/login  { email, password }
        │
        ▼
  routers/auth.py:19  login(credentials, db)
        │
        ▼
  services/auth_service.py:28  authenticate_user(db, email, password)
    ├─ db.query(User).filter(User.email == email).first()
    ├─ not found → HTTPException 401
    ├─ verify_password(plain, user.password_hash)  [passlib/bcrypt]
    └─ wrong → HTTPException 401
        │
        ▼
  services/auth_service.py:41  generate_token(user)
    └─ create_access_token({"sub": str(user.id)})
         utils/security.py:24  jwt.encode(payload, SECRET_KEY)  [python-jose]
        │
        ▼
  return Token(access_token, token_type="bearer", user)

─── Every subsequent request ──────────────────────────────────────────
  Depends(get_current_user)
    utils/security.py:32  oauth2_scheme extracts Bearer token
    jwt.decode(token, SECRET_KEY) → sub → user_id
    db.query(User).filter(User.id == user_id).first()
    → User ORM object injected into handler
```

### Task Creation — Next.js

```
Browser (authenticated, session cookie present)
  POST /api/tasks  { title, projectId, assigneeId?, status?, priority? }
        │
        ▼
  app/api/tasks/route.ts:75  POST handler
    ├─ :77  getServerSession(authOptions) → 401 if null
    ├─ :83  req.json()
    ├─ :84  taskSchema.parse(body)          Zod → ZodError → 400
    ├─ :86  prisma.task.create({ data, include: { assignee, project } })
    │         ⚠ no projectId ownership check before insert (intentional gap)
    ├─ :106 task.assigneeId? → notifyTaskAssigned({ actorId, taskId, assigneeId })
    ├─ :113 task.status === "DONE"? → notifyTaskCompleted({ actorId, taskId })
    └─ :117 NextResponse.json(task, { status: 201 })
```

### Task Creation — FastAPI

```
Client (authenticated, Bearer token in Authorization header)
  POST /api/tasks  { title, project_id, assignee_id?, status?, priority? }
        │
        ▼
  routers/tasks.py:22  create_new_task(task_data, current_user, db)
    ├─ Depends(get_current_user) → 401 if invalid token
    ├─ TaskCreate Pydantic validation → 422 on invalid input
        │
        ▼
  services/task_service.py:31  create_task(db, task_data, user)
    ├─ :34  db.query(Project).filter(Project.id == task_data.project_id).first()
    ├─ :35  not found OR project.owner_id != user.id → ForbiddenException 403
    ├─ :38  Task(**task_data.model_dump())
    ├─ :39  db.add(task); db.commit(); db.refresh(task)
    ├─ :43  task.assignee_id? → notification_service.notify_task_assigned(db, user, task)
    │          :43  skip if assignee == actor
    │          :45  _create(Notification, TASK_ASSIGNED) — best-effort, rolls back on error
    └─ :45  task.status == DONE? → notification_service.notify_task_completed(db, user, task)
               :55  notifies assignee + project owner, excludes actor
        │
        ▼
  Pydantic response_model=Task serialization → 201
```

### Notification side-effect flow

```
task_service.create_task() or update_task()
  └─► notification_service.notify_task_assigned(db, actor, task)
        skip if assignee_id is None or assignee == actor
        _create(Notification, type=TASK_ASSIGNED, user_id=assignee_id, ...)
              best-effort: try/except + db.rollback() — never fails the parent request

  └─► notification_service.notify_task_completed(db, actor, task)
        recipients = {assignee_id, project.owner_id} - {actor.id}
        _create(Notification, type=TASK_COMPLETED, ...) for each recipient
```

---

## External Dependencies

### Next.js Track

| Package | Role |
|---|---|
| `next` 15 | Framework, App Router, SSR, API route handlers |
| `next-auth` v4 | Session management, Credentials provider, JWT cookie |
| `@prisma/client` + `prisma` 5 | ORM + schema sync (`db push` — no migrations folder) |
| `bcryptjs` | Password hashing (register) and verification (login) |
| `zod` | Runtime request body validation in every API route |
| `@radix-ui/*` | Headless UI primitives: Dialog, Select, DropdownMenu, Toast, Label |
| `tailwindcss` + `clsx` / `tailwind-merge` / `cva` | Styling + conditional class utilities |
| `lucide-react` | Icon set |
| Jest + React Testing Library | Unit and component tests (jsdom environment) |

### FastAPI Track

| Package | Role |
|---|---|
| `fastapi` 0.115+ | HTTP framework, dependency injection, OpenAPI generation |
| `uvicorn[standard]` | ASGI server |
| `sqlalchemy` 2.0 | ORM, declarative mapped columns |
| `alembic` | Versioned database migrations (autogenerate workflow) |
| `pydantic` v2 + `pydantic-settings` | Request/response validation, `.env` config loading |
| `python-jose[cryptography]` | JWT encode/decode |
| `passlib[bcrypt]` + `bcrypt<4.0` | Password hashing |
| `python-multipart` | Form data parsing (OAuth2 login form) |
| `pytest` + `pytest-asyncio` + `httpx` | Test suite with async support and in-process HTTP client |
| `ruff` | Linting + import sorting |

---

## Module Dependency Map

### Next.js

```
lib/db.ts                  (no internal imports — Prisma singleton)
  └─► lib/auth.ts          (Prisma User lookup in authorize())
        └─► app/api/auth/* (NextAuth route handlers)
  └─► app/api/**           (all route handlers import prisma from lib/db)

lib/types.ts               (re-exports @prisma/client types + string-literal unions)
  └─► components/*.tsx     (union types: TaskStatus, Priority, Role, etc.)
  └─► some route handlers  (TaskWithDetails, ProjectWithTasks, etc.)

components/ui/*            (shadcn primitives — no internal imports)
  └─► components/*.tsx     (feature components: task-board, task-card, etc.)
        └─► app/(pages)/** (page components import feature components)

app/layout.tsx             (imports SessionProvider from next-auth, Toaster)
```

Import rules enforced by convention:
- Components import model types from `@prisma/client` directly, not from `lib/types`
- `lib/types` is for union types and detail-augmented types only
- Nothing outside `lib/db.ts` instantiates `PrismaClient`

### FastAPI

```
app/config.py              (no app imports — pydantic-settings, reads .env)
app/database.py            (no app imports — defines Base, SessionLocal, get_db)

app/models/*.py            ──► app/database.py  (Base, mapped_column)

app/schemas/*.py           ──► pydantic only    (no app imports)

app/utils/exceptions.py    (no imports — pure exception classes)

app/utils/security.py      ──► app/config.py
                           ──► app/database.py  (get_db dependency)
                           ──► app/models/user.py

app/services/*.py          ──► app/models/*
                           ──► app/schemas/*
                           ──► app/utils/exceptions.py
                           ──► (task_service also imports notification_service)

app/routers/*.py           ──► app/services/*
                           ──► app/schemas/*
                           ──► app/utils/security.py  (get_current_user)
                           ──► app/database.py         (get_db)

app/main.py                ──► app/routers/*
                           ──► app/config.py
```

Dependency order (most foundational → most downstream):
```
config.py, database.py
  └─► models/*
        └─► utils/security.py
              └─► services/*
                    └─► (task_service ──► notification_service)
                    └─► routers/*
                          └─► main.py
```

One notable cross-service dependency: `task_service` calls `notification_service` on create/update mutations. All other services are independent.

---

## Key Asymmetries Between Tracks

| Concern | Next.js | FastAPI |
|---|---|---|
| Auth token carrier | httpOnly cookie (NextAuth JWT) | Authorization: Bearer header |
| Identity in handler | `(session.user as any).id` — threaded through jwt+session callbacks | `current_user` — resolved by `Depends(get_current_user)` |
| Input validation | Zod `.parse()` → 400 `ZodError` | Pydantic schema → 422 auto-generated |
| Project ownership on task create | **Not checked** — any authed user can attach to any `projectId` | **Explicit** — `project.owner_id != user.id` → 403 before insert |
| Business logic location | Inline in route handlers | Dedicated `services/` layer |
| Notification on failure | Unhandled — exception bubbles to generic 500 catch | `_create()` wraps in try/except + rollback — best-effort |
| Status/priority storage | Plain `String` column (Zod-validated only) | SQLAlchemy `Enum` backed by Python `enum.Enum` |
| ID wire type | `string` (cuid) | `int` (auto-increment) |

The ownership gap in the Next.js track and the inline business logic in some route handlers are intentional imperfections — they exist as teaching material for the Claude Code Tutorial Series.
