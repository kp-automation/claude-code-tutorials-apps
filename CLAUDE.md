# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What TaskForge Is

A lightweight Linear/Jira-style project management tool. A signed-in user creates **projects**, fills them with **tasks** that move across a three-column kanban board (TODO → IN_PROGRESS → DONE), assigns each task to a teammate with a priority (LOW/MEDIUM/HIGH/URGENT), tags tasks with project-scoped colored **labels**, and discusses them in a per-task **comment** thread. Auth is email/password with three roles (ADMIN, MEMBER, VIEWER). The landing page is a dashboard with task counts by status and recent activity.

Concretely the app surfaces: login/register pages, a dashboard, a project list and project detail/kanban view, task create/edit dialogs with assignee + priority + labels, and a comment thread on each task. The Next.js track ships the full UI (including dark mode via Tailwind class strategy); the FastAPI track ships the same features as a JSON API with auto-generated OpenAPI docs at `/docs` and `/redoc`.

## Repository Layout

Shipped as **two parallel implementations** that share the same data model, feature set, and HTTP API contract:

- `nextjs/` — Next.js 15 (App Router) full-stack app, TypeScript, Prisma + SQLite, NextAuth
- `fastapi/` — Python 3.12+ FastAPI backend, SQLAlchemy 2.0 + Alembic, JWT auth

When making changes that affect both tracks (e.g. data model, API shape, seed credentials), keep them in sync. A change to one track's API contract usually needs the matching change in the other.

The repo is the companion project for the Claude Code Tutorial Series. Both READMEs explicitly call out **intentional imperfections** left in place for teaching: inconsistent error handling, duplicated fetch logic, sparse tests, missing validations, mixed query styles. Don't treat these as bugs to fix opportunistically — only address them when the user asks, and only in the scope they request.

## Directory Structure

```
taskforge/
├── nextjs/                       # Next.js 15 full-stack track
│   ├── app/                      # App Router — pages and API routes colocated
│   │   ├── api/                  # Route handlers (route.ts files)
│   │   │   ├── auth/             # NextAuth [...nextauth] + register
│   │   │   ├── projects/         # /api/projects, /[id], /[id]/labels, /[id]/tasks
│   │   │   ├── tasks/            # /api/tasks, /[id]
│   │   │   ├── comments/         # /api/comments, /[id]
│   │   │   ├── notifications/    # /api/notifications, /[id]/read, /read-all, /unread-count
│   │   │   └── widgets/          # /api/widgets, /[id]
│   │   ├── auth/                 # /auth/login, /auth/register pages
│   │   ├── projects/             # Project list page + /[id] kanban detail page
│   │   ├── layout.tsx            # Root layout (session provider, toaster)
│   │   ├── page.tsx              # Dashboard landing page
│   │   └── globals.css           # Tailwind base + design tokens
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui primitives (button, dialog, etc.)
│   │   └── *.tsx                 # Feature components: task-board, task-card,
│   │                             # project-list, comment-thread, notification-bell
│   ├── lib/                      # Shared modules — import from here
│   │   ├── db.ts                 # Singleton Prisma client (DO NOT new up)
│   │   ├── auth.ts               # NextAuth options + getServerSession helper
│   │   ├── types.ts              # Canonical status/priority/role unions
│   │   └── utils.ts              # cn() classname helper
│   ├── prisma/
│   │   ├── schema.prisma         # Authoritative schema for this track
│   │   └── seed.ts               # `npm run seed` entry point (tsx)
│   ├── tests/
│   │   ├── components/           # React Testing Library specs
│   │   └── lib/                  # Pure-module unit tests
│   ├── jest.config.js            # jsdom env, path alias @/* → ./, setupFilesAfterFramework
│   └── jest.setup.js             # Imports @testing-library/jest-dom matchers
│
├── fastapi/                      # FastAPI backend track
│   ├── app/
│   │   ├── main.py               # App factory, CORS, router registration
│   │   ├── config.py             # pydantic-settings loader (.env)
│   │   ├── database.py           # Engine, SessionLocal, get_db dependency
│   │   ├── seed.py               # `python -m app.seed` entry point
│   │   ├── models/               # SQLAlchemy ORM (one model per file)
│   │   ├── schemas/              # Pydantic v2 request/response models
│   │   ├── routers/              # HTTP layer — thin, delegates to services
│   │   ├── services/             # Business logic — put cross-cutting code here
│   │   ├── repositories/         # Repository class layer (tasks only — see note in Architecture)
│   │   └── utils/                # JWT, password hashing, exception types
│   ├── alembic/
│   │   ├── versions/             # Auto-generated migrations (don't hand-edit)
│   │   └── env.py
│   ├── tests/                    # pytest + httpx; conftest.py overrides get_db
│   ├── pyproject.toml            # Dev extras under [project.optional-dependencies]
│   └── Makefile                  # Wraps install/dev/seed/run/migrate/test
│
├── ARCHITECTURE.md               # Component diagram, data-flow traces, dependency map
└── CLAUDE.md                     # This file
```

