# ADR 001 — Use FastAPI for the Python Backend Track

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2024-01-10 |
| **Tracks affected** | FastAPI |

---

## Context

TaskForge needed a Python web framework to serve a JSON API that mirrors the Next.js track feature-for-feature. The framework had to satisfy both product requirements and tutorial requirements — it would be the first thing learners interact with when reading the Python code.

**Product requirements:**

- Serve a REST-style JSON API with six resource groups: auth, projects, tasks, comments, notifications, widgets.
- Validate all incoming request bodies before they touch the database.
- Expose structured error responses (bad input is distinct from server error).
- Enforce authentication on every route except registration and login.
- Run on a single SQLite file — no managed infrastructure.

**Tutorial requirements:**

- Code should be idiomatic and immediately readable to a Python developer who has not used the framework before.
- The architecture should have a clear, teachable layer separation (HTTP → business logic → data).
- The framework should reward good habits: type annotations, explicit schemas, separation of concerns.
- Auto-generated interactive API documentation is a strong positive — learners can explore the API without writing a single curl command.
- The framework should be current: widely adopted, actively maintained, and representative of what a new Python project would realistically choose today.

---

## Decision

Use **FastAPI** (v0.115+) with **Pydantic v2** for request/response validation and **SQLAlchemy 2.0** as the ORM layer.

The layered architecture chosen for the FastAPI track maps directly onto FastAPI's design:

```
routers/      ← HTTP layer: paths, methods, status codes, dependency injection
services/     ← business logic: ownership checks, mutations, notifications
models/       ← SQLAlchemy ORM: table definitions, relationships
schemas/      ← Pydantic: request bodies and response shapes
utils/        ← cross-cutting: JWT, password hashing, exception types
```

Routers stay thin and delegate to services. Services raise typed exceptions (`NotFoundException`, `ForbiddenException`) that FastAPI exception handlers convert to HTTP responses. Pydantic schemas are deliberately separate from ORM models — each resource follows the `Base → Create → Update → Response` chain.

FastAPI's dependency injection (`Depends`) is used throughout to provide the database session and authenticated user to every handler:

```python
@router.get("/{project_id}", response_model=Project)
def get_project_by_id(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_project(db, project_id, current_user)
```

---

## Alternatives considered

### Flask

Flask is a micro-framework — it provides routing and request/response handling and leaves everything else to the developer.

**Strengths considered:**
- Extremely low surface area; minimal framework-specific concepts to learn.
- Familiar to most Python developers; large ecosystem of tutorials and Stack Overflow answers.
- No strong opinions about project structure — suits projects where the architecture is the teaching point, not the framework.

**Why not chosen:**

Flask has no built-in request validation. Validation requires a separate library (`marshmallow`, `flask-pydantic`, or hand-rolled checks). Adding a validation layer is not difficult, but it introduces a second framework to learn alongside Flask, splits the documentation learners must read, and produces more boilerplate per route. For a tutorial project where every route should be concise and readable, this overhead is a cost with no educational benefit.

Flask also has no native async support in its core routing layer (Flask-Async is available but not the default path), no automatic API documentation, and no dependency injection primitive. Each of these could be bolted on but would require additional packages and configuration, making the project harder to set up and the code harder to read.

### Django (+ Django REST Framework)

Django is a batteries-included framework. With Django REST Framework (DRF) it covers model definition, ORM, serialization, authentication, permissions, and browsable API docs.

**Strengths considered:**
- The most widely deployed Python web framework; broad employer recognition.
- ORM, admin panel, and migrations are first-class and deeply integrated.
- DRF's `ModelSerializer` can generate serializers directly from ORM models, reducing schema duplication.
- Built-in user model and authentication system — no need to implement password hashing or user management from scratch.

**Why not chosen:**

The Django + DRF stack is substantially larger than what TaskForge requires. The Django admin, template engine, form system, and middleware stack add complexity that is irrelevant to a JSON API. Learning which parts to ignore is itself a non-trivial task for a learner unfamiliar with the framework.

More specifically, the tutorial series emphasizes the separation between ORM models and API schemas as a deliberate, visible design choice. Django's `ModelSerializer` collapses this separation by default — the framework encourages deriving serializers from models, which obscures the distinction the tutorial is trying to teach. Maintaining an explicit `Base → Create → Update → Response` schema chain requires actively working against DRF's grain.

