Generate a new API route in **both** the Next.js and FastAPI tracks following this project's conventions. The route name (singular noun, e.g. `widget`) is provided as: **$ARGUMENTS**

Derive these values from the argument:
- `RESOURCE` = the argument as-is (e.g. `widget`)
- `RESOURCE_PLURAL` = append `s` (e.g. `widgets`) — adjust manually if irregular
- `RESOURCE_CLASS` = PascalCase (e.g. `Widget`)

---

## Step 1 — Next.js list+create route

Create `nextjs/app/api/$RESOURCE_PLURAL/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const $RESOURCE_CLASSCreateSchema = z.object({
  name: z.string().min(1),
  // TODO: add fields matching your Prisma model
});

const $RESOURCE_CLASSUpdateSchema = $RESOURCE_CLASSCreateSchema.partial();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.$RESOURCE.findMany({
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
    const data = $RESOURCE_CLASSCreateSchema.parse(body);

    const item = await prisma.$RESOURCE.create({
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

## Step 2 — Next.js detail route

Create `nextjs/app/api/$RESOURCE_PLURAL/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const $RESOURCE_CLASSUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  // TODO: add optional fields matching your Prisma model
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
    const item = await prisma.$RESOURCE.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!item) {
      return NextResponse.json({ error: "$RESOURCE_CLASS not found" }, { status: 404 });
    }
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
    const data = $RESOURCE_CLASSUpdateSchema.parse(await req.json());

    const item = await prisma.$RESOURCE.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "$RESOURCE_CLASS not found" }, { status: 404 });
    }
    if (item.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.$RESOURCE.update({ where: { id }, data });
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
    const item = await prisma.$RESOURCE.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "$RESOURCE_CLASS not found" }, { status: 404 });
    }
    if (item.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$RESOURCE.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Step 3 — Next.js test file

Create `nextjs/tests/api/$RESOURCE_PLURAL.test.ts`:

```ts
// Basic route handler tests for $RESOURCE_PLURAL
// These verify auth guards and happy-path shapes without a real DB.
import { GET, POST } from "@/app/api/$RESOURCE_PLURAL/route";
import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/$RESOURCE_PLURAL/[id]/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  prisma: {
    $RESOURCE: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

const mockSession = { user: { id: "user-1", email: "test@example.com" } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/$RESOURCE_PLURAL", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns items for authenticated user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.$RESOURCE.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/$RESOURCE_PLURAL", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/$RESOURCE_PLURAL", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const req = new Request("http://localhost/api/$RESOURCE_PLURAL", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

## Step 4 — FastAPI schema

Create `fastapi/app/schemas/$RESOURCE.py`:

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class $RESOURCE_CLASSBase(BaseModel):
    name: str
    # TODO: add fields matching your SQLAlchemy model


class $RESOURCE_CLASSCreate($RESOURCE_CLASSBase):
    pass  # add required FK fields here (e.g. project_id: int)


class $RESOURCE_CLASSUpdate(BaseModel):
    name: str | None = None
    # TODO: make all fields optional


class $RESOURCE_CLASS($RESOURCE_CLASSBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

## Step 5 — FastAPI service

Create `fastapi/app/services/$RESOURCE_service.py`:

```python
from sqlalchemy.orm import Session
from app.models.$RESOURCE import $RESOURCE_CLASS
from app.models.user import User
from app.schemas.$RESOURCE import $RESOURCE_CLASSCreate, $RESOURCE_CLASSUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_$RESOURCE_PLURALs(db: Session, user: User) -> list[$RESOURCE_CLASS]:
    return db.query($RESOURCE_CLASS).filter($RESOURCE_CLASS.owner_id == user.id).all()


def get_$RESOURCE(db: Session, $RESOURCE_id: int, user: User) -> $RESOURCE_CLASS:
    item = (
        db.query($RESOURCE_CLASS)
        .filter($RESOURCE_CLASS.id == $RESOURCE_id, $RESOURCE_CLASS.owner_id == user.id)
        .first()
    )
    if not item:
        raise NotFoundException("$RESOURCE_CLASS not found")
    return item


def create_$RESOURCE(db: Session, data: $RESOURCE_CLASSCreate, user: User) -> $RESOURCE_CLASS:
    item = $RESOURCE_CLASS(**data.model_dump(), owner_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_$RESOURCE(db: Session, $RESOURCE_id: int, data: $RESOURCE_CLASSUpdate, user: User) -> $RESOURCE_CLASS:
    item = get_$RESOURCE(db, $RESOURCE_id, user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_$RESOURCE(db: Session, $RESOURCE_id: int, user: User) -> None:
    item = get_$RESOURCE(db, $RESOURCE_id, user)
    db.delete(item)
    db.commit()
```

## Step 6 — FastAPI router

Create `fastapi/app/routers/$RESOURCE_PLURAL.py`:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.$RESOURCE import $RESOURCE_CLASS, $RESOURCE_CLASSCreate, $RESOURCE_CLASSUpdate
from app.services.$RESOURCE_service import (
    get_$RESOURCE_PLURALs,
    get_$RESOURCE,
    create_$RESOURCE,
    update_$RESOURCE,
    delete_$RESOURCE,
)
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/$RESOURCE_PLURAL", tags=["$RESOURCE_PLURAL"])


@router.get("", response_model=list[$RESOURCE_CLASS])
def list_$RESOURCE_PLURALs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_$RESOURCE_PLURALs(db, current_user)


@router.post("", response_model=$RESOURCE_CLASS, status_code=status.HTTP_201_CREATED)
def create_new_$RESOURCE(
    data: $RESOURCE_CLASSCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_$RESOURCE(db, data, current_user)


@router.get("/{$RESOURCE_id}", response_model=$RESOURCE_CLASS)
def get_$RESOURCE_by_id(
    $RESOURCE_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_$RESOURCE(db, $RESOURCE_id, current_user)


@router.put("/{$RESOURCE_id}", response_model=$RESOURCE_CLASS)
def update_$RESOURCE_by_id(
    $RESOURCE_id: int,
    data: $RESOURCE_CLASSUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_$RESOURCE(db, $RESOURCE_id, data, current_user)


@router.delete("/{$RESOURCE_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_$RESOURCE_by_id(
    $RESOURCE_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_$RESOURCE(db, $RESOURCE_id, current_user)
    return None
```

## Step 7 — Register router in FastAPI

Open `fastapi/app/main.py` and add:

```python
from app.routers.$RESOURCE_PLURAL import router as $RESOURCE_PLURAL_router
# ...
app.include_router($RESOURCE_PLURAL_router)
```

## Step 8 — FastAPI test file

Create `fastapi/tests/test_$RESOURCE_PLURAL.py`:

```python
import pytest
from fastapi.testclient import TestClient


def test_list_$RESOURCE_PLURAL_unauthenticated(client: TestClient):
    response = client.get("/api/$RESOURCE_PLURAL")
    assert response.status_code == 401


def test_create_$RESOURCE(client: TestClient, auth_headers: dict):
    payload = {"name": "Test $RESOURCE_CLASS"}
    response = client.post("/api/$RESOURCE_PLURAL", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert "id" in data


def test_get_$RESOURCE(client: TestClient, auth_headers: dict):
    # Create first
    created = client.post(
        "/api/$RESOURCE_PLURAL", json={"name": "Fetch Me"}, headers=auth_headers
    ).json()
    response = client.get(f"/api/$RESOURCE_PLURAL/{created['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_$RESOURCE(client: TestClient, auth_headers: dict):
    created = client.post(
        "/api/$RESOURCE_PLURAL", json={"name": "Before"}, headers=auth_headers
    ).json()
    response = client.put(
        f"/api/$RESOURCE_PLURAL/{created['id']}", json={"name": "After"}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "After"


def test_delete_$RESOURCE(client: TestClient, auth_headers: dict):
    created = client.post(
        "/api/$RESOURCE_PLURAL", json={"name": "Delete Me"}, headers=auth_headers
    ).json()
    response = client.delete(f"/api/$RESOURCE_PLURAL/{created['id']}", headers=auth_headers)
    assert response.status_code == 204


def test_$RESOURCE_not_found(client: TestClient, auth_headers: dict):
    response = client.get("/api/$RESOURCE_PLURAL/99999", headers=auth_headers)
    assert response.status_code == 404
```

## Step 9 — Remind the user

After generating all files, print this checklist:

```
Files created:
  Next.js
    nextjs/app/api/$RESOURCE_PLURAL/route.ts
    nextjs/app/api/$RESOURCE_PLURAL/[id]/route.ts
    nextjs/tests/api/$RESOURCE_PLURAL.test.ts

  FastAPI
    fastapi/app/schemas/$RESOURCE.py
    fastapi/app/services/$RESOURCE_service.py
    fastapi/app/routers/$RESOURCE_PLURAL.py
    fastapi/tests/test_$RESOURCE_PLURAL.py

Next steps (manual):
  1. Add the $RESOURCE_CLASS model to nextjs/prisma/schema.prisma and run `npx prisma db push`
  2. Add the $RESOURCE_CLASS SQLAlchemy model to fastapi/app/models/$RESOURCE.py
  3. Run `alembic revision --autogenerate -m "add $RESOURCE" && alembic upgrade head` in fastapi/
  4. Fill in the TODO field placeholders in the generated files
  5. Register the FastAPI router in fastapi/app/main.py (Step 7 above)
  6. Run tests: npm test (Next.js) and pytest (FastAPI)
```