Key conventions:
- **Next.js**: anything imported across pages/routes lives in `lib/`; never instantiate `PrismaClient` outside `lib/db.ts`.
- **FastAPI**: routers stay thin; new logic lands in `services/`. ORM models (`models/`) and Pydantic schemas (`schemas/`) are deliberately separate.
- The `nextjs/prisma/schema.prisma` and `fastapi/app/models/*.py` are the two authoritative schema definitions — keep their entities, fields, and cascade rules aligned.

## Commands

Both tracks are self-contained: `cd nextjs/` or `cd fastapi/` first, then run.

### Next.js (`cd nextjs`)

**First-time setup**
```bash
cp .env.example .env         # set DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
npm install                  # postinstall hook runs `prisma generate`
npx prisma db push           # create/sync SQLite schema (no migrations folder)
npm run seed                 # seed users, projects, tasks (runs prisma/seed.ts via tsx)
```

**Daily dev loop**
```bash
npm run dev                  # http://localhost:3000, hot reload
npm run build                # production build (also type-checks)
npm run start                # serve the production build
npm run lint                 # ESLint via eslint-config-next
```

**Testing** (Jest + React Testing Library, jsdom env)
```bash
npm test                                 # full suite
npm run test:watch                       # watch mode
npx jest tests/components/foo.test.tsx   # single file
npx jest -t "matches description"        # single test by name pattern
```

`jest.setup.js` runs after the framework initializes and imports `@testing-library/jest-dom`, making matchers like `toBeInTheDocument()` available globally. The `@/*` path alias is wired in `jest.config.js` via `moduleNameMapper`.

**Database**
```bash
npx prisma db push           # apply schema.prisma changes (dev workflow — no migrations dir)
npx prisma generate          # regenerate the client after schema edits (also runs postinstall)
npx prisma studio            # GUI at http://localhost:5555
rm prisma/dev.db             # nuke and recreate from scratch (then db push + seed)
```
Note: there is no `prisma migrate` workflow here. Schema changes are pushed directly. Don't introduce a migrations folder unless asked.

There are also `npm run db:push` and `npm run db:seed` aliases in `package.json`, but `db:seed` uses an older `node --loader ts-node/esm` invocation — prefer `npm run seed` (tsx-based, the one that works).

### FastAPI (`cd fastapi`)

Requires Python ≥ 3.12 (from `pyproject.toml`).

**First-time setup**
```bash
cp .env.example .env             # set SECRET_KEY; CORS origins via settings.cors_origins_list
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"          # dev extras: pytest, pytest-asyncio, httpx, ruff
alembic upgrade head             # apply migrations (creates taskforge.db)
python -m app.seed               # seed admin/alice/bob/viewer users + sample data
```

**Daily dev loop**
```bash
uvicorn app.main:app --reload    # http://localhost:8000, docs at /docs, redoc at /redoc
ruff check app                   # lint (line-length 100, rules E,F,I; E501 ignored)
ruff check --fix app             # autofix where possible
```

**Testing** (pytest, asyncio_mode=auto, httpx TestClient; conftest.py overrides `get_db`)
```bash
pytest                                       # full suite
pytest -v                                    # verbose (what `make test` uses)
pytest tests/test_tasks.py                   # single file
pytest tests/test_tasks.py::test_name        # single test
pytest -k "create"                           # by keyword expression
pytest --cov=app --cov-report=html           # coverage → htmlcov/index.html
```

