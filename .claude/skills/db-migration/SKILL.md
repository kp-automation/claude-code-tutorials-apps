---
name: db-migration
description: FastAPI database migration workflow for TaskForge — covers adding models, generating Alembic revisions, applying them, and recovering from common failures.
allowed-tools:
  - Read
  - Edit
  - Bash
  - Write
---

# Database Migration Skill

## How alembic sees your models

`alembic/env.py` does **not** scan `app/models/` automatically. It imports:

```python
from app.models import User, Project, Task, Comment, Label, TaskLabel
```

When Python processes that line it executes `app/models/__init__.py` in full, which
pulls in every model that `__init__.py` imports. `Base.metadata` is then populated with
all those tables, and `--autogenerate` diffs against it.

**`app/models/__init__.py` is the only registry that matters.** A new model file that
isn't imported there is invisible to alembic regardless of what `env.py` says. If
`--autogenerate` produces an empty migration, this is almost always the cause.

The explicit name list in `env.py` (`User, Project, Task, ...`) is for human clarity, not
functionality — Python already ran the whole `__init__.py` to resolve those names.
Update it anyway when adding a model so the intent is obvious.

## The full workflow

### 1. Edit the model

Create or edit a file in `fastapi/app/models/<name>.py`. Follow the existing pattern:

```python
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class MyModel(Base):
    __tablename__ = "my_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
```

### 2. Register the model

**`app/models/__init__.py`** — this is the only required step. Add the import and `__all__` entry:

```python
from app.models.my_model import MyModel

__all__ = [
    ...,
    "MyModel",
]
```

**`alembic/env.py`** — optional but recommended for clarity. Add the name to the explicit import:

```python
from app.models import User, Project, Task, Comment, Label, TaskLabel, MyModel
```

Skipping `__init__.py` means autogenerate sees nothing. Skipping the `env.py` name is harmless — Python already executes all of `__init__.py` when it resolves the import.

### 3. Generate the migration

```bash
cd fastapi
alembic revision --autogenerate -m "add my_model table"
```

**Verify the output is non-empty.** Open the generated file in `alembic/versions/` and
confirm `upgrade()` contains `op.create_table(...)` or `op.add_column(...)`. An empty
`upgrade()` means alembic still can't see the model — go back to step 2.

### 4. Apply the migration

```bash
alembic upgrade head
```

### 5. Verify

```bash
alembic history      # shows revision chain; HEAD should be your new revision
alembic current      # confirms DB is at HEAD
```

---

## Common failures and fixes

### Empty autogenerate (`upgrade()` does nothing)

**Symptom:** Generated file has:
```python
def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
```

**Cause:** The model isn't visible to `Base.metadata`.

**Fix checklist:**
1. Model is imported in `app/models/__init__.py` ✓
2. `app/models/__init__.py` import is in `alembic/env.py` ✓
3. `class MyModel(Base):` inherits from `Base` (not `DeclarativeBase` directly) ✓
4. `__tablename__` is set ✓

### Migration generates but fails on apply

**Symptom:** `alembic upgrade head` raises `OperationalError` or `IntegrityError`.

**Common causes:**
- Table already exists (ran a hand-edit earlier)
- FK references a table that doesn't exist yet (wrong `down_revision` order)
- SQLite doesn't support `ALTER TABLE ... ADD COLUMN NOT NULL` without a default

**Fix:** Roll back one step, fix the migration file, re-apply:
```bash
alembic downgrade -1
# edit the generated file to fix the SQL
alembic upgrade head
```

For SQLite NOT NULL adds, always supply a `server_default`:
```python
op.add_column("tasks", sa.Column("priority", sa.String(), nullable=False, server_default="MEDIUM"))
```

### DB and code out of sync after a bad downgrade

```bash
# Nuclear reset — wipes all data
rm fastapi/taskforge.db
alembic upgrade head
python -m app.seed
```

---

## Adding a column to an existing table

1. Edit the SQLAlchemy model to add the column.
2. Run `alembic revision --autogenerate -m "add <column> to <table>"`.
3. Open the generated file and confirm `op.add_column(...)` is present.
4. If the column is `nullable=False`, add `server_default` (SQLite requirement).
5. `alembic upgrade head`.

Example for a non-nullable column:
```python
def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("due_date", sa.DateTime(), nullable=True),  # use nullable=True for SQLite
    )
```

---

## Enum columns

Both tracks use Python `enum.Enum` for status/priority. When adding a new enum value:

**FastAPI model:**
```python
import enum

class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"   # new
```

**Migration note:** SQLite doesn't enforce enum constraints at the DB level (it stores as
VARCHAR), so adding an enum value doesn't require a migration. The constraint is purely
at the Python/Pydantic layer. Still run autogenerate to confirm alembic detects no schema
change — if it does, investigate why.

**Next.js mirror:** Add the new value to `nextjs/lib/types.ts` and the Prisma schema
string union at the same time.

---

## Quick reference

| Task | Command |
|------|---------|
| Generate migration | `alembic revision --autogenerate -m "describe change"` |
| Apply all pending | `alembic upgrade head` |
| Roll back one | `alembic downgrade -1` |
| View history | `alembic history` |
| Check current DB state | `alembic current` |
| Full reset | `rm taskforge.db && alembic upgrade head && python -m app.seed` |
| Run after model edit | `alembic revision --autogenerate -m "..." && alembic upgrade head` |

---

## Checklist: adding a new model

- [ ] `fastapi/app/models/<name>.py` created, inherits `Base`, has `__tablename__`
- [ ] Added to `fastapi/app/models/__init__.py` (import + `__all__`)
- [ ] Added to `alembic/env.py` import line
- [ ] `alembic revision --autogenerate -m "add <name> table"` produced non-empty `upgrade()`
- [ ] `alembic upgrade head` succeeded
- [ ] `alembic current` confirms DB is at HEAD
- [ ] Matching Pydantic schemas created in `fastapi/app/schemas/<name>.py`
- [ ] Next.js `prisma/schema.prisma` updated with equivalent model
- [ ] `npx prisma db push` run in `nextjs/`
