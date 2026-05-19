---
name: add-api-endpoint
description: Add a new API endpoint to both the Next.js and FastAPI tracks of TaskForge, following project conventions for auth, ownership scoping, error handling, and test coverage.
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
---

# Add API Endpoint Skill

Add a complete CRUD endpoint to **both** tracks (Next.js + FastAPI). The two tracks share the same HTTP contract — matching paths, methods, request/response shapes, and status codes — but diverge in implementation details.

Derive these values from the resource name provided (singular noun, e.g. `widget`):

| Variable | Derivation | Example |
|---|---|---|
| `RESOURCE` | argument as-is | `widget` |
| `RESOURCE_PLURAL` | append `s` (adjust if irregular) | `widgets` |
| `RESOURCE_CLASS` | PascalCase | `Widget` |

---

## Goal

Produce a working, tested, correctly-wired endpoint for `RESOURCE_PLURAL` in both tracks. "Working" means: authenticated requests succeed, unauthenticated requests get 401, wrong-owner requests get 403/404, and both test suites pass.

---

## Constraints

These are non-negotiable project conventions. Violating any of them will cause silent bugs or divergence between tracks.

### Cross-track

- **Both tracks or neither.** Never implement in only one track unless the user explicitly says so. The HTTP contract (path, method, status codes, field names) must match.
- **ID types differ by design — do not unify them.** Next.js uses `cuid()` strings; FastAPI uses auto-increment integers. The wire shape is the same; the type is not.
- **Ownership gates every read.** Filter all list and detail queries by the current user's ownership (`ownerId` in Prisma, `owner_id` in SQLAlchemy). Never return rows the caller doesn't own.
- **No role-based gating.** ADMIN/MEMBER/VIEWER exist on `User` but are not enforced in the data layer. Ownership is the only access control — preserve this.
- **Do not fix intentional imperfections** (mixed query styles, sparse error handling in `comments.py`/`auth.py`). Only touch the scope of the new resource.

### Next.js constraints

- Import `prisma` from `@/lib/db` — never `new PrismaClient()`.
- `getServerSession(authOptions)` → null check → 401. No other auth pattern.
- Read user identity with `(session.user as any).id`. Do not introduce a typed Session augmentation.
- Zod schema at file top; `ZodError` → 400; everything else → generic 500 with `{ error: "Internal server error" }`. No logging.
- Detail routes: `params` is `Promise<{ id: string }>` in Next.js 15 — you **must** `await params`.
- Detail mutations follow the two-step pattern: **fetch → 404 if missing → 403 if wrong owner → mutate**. Do not fold ownership into the update's `where` clause.
- DELETE returns `{ success: true }` (not 204 and not empty body) — this is the established Next.js pattern.
- Every component file starts with `"use client"` — not relevant for API routes, but don't add Server Components.
- Mark all component files `"use client"`.
- `include` nested user fields with `{ select: { id: true, name: true, email: true } }` — the canonical projection.

### FastAPI constraints

- **Router → service → model is strict.** Routers stay thin; all logic lives in `app/services/RESOURCE_service.py`. Do not put query logic in routers.
- Service signature: `(db: Session, ...domain args, user: User)` — `db` first, `user` last.
- Raise `NotFoundException` / `ForbiddenException` from `app/utils/exceptions.py`. Do not wrap service calls in try/except inside routers — exceptions bubble up.
- Pydantic schema chain: `RESOURCECLASSBase` → `RESOURCECLASSCreate` → `RESOURCECLASSUpdate` → `RESOURCECLASS` (response). Do not collapse.
- Response schema requires `model_config = ConfigDict(from_attributes=True)` — without it, ORM objects won't serialize.
- Updates: `model_dump(exclude_unset=True)` to avoid clobbering unset fields.
- After every mutation: `db.commit()` then `db.refresh(obj)` before returning.
- **Router registration is mandatory.** A router file without a matching `include_router` in `app/main.py` is dead code that silently returns 404.
- DELETE returns `None` with `status_code=status.HTTP_204_NO_CONTENT`. POST uses `status_code=status.HTTP_201_CREATED`.
- If the resource has a new DB table: run `alembic revision --autogenerate -m "add RESOURCE table"`, verify the generated `upgrade()` is non-empty, then `alembic upgrade head`.