`tests/conftest.py` provides four fixtures every test file can use:
- `db` — fresh `test.db` SQLite session; schema is created before and dropped after each test
- `client` — `TestClient` with `get_db` overridden to use the test session
- `test_user` — a seeded `MEMBER` user (`test@example.com` / `testpass123`)
- `auth_headers` — `{"Authorization": "Bearer <token>"}` obtained by POSTing to `/api/auth/login`

**Database & migrations** (Alembic, autogenerate workflow)
```bash
alembic upgrade head                                  # apply pending migrations
alembic revision --autogenerate -m "describe change"  # after editing app/models/*.py
alembic downgrade -1                                  # roll back one revision
alembic history                                       # show revision graph
rm taskforge.db && alembic upgrade head && python -m app.seed   # full reset
```
Always autogenerate migrations after model changes — don't hand-edit `app/models/` without a matching revision in `alembic/versions/`.

**Makefile shortcuts** (wrap the most common targets):
```
make install     # pip install -e .
make dev         # pip install -e ".[dev]"
make seed        # python -m app.seed
make run         # uvicorn app.main:app --reload
make migrate     # alembic upgrade head
make test        # pytest -v
make test-cov    # pytest with html + term coverage
make clean       # remove __pycache__, .pytest_cache, htmlcov, *.egg-info, taskforge.db, test.db
```

### Cross-track

When changing the data model or API contract, run both tracks' setup-and-test loops:
```bash
(cd nextjs && npx prisma db push && npm test)
(cd fastapi && alembic revision --autogenerate -m "..." && alembic upgrade head && pytest)
```

## Architecture

> For the full component diagram, data-flow traces (auth + task creation), external dependency tables, and module dependency map, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Shared data model

Both tracks model the same core entities. Authoritative schemas:

- Next.js: `nextjs/prisma/schema.prisma`
- FastAPI: `fastapi/app/models/*.py` (one model per file)

**Entities and relationships:**

| Entity | Key fields | Notes |
|---|---|---|
| `User` | `id`, `email`, `password`, `name`, `role` | role: ADMIN / MEMBER / VIEWER |
| `Project` | `id`, `name`, `description`, `status`, `ownerId` | status: ACTIVE / ARCHIVED |
| `Task` | `id`, `title`, `description`, `status`, `priority`, `projectId`, `assigneeId` | status: TODO / IN_PROGRESS / DONE; priority: LOW / MEDIUM / HIGH / URGENT |
| `Comment` | `id`, `content`, `taskId`, `authorId` | |
| `Label` | `id`, `name`, `color`, `projectId` | project-scoped; joins Task via `TaskLabel` (many-to-many) |
| `Notification` | `id`, `userId` (recipient), `actorId` (who triggered it), `type`, `taskId`, `commentId`, `read` | type: TASK_ASSIGNED / TASK_COMPLETED / MENTION; `taskId` and `commentId` are optional FKs |
| `Widget` | `id`, `name`, `ownerId` | Tutorial resource used in the "add a new endpoint" exercise; not a real product feature |
| `Tag` | `id`, `name`, `color` | **FastAPI only** — joins Task via `task_tags` (many-to-many). No equivalent in the Next.js Prisma schema. This divergence is intentional teaching surface; don't add Tag to Next.js unless asked. |

Status/priority/role are stored as plain strings (not DB enums) in Next.js, and as SQLAlchemy `Enum` columns in FastAPI — keep literal values aligned across tracks. The TypeScript union types in `nextjs/lib/types.ts` are the canonical list.

Cascade rules matter: deleting a `Project` cascades to its tasks, labels, and comments; deleting a `User` cascades to owned projects but `SetNull` on assigned tasks. Preserve this behavior on both sides when editing schemas.

### Next.js track

