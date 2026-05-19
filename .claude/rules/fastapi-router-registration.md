# FastAPI Router Registration

## The mistake

Creating a router file (`app/routers/<name>.py`) without registering it in `app/main.py`.

**Why it's dangerous:** The app starts without errors. The routes silently return 404.
No startup warning, no test failure unless those specific endpoints are hit.

The widgets router (`fastapi/app/routers/widgets.py`) was shipped this way — fully
implemented but unreachable — because registration was forgotten.

## The rule

**Every new router file must be imported and registered in `app/main.py` before the
work is considered done.**

Two things are required together — both must be present:

```python
# 1. Import the router module
from app.routers import auth, projects, tasks, comments, notifications, <new_router>

# 2. Register it with the app
app.include_router(<new_router>.router)
```

A router file with no `include_router` call is dead code.

## Verification steps

After adding a new router, verify all three:

1. **Import present** — `grep "from app.routers import" fastapi/app/main.py` contains the new module name.
2. **Registration present** — `grep "include_router" fastapi/app/main.py` contains the new router.
3. **Routes visible in docs** — start the server (`uvicorn app.main:app --reload`) and confirm the new tag and endpoints appear at `http://localhost:8000/docs`.

If step 3 fails but steps 1–2 pass, the router prefix or tag is wrong. Fix the `APIRouter(prefix=...)` in the router file.

## Checklist for any new FastAPI router

- [ ] `app/routers/<name>.py` created with `router = APIRouter(prefix="/api/<name>", tags=["<name>"])`
- [ ] `app/schemas/<name>.py` created with Base/Create/Update/Response chain
- [ ] `app/services/<name>_service.py` created with business logic
- [ ] (if model added) `alembic revision --autogenerate -m "add <name>"` run and applied
- [ ] `app/main.py` import line updated
- [ ] `app/main.py` `include_router` call added
- [ ] Endpoints visible at `/docs`