---

## Step-by-step

### Step 1 — Prisma model (Next.js)

Add the model to `nextjs/prisma/schema.prisma`. Standard shape for an owner-scoped resource:

```prisma
model Widget {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Then apply: `cd nextjs && npx prisma db push && npx prisma generate`

### Step 2 — SQLAlchemy model (FastAPI)

Create `fastapi/app/models/RESOURCE.py`:

```python
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    owner = relationship("User", back_populates="widgets")
```

Register it in `fastapi/app/models/__init__.py` (import + `__all__` entry). Also add the name to the explicit import in `alembic/env.py` for clarity.

Then generate and apply the migration:
```bash
cd fastapi
alembic revision --autogenerate -m "add widgets table"
# open the generated file — confirm upgrade() has op.create_table(...)
alembic upgrade head
```

### Step 3 — Pydantic schemas (FastAPI)

Create `fastapi/app/schemas/RESOURCE.py`:

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class WidgetBase(BaseModel):
    name: str
    # add shared fields here


class WidgetCreate(WidgetBase):
    pass  # add required FK fields (e.g. project_id: int) if nested under another resource


class WidgetUpdate(BaseModel):
    name: str | None = None
    # mirror WidgetBase fields, all optional


class Widget(WidgetBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

### Step 4 — FastAPI service

Create `fastapi/app/services/RESOURCE_service.py`:

```python
from sqlalchemy.orm import Session
from app.models.RESOURCE import Widget
from app.models.user import User
from app.schemas.RESOURCE import WidgetCreate, WidgetUpdate
from app.utils.exceptions import NotFoundException


def get_widgets(db: Session, user: User) -> list[Widget]:
    return db.query(Widget).filter(Widget.owner_id == user.id).all()


def get_widget(db: Session, widget_id: int, user: User) -> Widget:
    item = (
        db.query(Widget)
        .filter(Widget.id == widget_id, Widget.owner_id == user.id)
        .first()
    )
    if not item:
        raise NotFoundException("Widget not found")
    return item