- App Router under `nextjs/app/`. API handlers live in `app/api/<resource>/route.ts` (and `[id]/route.ts` for detail routes). UI pages are colocated under `app/projects/`, `app/auth/`, etc.
- `lib/db.ts` exports the singleton `prisma` client; always import from there rather than instantiating `PrismaClient` per route (Next.js dev hot-reload will leak connections otherwise).
- `lib/auth.ts` configures NextAuth with the Credentials provider and JWT sessions. The JWT/session callbacks copy `id` and `role` onto the token/session — read user identity via `getServerSession(authOptions)` in API routes.
- `lib/types.ts` re-exports Prisma model types and defines the string-literal unions for status/priority/role. New status values must be added here and in the Prisma schema's defaults.
- UI: Tailwind + shadcn/ui primitives in `components/ui/`, feature components (`task-board.tsx`, `task-card.tsx`, `project-list.tsx`, `comment-thread.tsx`) at the top of `components/`. Dark mode is toggled via a `class` on `<html>` (Tailwind class strategy, configured in `tailwind.config.ts`).
- Tests: Jest + React Testing Library, configured by `jest.config.js`. Tests live under `tests/components/` and `tests/lib/`.

### FastAPI track

Layered architecture: **router → service → model**.

- `app/main.py` builds the FastAPI app, mounts CORS, and includes the six routers (`auth`, `projects`, `tasks`, `comments`, `notifications`, `widgets`).
- `app/routers/*.py` — HTTP layer: dependency-inject the DB session and current user, validate via Pydantic schemas, delegate to services. Some routes do logic inline (intentional inconsistency — see imperfections note above).
- `app/services/*.py` — business logic. `auth_service`, `project_service`, `task_service`. New cross-cutting logic belongs here, not in routers.
- `app/repositories/` — repository class layer that currently exists for `Task` only (intentional inconsistency — teaching surface). `TaskRepository` wraps the same ownership-scoped queries as `task_service` but in a class-based style. Don't extend the repository pattern to other resources unless asked.
- `app/schemas/` — Pydantic v2 request/response models. Keep these distinct from `app/models/` SQLAlchemy ORM classes.
- `app/utils/` — auth helpers (JWT encode/decode, password hashing via passlib bcrypt) and exception types.
- `app/database.py` — engine, `SessionLocal`, and the `get_db` dependency.
- `app/config.py` — Pydantic-settings loader; reads `.env`.
- Migrations in `alembic/versions/`. After editing a model, generate a new revision rather than editing the schema by hand.
- Tests use `tests/conftest.py` fixtures — see the conftest summary in *Commands → FastAPI → Testing* above.

### Cross-track API contract

Endpoints under `/api/...` mirror each other. When adding a route, implement it in both tracks with matching path, method, request/response shape, and status codes. The FastAPI README's "API Endpoints" section is the most explicit listing of the contract.

## Coding Conventions

These are patterns observed in the existing code — match them when extending either track.

### Cross-track

- **ID types differ.** Next.js uses string `cuid()` IDs everywhere; FastAPI uses integer auto-increment IDs (`Mapped[int]`, path params typed `task_id: int`). The HTTP contract is the same shape, but the wire type for `id` fields is `string` vs `int`. Don't try to unify these.
- **Status/priority storage also differs.** Next.js stores them as plain `String` columns (validated only at the zod layer). FastAPI uses real SQLAlchemy `Enum` columns backed by Python `enum.Enum` classes in `app/models/`. The literal string values still match across tracks, but adding a new value requires both a Prisma default update *and* a Python enum member.
- **Auth scoping is by ownership.** Both tracks filter list/detail queries by current-user ownership (`ownerId === session.user.id` / `Project.owner_id == user.id`). There is no role-based gating in the data layer despite the ADMIN/MEMBER/VIEWER roles existing — preserve this behavior unless the user explicitly asks for RBAC.
- **Some inconsistencies are intentional.** FastAPI routers contain literal `# Intentional inconsistency:` comments (e.g. `comments.py` mixes raw SQL `select()` with ORM `db.query()`). Don't "clean these up" without being asked.

### Next.js