DRF's class-based views and viewsets are powerful but introduce a second inheritance hierarchy that competes with FastAPI's function-based approach for clarity. The verbosity of registering viewsets with routers and configuring permission classes is also higher than FastAPI's equivalent `Depends` pattern.

---

## Consequences

### Positive

**Automatic OpenAPI documentation.** FastAPI generates a Swagger UI at `/docs` and ReDoc at `/redoc` from the Pydantic schemas and route decorators, with no additional configuration. Learners can explore and test every endpoint interactively before writing any client code. The schema is always in sync with the implementation because it is derived from it.

**Type safety at the boundary.** Every route that accepts a request body declares a Pydantic model. Invalid input (wrong type, missing required field, enum value not in set) is rejected with a structured `422` response before the handler body executes. This eliminates an entire class of defensive-programming boilerplate inside handlers.

**Dependency injection as a first-class primitive.** `Depends(get_db)` and `Depends(get_current_user)` make the database session and authenticated user available to any handler with a single declaration. The test suite overrides `get_db` with an in-memory database by replacing the dependency — no monkeypatching required. This pattern is explicit, composable, and directly teachable.

**Async-ready without a rewrite.** FastAPI supports both synchronous and `async def` handlers interchangeably. The current implementation uses synchronous SQLAlchemy for simplicity, but switching individual handlers or the entire ORM layer to async requires no framework change — only the handler signature and query style need updating.

**SQLAlchemy 2.0 decoupled from the framework.** Because FastAPI imposes no ORM, the project uses SQLAlchemy 2.0's `Mapped` column declarations, which are type-annotated and work with any Python type checker. Alembic migration autogeneration works against the same models without any FastAPI-specific configuration.

**Pydantic v2 performance.** Pydantic v2 (the version bundled with FastAPI 0.100+) validates models in a Rust core, making validation faster than earlier Python-based approaches. This has no practical impact at tutorial scale but means the same patterns scale to production workloads.

### Negative / trade-offs

**Two schema layers.** FastAPI's clean separation of Pydantic schemas from SQLAlchemy models is a design virtue but also a maintenance cost: adding a field to the data model requires touching both the ORM model and the relevant Pydantic schemas. The `Base → Create → Update → Response` chain means a single logical field change touches up to four classes. DRF's `ModelSerializer` would handle this automatically.

**No built-in admin interface.** Flask-Admin and Django admin are available for Flask/Django projects. FastAPI has no equivalent. Inspecting or editing data during development requires Prisma Studio (not available here), direct SQLite tooling, or the API itself via `/docs`.

**Async SQLAlchemy requires a different setup.** The current implementation uses `Session` (synchronous). Migrating to `AsyncSession` for full async support requires replacing `Session` with `AsyncSession`, adding `asyncio` to the engine configuration, and updating every `db.query(...)` call to `await db.execute(select(...))`. The two patterns cannot be mixed in the same session. This is not a FastAPI limitation, but the mix-up is a common mistake learners make when combining FastAPI's async-by-default framing with a synchronous ORM.

**Younger ecosystem than Flask or Django.** FastAPI was released in 2018. While adoption has grown rapidly, the number of production deployments, battle-tested extensions, and institutional knowledge is smaller than for Flask (2010) or Django (2005). Edge cases and advanced deployment patterns have less community coverage.

---

## Implementation notes

- FastAPI version: `fastapi>=0.115` — see `fastapi/pyproject.toml`.
- ASGI server: `uvicorn[standard]` — run with `uvicorn app.main:app --reload`.
- CORS is configured in `fastapi/app/main.py` via `CORSMiddleware`; allowed origins are set via `CORS_ORIGINS` in `fastapi/.env`.
- Exception handlers for `NotFoundException` and `ForbiddenException` are defined in `fastapi/app/utils/exceptions.py` and registered at application startup. Adding a new exception type requires both a new class in that module and a matching handler registration.
- Interactive docs: `http://localhost:8000/docs` (Swagger UI), `http://localhost:8000/redoc` (ReDoc).