def create_widget(db: Session, data: WidgetCreate, user: User) -> Widget:
    item = Widget(**data.model_dump(), owner_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_widget(db: Session, widget_id: int, data: WidgetUpdate, user: User) -> Widget:
    item = get_widget(db, widget_id, user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_widget(db: Session, widget_id: int, user: User) -> None:
    item = get_widget(db, widget_id, user)
    db.delete(item)
    db.commit()
```

For resources nested under a project (e.g. tasks), join through the parent and filter on `Project.owner_id == user.id` — see `fastapi/app/services/task_service.py` for the canonical pattern.

### Step 5 — FastAPI router

Create `fastapi/app/routers/RESOURCE_PLURAL.py`:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.RESOURCE import Widget, WidgetCreate, WidgetUpdate
from app.services.RESOURCE_service import (
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
    data: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_widget(db, data, current_user)


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
    data: WidgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_widget(db, widget_id, data, current_user)


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget_by_id(
    widget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_widget(db, widget_id, current_user)
    return None
```

### Step 6 — Register the FastAPI router

Open `fastapi/app/main.py`. Two edits are required — **both must be present**:

```python
# 1. Add to the imports line
from app.routers import auth, projects, tasks, comments, notifications, RESOURCE_PLURAL

# 2. Add include_router call
app.include_router(RESOURCE_PLURAL.router)
```

A router file without `include_router` silently returns 404 on every request. Verify registration:
```bash
grep "RESOURCE_PLURAL" fastapi/app/main.py
```

### Step 7 — Next.js list+create route

Create `nextjs/app/api/RESOURCE_PLURAL/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const widgetCreateSchema = z.object({
  name: z.string().min(1),
  // add fields matching your Prisma model
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.widget.findMany({
      where: { ownerId: (session.user as any).id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
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
    const data = widgetCreateSchema.parse(body);

    const item = await prisma.widget.create({
      data: { ...data, ownerId: (session.user as any).id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Step 8 — Next.js detail route

Create `nextjs/app/api/RESOURCE_PLURAL/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const widgetUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  // add optional fields
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const item = await prisma.widget.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!item) return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    if (item.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const data = widgetUpdateSchema.parse(await req.json());

    const item = await prisma.widget.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    if (item.ownerId !== (session.user as any).id) {
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const item = await prisma.widget.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    if (item.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.widget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Step 9 — Tests

**Next.js** — create `nextjs/tests/api/RESOURCE_PLURAL.test.ts`. Mock `next-auth` and `@/lib/db`. Cover: unauthenticated GET/POST return 401; invalid POST body returns 400; authenticated GET returns 200; wrong-owner PATCH/DELETE returns 403.

**FastAPI** — create `fastapi/tests/test_RESOURCE_PLURAL.py`. Use the `client` and `auth_headers` fixtures from `conftest.py`. Cover: unauthenticated list returns 401; create returns 201 with correct shape; get-by-id returns 200; update changes field; delete returns 204; unknown ID returns 404.

### Step 10 — Run both test suites

```bash
cd nextjs && npm test -- --testPathPattern=RESOURCE_PLURAL
cd fastapi && pytest tests/test_RESOURCE_PLURAL.py -v
```

Both must pass before reporting the work as done.

---

## Acceptance Criteria Checklist

Mark every item before calling the endpoint complete.

### Schema / models
- [ ] Prisma model added to `nextjs/prisma/schema.prisma` with correct fields and cascade rule
- [ ] `npx prisma db push && npx prisma generate` run successfully in `nextjs/`
- [ ] SQLAlchemy model created in `fastapi/app/models/RESOURCE.py`, inherits `Base`, has `__tablename__`
- [ ] Model registered in `fastapi/app/models/__init__.py` (import + `__all__`)
- [ ] Model name added to `alembic/env.py` explicit import
- [ ] `alembic revision --autogenerate` produced non-empty `upgrade()` (contains `op.create_table` or `op.add_column`)
- [ ] `alembic upgrade head` succeeded; `alembic current` shows HEAD

### FastAPI layer
- [ ] `fastapi/app/schemas/RESOURCE.py` has `Base → Create → Update → Response` chain; response has `ConfigDict(from_attributes=True)`
- [ ] `fastapi/app/services/RESOURCE_service.py` has all five functions; ownership filter on every read; `exclude_unset=True` on update; `db.refresh()` after every mutation
- [ ] `fastapi/app/routers/RESOURCE_PLURAL.py` has all five endpoints; router stays thin (no inline logic); DELETE returns `None` with 204; POST returns 201
- [ ] Router imported **and** registered with `include_router` in `fastapi/app/main.py`
- [ ] `grep "RESOURCE_PLURAL" fastapi/app/main.py` shows both the import and the `include_router` line

### Next.js layer
- [ ] `nextjs/app/api/RESOURCE_PLURAL/route.ts` — GET scoped to `ownerId`; POST sets `ownerId`; Zod schema at file top
- [ ] `nextjs/app/api/RESOURCE_PLURAL/[id]/route.ts` — `params` awaited; fetch→404→403→mutate order; DELETE returns `{ success: true }`
- [ ] No `new PrismaClient()` — all imports come from `@/lib/db`

### Contract parity
- [ ] HTTP method + path + status codes match between tracks (GET→200, POST→201, PUT/PATCH→200, DELETE→204 FastAPI / `{ success: true }` Next.js)
- [ ] Field names in request/response bodies match between tracks (use camelCase on the wire for both; FastAPI aliases or serializes accordingly if needed)

### Tests
- [ ] `nextjs/tests/api/RESOURCE_PLURAL.test.ts` exists and covers: 401 unauthenticated, 400 bad body, 200/201 happy path
- [ ] `fastapi/tests/test_RESOURCE_PLURAL.py` exists and covers: 401 unauthenticated, 201 create, 200 get, 200 update, 204 delete, 404 not found
- [ ] `npm test` passes in `nextjs/`
- [ ] `pytest` passes in `fastapi/`