- **Route handlers follow a fixed shape:** import `getServerSession` + `authOptions` + `prisma` + `z`; declare a zod schema at the top of the file; in each handler, run `getServerSession` → return 401 on null → `req.json()` → `schema.parse()` → Prisma call → return `NextResponse.json(...)`. Wrap in try/catch where `ZodError` → 400 and everything else → generic 500 with `{ error: "Internal server error" }`. No logging.
- **Reading user identity:** `(session.user as any).id` and `(session.user as any).role`. The cast is the established pattern because the NextAuth callbacks attach these via `as any` in `lib/auth.ts` — don't introduce a typed `Session` augmentation unless asked.
- **Prisma queries use explicit `include` + nested `select`** to project related-user fields. The recurring shape is `{ id: true, name: true, email: true }` for any User include; reuse it rather than picking different field sets.
- **Component conventions:** every component file starts with `"use client";` (no Server Components are used). Props are an inline `interface XProps`. Types come from `@prisma/client` directly in components, *not* `@/lib/types` (lib/types is for non-Prisma unions and detail-augmented types). Use the `@/*` path alias for all internal imports.
- **Tailwind:** `cn()` from `lib/utils.ts` is available but not universally used — direct template-string class composition is also fine. Match the surrounding file.

### FastAPI

- **Router → service → model is strict for tasks/projects but partial for auth/comments.** When extending `tasks.py` or `projects.py`, put logic in the matching service. Comment and auth routers do some logic inline; that's the intentional-inconsistency surface.
- **Services raise; routers don't catch.** Custom exceptions from `app/utils/exceptions.py` (`NotFoundException`, `ForbiddenException`) bubble up to FastAPI exception handlers — do not wrap service calls in try/except.
- **Service signatures take `db: Session` first**, then domain args, then `user: User` last. List/get functions filter via `.join(Project).filter(Project.owner_id == user.id)` for access control on every read.
- **Pydantic schemas live in `app/schemas/` and are distinct from ORM models in `app/models/`.** The pattern per resource is `<Resource>Base` (shared fields) → `<Resource>Create` (adds required FK) → `<Resource>Update` (all fields optional for PATCH-like behavior) → `<Resource>` (response, with `model_config = ConfigDict(from_attributes=True)`).
- **Updates use `model_dump(exclude_unset=True)`** so unspecified fields don't clobber existing values.
- **Naming:** snake_case files; routers plural (`tasks.py`), services suffixed `_service.py`, models singular (`task.py`). Each router declares `router = APIRouter(prefix="/api/<resource>", tags=["<resource>"])`.

## Common Patterns

Skeletons for the recurring shapes — copy these when adding a new resource. Real examples live in `nextjs/app/api/projects/route.ts`, `nextjs/app/api/projects/[id]/route.ts`, and `fastapi/app/routers/projects.py` + `fastapi/app/services/project_service.py`.

### Next.js — list + create route (`app/api/<resource>/route.ts`)

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const widgetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const widgets = await prisma.widget.findMany({
      where: { ownerId: (session.user as any).id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(widgets);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = widgetSchema.parse(body);

    const widget = await prisma.widget.create({
      data: { ...data, ownerId: (session.user as any).id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(widget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Why each piece is there:
- `getServerSession(authOptions)` + null check → uniform 401.
- Zod schema declared at file top; `.parse()` throws `ZodError` → uniform 400.
- `where: { ownerId: ... }` is the access-control gate on lists; never return rows the caller doesn't own.
- `include` with nested `select: { id, name, email }` is the canonical user projection — reuse it.
- Single try/catch wraps the whole handler. Generic 500 with no logging matches the rest of the codebase.

### Next.js — detail route (`app/api/<resource>/[id]/route.ts`)

```ts
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }   // Next.js 15: params is async
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;                     // must await
    const data = widgetUpdateSchema.parse(await req.json());

    const widget = await prisma.widget.findUnique({ where: { id } });
    if (!widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }
    if (widget.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.widget.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Detail-route specifics:
- Second arg is `{ params: Promise<{ id: string }> }` and you must `await params` (Next.js 15 App Router).
- For mutations, the order is: **fetch → 404 if missing → 403 if not owner → mutate**. Don't try to combine the ownership check into the update's `where` clause; the convention is the explicit two-step.
- DELETE returns `{ success: true }` (not 204) — match the existing tracks.

### FastAPI — router (`app/routers/<resource>.py`)

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.widget import Widget, WidgetCreate, WidgetUpdate
from app.services.widget_service import (
    get_widgets, get_widget, create_widget, update_widget, delete_widget,
)
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/widgets", tags=["widgets"])


@router.get("", response_model=list[Widget])
def list_widgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_widgets(db, current_user)


@router.post("", response_model=Widget, status_code=status.HTTP_201_CREATED)
def create_new_widget(
    widget_data: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_widget(db, widget_data, current_user)


@router.get("/{widget_id}", response_model=Widget)
def get_widget_by_id(
    widget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_widget(db, widget_id, current_user)


@router.put("/{widget_id}", response_model=Widget)
def update_widget_by_id(
    widget_id: int,
    widget_data: WidgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_widget(db, widget_id, widget_data, current_user)


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget_by_id(
    widget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_widget(db, widget_id, current_user)
    return None
```

Router specifics:
- Routers are thin: every endpoint just calls a service function. Don't add try/except — exceptions from the service layer (`NotFoundException`, `ForbiddenException`) bubble up to FastAPI handlers.
- `Depends(get_current_user)` and `Depends(get_db)` are always present; `current_user` ahead of `db` by convention.
- DELETE uses `status.HTTP_204_NO_CONTENT` and returns `None`. POST uses `status.HTTP_201_CREATED`.
- Register the router in `app/main.py` with `app.include_router(widgets_router)`.

### FastAPI — service (`app/services/<resource>_service.py`)

```python
from sqlalchemy.orm import Session
from app.models.widget import Widget
from app.models.user import User
from app.schemas.widget import WidgetCreate, WidgetUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_widgets(db: Session, user: User) -> list[Widget]:
    return db.query(Widget).filter(Widget.owner_id == user.id).all()


def get_widget(db: Session, widget_id: int, user: User) -> Widget:
    widget = (
        db.query(Widget)
        .filter(Widget.id == widget_id, Widget.owner_id == user.id)
        .first()
    )
    if not widget:
        raise NotFoundException("Widget not found")
    return widget


def create_widget(db: Session, widget_data: WidgetCreate, user: User) -> Widget:
    widget = Widget(**widget_data.model_dump(), owner_id=user.id)
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return widget


def update_widget(db: Session, widget_id: int, widget_data: WidgetUpdate, user: User) -> Widget:
    widget = get_widget(db, widget_id, user)
    for key, value in widget_data.model_dump(exclude_unset=True).items():
        setattr(widget, key, value)
    db.commit()
    db.refresh(widget)
    return widget


def delete_widget(db: Session, widget_id: int, user: User) -> None:
    widget = get_widget(db, widget_id, user)
    db.delete(widget)
    db.commit()
```

Service specifics:
- Signature is always `(db: Session, ...domain args, user: User)`. `db` first, `user` last.
- Access control happens *inside* the query (`filter(... owner_id == user.id)`) on every read.
- Updates: `model_dump(exclude_unset=True)` so untouched fields aren't clobbered.
- After mutations: `db.commit()` then `db.refresh(obj)` before returning.
- For nested resources (e.g. tasks under a project), join through the parent and filter on `Project.owner_id == user.id` — see `task_service.get_tasks` for the canonical example.

### FastAPI — schema (`app/schemas/<resource>.py`)

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class WidgetBase(BaseModel):
    name: str
    description: str | None = None


class WidgetCreate(WidgetBase):
    pass                                              # add required FKs here, e.g. project_id


class WidgetUpdate(BaseModel):                        # all fields optional for partial update
    name: str | None = None
    description: str | None = None


class Widget(WidgetBase):                             # response shape
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

The `Base → Create → Update → Response` chain is the established shape. Don't collapse it.

## Rules

Quick-reference do's and don'ts. Longer explanations live in *Coding Conventions* and *Common Patterns* above — these are the imperatives.

### Cross-track

**Do**
- Keep both tracks in sync when changing the data model, API contract, or seed credentials.
- Add new status/priority values in *both* `nextjs/prisma/schema.prisma` (default + zod enums) *and* `fastapi/app/models/<resource>.py` (Python `enum.Enum`), plus `nextjs/lib/types.ts`.
- Preserve cascade rules on schema edits: Project → cascade to tasks/labels/comments; User → cascade to ownedProjects, SetNull on assignedTasks.
- Scope every read by the current user's ownership (`ownerId` / `owner_id`).
- Run both tracks' test suites when changing shared shapes — see *Commands → Cross-track*.

**Don't**
- Fix the intentional imperfections (mixed query styles, sparse error handling, duplicated fetch logic, missing validations) without an explicit ask. They are teaching surface, not bugs.
- Unify the string-vs-int ID asymmetry between tracks. Next.js IDs are `cuid()` strings; FastAPI IDs are auto-increment ints. The HTTP shape is the same; the wire type is not.
- Add role-based gating in the data layer. Authorization is by ownership only, despite ADMIN/MEMBER/VIEWER existing on `User`.
- Commit secrets. `.env` files are local-only; both tracks ship `.env.example` as the template.

### Next.js

**Do**
- Import `prisma` from `@/lib/db` in every route and server module.
- Use `getServerSession(authOptions)` for auth, return 401 on null, read identity via `(session.user as any).id`.
- Declare a zod schema at the top of each route handler; let `ZodError` produce 400 and everything else produce a generic 500.
- For detail-route mutations: fetch → 404 if missing → 403 if not owner → mutate. Two-step, not a single combined query.
- `await params` in detail routes — Next.js 15 makes them `Promise<{ id: string }>`.
- Mark every component file `"use client";`.
- Use `npm run seed` (tsx-based). The `npm run db:seed` alias is broken.
- Use `npx prisma db push` for schema changes.

**Don't**
- `new PrismaClient()` anywhere outside `lib/db.ts` — dev hot-reload will leak connections.
- Add a `prisma/migrations/` folder. This track uses `db push`, not `migrate`.
- Introduce a typed `Session` augmentation; the `as any` cast is the established pattern.
- Import Prisma model types from `@/lib/types` in components — import from `@prisma/client` directly. `lib/types` is for unions and detail-augmented types only.
- Add logging or structured error reporting to API routes; the existing 500-with-no-logging shape is intentional.

### FastAPI

**Do**
- Put new logic in `app/services/<resource>_service.py`. Routers stay thin and delegate.
- Raise `NotFoundException` / `ForbiddenException` from `app/utils/exceptions.py` in services; let them bubble through routers untouched.
- Order service params as `(db: Session, ...domain args, user: User)`.
- Filter every read by ownership inside the query (`.filter(... owner_id == user.id)` or via `.join(Project)` for nested resources).
- Use `model_dump(exclude_unset=True)` for partial updates; commit *and* `db.refresh(obj)` after every mutation.
- Keep the `Base → Create → Update → Response` schema chain per resource. Response models set `model_config = ConfigDict(from_attributes=True)`.
- Run `alembic revision --autogenerate -m "..."` after editing any `app/models/*.py`.
- Register new routers via `app.include_router(...)` in `app/main.py`.

**Don't**
- Wrap service calls in try/except inside routers.
- Hand-edit files in `alembic/versions/`. Always autogenerate.
- Edit `app/models/*.py` without a matching migration revision.
- Collapse the `Base/Create/Update/Response` Pydantic chain into one class.
- Skip the `from_attributes=True` config on response schemas — it's required to serialize ORM objects.

## Security

### Claude Code safeguards

Three layers of protection are active whenever Claude Code runs in this repo.

**Permission model** (`.claude/settings.json` + `.claude/settings.local.json`)

Standard dev operations (tests, linting, Prisma, Alembic, local `curl`) run without prompting. The following operations are in the deny list and always require explicit approval:

- `git push --force` / `git push -f` — overwrites upstream history
- `git reset --hard` / `git clean -f` / `git restore .` — discards working-tree changes
- `rm -rf` — recursive deletion
- `rm prisma/dev.db` / `rm fastapi/taskforge.db` / `rm fastapi/test.db` — database nukes
- `alembic downgrade base` — full schema destruction

Add new allowances to `settings.local.json` for per-developer scope or `settings.json` for team-wide scope. Default to the narrowest pattern that covers the operation.

**Credential redaction** (`.claude/hooks/redact-credentials.py`)

A `PostToolUse` hook fires on every `Read` tool call and replaces credential values with `[REDACTED]` before they reach Claude's context. Covered patterns:

- `DATABASE_URL`, `DB_URL`, and database-specific variants (`POSTGRES_URL`, `MYSQL_URL`, etc.)
- `SECRET_KEY`, `NEXTAUTH_SECRET`, `JWT_SECRET`, and other signing-key names
- Any env var ending in `_PASSWORD`, `_SECRET`, `_API_KEY`, `_ACCESS_TOKEN`, or `_PRIVATE_KEY`
- Connection strings with embedded credentials: `postgresql://user:pass@host/db` → `postgresql://[REDACTED]:[REDACTED]@host/db`

Variable names and file structure are preserved so Claude can still reason about config layout.

**Audit logging** (`.claude/hooks/audit-log.py`)

A `PostToolUse` hook fires on every `Bash` and `Write` tool call and appends a JSONL entry to `.claude/logs/audit.log`. Each entry records the UTC timestamp, session ID prefix, tool name, and either the command run or the file path written. File content is never logged. The `error` field is set when `is_error` is true on the tool response. Log files are excluded from git via `.claude/logs/.gitignore`.

### Secrets management

- **Never commit `.env` files.** Both tracks ship `.env.example` as the only committed credential template. Copy it to `.env` locally and fill in real values.
- Generate `NEXTAUTH_SECRET` and `SECRET_KEY` independently per environment. Do not reuse the same value across dev, staging, and production.
- If a credential is accidentally committed, rotating it is the only fix. Adding a `.gitignore` entry does not remove it from history.
- The seed credentials below are local dev fixtures. They must never appear in a production `.env`.

### Application security invariants

These hold across both tracks and must be preserved on every contribution.

**Authentication — every route is gated**
- Next.js: call `getServerSession(authOptions)` at the top of every handler; return 401 immediately on null. No exceptions.
- FastAPI: every router function declares `current_user: User = Depends(get_current_user)`. Do not add unauthenticated endpoints without an explicit ask.
- Passwords are hashed with bcrypt (FastAPI: `passlib.hash.bcrypt`; Next.js: `bcryptjs`). Never store or log plaintext passwords. Never put password values in JWT payloads or session tokens.

**Authorization — ownership scoping is the only gate**
- Every read query is filtered to the current user's owned resources: `where: { ownerId: session.user.id }` (Next.js) / `.filter(... owner_id == user.id)` (FastAPI). Never return rows the caller doesn't own.
- Mutations follow the two-step pattern: fetch → 404 if missing → 403 if not owner → mutate. Do not collapse these into a single filtered update; the explicit check is the convention.
- ADMIN/MEMBER/VIEWER roles exist on `User` but do not gate any queries. Authorization is by ownership only. Do not add role-based checks to services or routers unless explicitly asked.

**Input validation — use the framework layer**
- Next.js: all user-supplied input passes through a Zod schema before reaching Prisma. `ZodError` returns 400. Do not call `prisma` with unvalidated request body fields.
- FastAPI: Pydantic v2 validates request bodies automatically via typed schema parameters. Do not accept `dict` or `Any` request bodies to bypass this.
- Never construct raw SQL from user input. Both tracks use their ORMs exclusively. The one exception is the intentional inconsistency in `fastapi/app/routers/comments.py`, which is scoped to non-user-controlled values.

**Error responses — no internal detail**
- Responses never include stack traces, file paths, ORM query strings, or database error messages.
- Next.js: unhandled exceptions return `{ error: "Internal server error" }` with status 500. Do not surface `error.message` in the response body.
- FastAPI: `NotFoundException` → 404, `ForbiddenException` → 403 via exception handlers; everything else → 500. Do not add try/except in routers that catch and re-serialize exceptions.
- Do not add logging to route handlers. The no-logging shape avoids leaking sensitive request data to log aggregators and is intentional.

## Seed credentials

### Next.js

| Email | Password | Role |
|---|---|---|
| `alice@example.com` | `password123` | ADMIN |
| `bob@example.com` | `password123` | MEMBER |
| `charlie@example.com` | `password123` | VIEWER |

### FastAPI

| Email | Password | Role |
|---|---|---|
| `admin@taskforge.com` | `admin123` | ADMIN |
| `alice@taskforge.com` | `alice123` | MEMBER |
| `bob@taskforge.com` | `bob123` | MEMBER |
| `viewer@taskforge.com` | `viewer123` | VIEWER |

Note that the two tracks use different email domains and different passwords — don't assume a credential from one track works in the other.
