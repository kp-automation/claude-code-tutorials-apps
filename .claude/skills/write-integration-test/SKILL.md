---
name: write-integration-test
description: Write integration tests for TaskForge API endpoints — covers FastAPI (real HTTP + real SQLite DB) and Next.js route handler tests (mocked Prisma), fixture setup, ownership/auth scenarios, response shape assertions, and side-effect verification.
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
---

# Write Integration Test Skill

Write tests for TaskForge API endpoints. The two tracks have different testing depths:

| Track | Test type | DB | File location |
|---|---|---|---|
| **FastAPI** | True integration — real HTTP through `TestClient`, real SQLite | SQLite file (`test.db`), wiped per test | `fastapi/tests/test_RESOURCE.py` |
| **Next.js** | Route-handler unit tests — handler called as a function, Prisma mocked | None (mocked) | `nextjs/tests/api/RESOURCE.test.ts` |

Both are valuable. FastAPI tests verify the full stack including DB behavior. Next.js tests verify route handler logic (auth guard, Zod validation, error codes) cheaply and fast.

---

## Goal

Produce complete, organized test files that give confidence the endpoint is correctly wired, scoped to the current user, and handles error cases predictably. Tests must pass (`pytest` / `npm test`) before the work is considered done.

---

## Part 1 — FastAPI integration tests

### Fixture chain

`conftest.py` provides four fixtures. Every test file inherits them — do **not** redefine them.

```
db          — creates all tables, yields a Session, drops all tables on teardown
 └─ client  — overrides get_db with the test session, yields TestClient, clears overrides
     ├─ test_user    — inserts a User(email="test@example.com"), returns the ORM object
     └─ auth_headers — logs in as test_user, returns {"Authorization": "Bearer <token>"}
```

Tests that need a second user define `other_auth_headers` **locally in the test file** — do not add it to `conftest.py`:

```python
@pytest.fixture
def other_auth_headers(client):
    client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "name": "Other User", "password": "otherpass123"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "other@example.com", "password": "otherpass123"},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

### Local fixture pattern

Nested resources (task requires a project, comment requires a task) use local fixtures that build on the conftest chain. Each fixture asserts its own precondition so failures are obvious:

```python
@pytest.fixture
def project_id(client, auth_headers):
    resp = client.post("/api/projects", json={"name": "Test Project"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def task_id(client, auth_headers, project_id):
    resp = client.post(
        "/api/tasks",
        json={"title": "Test Task", "project_id": project_id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]
```

### Helper function pattern

Extract repetitive create calls into module-level helper functions (not fixtures). Helpers accept `**overrides` so individual tests can vary a single field:

```python
def _create_widget(client, headers, **overrides):
    payload = {"name": "Default Widget", **overrides}
    return client.post("/api/widgets", json=payload, headers=headers)
```

Call helpers in tests like:
```python
widget_id = _create_widget(client, auth_headers, name="My Widget").json()["id"]
```

### Test file structure

Organize tests into labeled sections with dashed separator comments. This matches the established pattern in `test_tasks.py` and `test_comments.py`:

```python
# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# create_RESOURCE — happy path
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# create_RESOURCE — error / access control
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# list / get — happy path
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# list / get — access control
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# update — happy path
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# update — error handling
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# delete — happy path and error handling
# ---------------------------------------------------------------------------
```

### The five coverage buckets

Every resource endpoint must have tests in all five buckets.

#### 1. Authentication guard

One test per HTTP method, no `auth_headers`, expect 401:

```python
def test_list_widgets_unauthenticated(client: TestClient):
    assert client.get("/api/widgets").status_code == 401

def test_create_widget_unauthenticated(client: TestClient):
    assert client.post("/api/widgets", json={"name": "x"}).status_code == 401

def test_get_widget_unauthenticated(client: TestClient):
    assert client.get("/api/widgets/1").status_code == 401

def test_delete_widget_unauthenticated(client: TestClient):
    assert client.delete("/api/widgets/1").status_code == 401
```

#### 2. Happy path — create

Test successful creation, verify status 201, assert all key fields in response:

```python
def test_create_widget(client: TestClient, auth_headers: dict):
    resp = _create_widget(client, auth_headers, name="My Widget", description="Desc")
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Widget"
    assert data["description"] == "Desc"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
```

Also test defaults: omit optional fields, assert the defaults are applied:

```python
def test_create_widget_defaults(client: TestClient, auth_headers: dict):
    resp = _create_widget(client, auth_headers)
    assert resp.status_code == 201
    assert resp.json()["description"] is None
```

#### 3. Happy path — read

Test list (empty, then with data, then filtered), detail fetch, and response shape:

```python
def test_list_widgets_empty(client: TestClient, auth_headers: dict):
    assert client.get("/api/widgets", headers=auth_headers).json() == []

def test_list_widgets(client: TestClient, auth_headers: dict):
    _create_widget(client, auth_headers, name="W1")
    _create_widget(client, auth_headers, name="W2")
    resp = client.get("/api/widgets", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2

def test_get_widget(client: TestClient, auth_headers: dict):
    widget_id = _create_widget(client, auth_headers, name="Fetch Me").json()["id"]
    resp = client.get(f"/api/widgets/{widget_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == widget_id

def test_get_widget_response_shape(client: TestClient, auth_headers: dict):
    widget_id = _create_widget(client, auth_headers).json()["id"]
    data = client.get(f"/api/widgets/{widget_id}", headers=auth_headers).json()
    assert set(data.keys()) >= {"id", "name", "owner_id", "created_at", "updated_at"}
```

#### 4. Partial update

Test that updating one field does not clobber unspecified fields — this validates `exclude_unset=True`:

```python
def test_update_widget_partial_only_changes_specified_fields(
    client: TestClient, auth_headers: dict
):
    widget = _create_widget(
        client, auth_headers, name="Original", description="Keep me"
    ).json()
    resp = client.put(
        f"/api/widgets/{widget['id']}", json={"name": "Changed"}, headers=auth_headers
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["name"] == "Changed"
    assert updated["description"] == "Keep me"   # must not be clobbered
```

#### 5. Access control and error handling

Cross-ownership tests use `other_auth_headers` to verify isolation:

```python
def test_list_widgets_does_not_return_other_users_widgets(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    _create_widget(client, other_auth_headers, name="Theirs")
    resp = client.get("/api/widgets", headers=auth_headers)
    assert resp.json() == []

def test_get_widget_other_users_widget(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    widget_id = _create_widget(client, other_auth_headers, name="Private").json()["id"]
    assert client.get(f"/api/widgets/{widget_id}", headers=auth_headers).status_code == 404

def test_update_widget_other_users_widget(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    widget_id = _create_widget(client, other_auth_headers, name="Theirs").json()["id"]
    resp = client.put(
        f"/api/widgets/{widget_id}", json={"name": "Hijacked"}, headers=auth_headers
    )
    assert resp.status_code == 404

def test_delete_widget_other_users_widget(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    widget_id = _create_widget(client, other_auth_headers, name="Theirs").json()["id"]
    assert client.delete(f"/api/widgets/{widget_id}", headers=auth_headers).status_code == 404
```

Nonexistent resource — use `99999` as the conventional fake ID:

```python
def test_get_widget_not_found(client: TestClient, auth_headers: dict):
    assert client.get("/api/widgets/99999", headers=auth_headers).status_code == 404

def test_update_widget_not_found(client: TestClient, auth_headers: dict):
    assert client.put("/api/widgets/99999", json={"name": "x"}, headers=auth_headers).status_code == 404

def test_delete_widget_not_found(client: TestClient, auth_headers: dict):
    assert client.delete("/api/widgets/99999", headers=auth_headers).status_code == 404
```

Validation errors — missing required fields return 422 (FastAPI/Pydantic):

```python
def test_create_widget_missing_name(client: TestClient, auth_headers: dict):
    resp = client.post("/api/widgets", json={}, headers=auth_headers)
    assert resp.status_code == 422

def test_create_widget_invalid_enum_field(client: TestClient, auth_headers: dict):
    resp = _create_widget(client, auth_headers, status="INVALID")
    assert resp.status_code == 422
```

Delete confirms the record is gone afterwards:

```python
def test_delete_widget(client: TestClient, auth_headers: dict):
    widget_id = _create_widget(client, auth_headers, name="Delete Me").json()["id"]
    assert client.delete(f"/api/widgets/{widget_id}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/widgets/{widget_id}", headers=auth_headers).status_code == 404
```

### DB-level assertions for side effects

When an endpoint writes side-effect records (e.g., Notification, audit log), add the `db` fixture and query directly:

```python
def test_create_widget_triggers_notification(
    client: TestClient, auth_headers: dict, db
):
    from app.models.notification import Notification
    _create_widget(client, auth_headers, name="Trigger")
    assert db.query(Notification).count() == 1

def test_create_widget_no_notification_without_mention(
    client: TestClient, auth_headers: dict, db
):
    from app.models.notification import Notification
    _create_widget(client, auth_headers)
    assert db.query(Notification).count() == 0
```

### Constraints specific to FastAPI tests

- **Do not redefine `db`, `client`, `test_user`, or `auth_headers`** in test files. They come from `conftest.py`. Redefining them shadows the shared fixtures and causes hard-to-debug isolation failures.
- **Do not hand-edit `conftest.py`** unless adding a genuinely cross-test-file fixture. Local fixtures belong in the test file.
- **`asyncio_mode = "auto"`** is set in `pyproject.toml` — async tests just work without `@pytest.mark.asyncio`.
- **The `db` fixture wipes the schema after each test** (`Base.metadata.drop_all`). Tests are fully isolated; don't rely on data created in previous tests.
- **`TestClient` is synchronous** — call it like `client.get(...)`, not `await client.get(...)`.
- **Intentional gaps** (`# Intentional gap: Missing test for...`) exist in `test_projects.py` and `test_auth.py` as teaching material. Do not fill them in unless the user explicitly asks.
- **`test.db`** is a file on disk (not `:memory:`) — it's deleted between test runs by the fixture teardown. Don't add it to `.gitignore` removal or cleanup scripts.

---

## Part 2 — Next.js route handler tests

These are unit tests, not true integration tests. Prisma is mocked — no real DB is involved. Their purpose is to verify auth guards, Zod validation, and HTTP status code logic.

### Environment pragma

Route handlers run in Node, not the browser. Add the pragma **before any imports**:

```ts
/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/widgets/route";
import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/widgets/[id]/route";
```

Without this, the test uses jsdom, `Request`/`Response` may behave differently, and `fetch` may not be available.

### Required mocks

Two mocks are always needed: `next-auth` (to control session) and `@/lib/db` (to control Prisma):

```ts
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    widget: {
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
```

### Standard test cases

Every route handler test file covers these scenarios:

```ts
describe("GET /api/widgets", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 for authenticated user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.widget.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/widgets", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (missing required field)", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const req = new Request("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({}),    // name is required
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 on valid body", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const created = { id: "w-1", name: "Test", ownerId: "user-1" };
    (prisma.widget.create as jest.Mock).mockResolvedValue(created);
    const req = new Request("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/widgets/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "w-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when item does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.widget.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/widgets/w-99", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "w-99" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when item belongs to another user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.widget.findUnique as jest.Mock).mockResolvedValue({
      id: "w-1",
      ownerId: "other-user",   // different from mockSession user id
    });
    const req = new Request("http://localhost/api/widgets/w-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Hijacked" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "w-1" }) });
    expect(res.status).toBe(403);
  });
});
```

### Constructing `params` for detail routes

Next.js 15 makes `params` a `Promise`. Pass it as:

```ts
{ params: Promise.resolve({ id: "w-1" }) }
```

### Constraints specific to Next.js route tests

- **`@jest-environment node`** must be the first lines of the file, before imports. Forgetting it causes `Request is not defined` or session mock failures.
- **Mock `@/lib/db` at the model level**, not the whole Prisma client. Each model's methods (`findMany`, `findUnique`, `create`, `update`, `delete`) are separate jest functions.
- **`jest.clearAllMocks()` in `beforeEach`** is mandatory — mocks carry state between tests otherwise.
- **Don't test DB query logic** in these tests — that's what FastAPI integration tests are for. These tests verify the route's auth guard, status code logic, and Zod validation only.
- **Do not use `jest-environment jsdom`** for API route tests even though `jest.config.js` defaults to jsdom globally. The pragma overrides it per-file.

---

## Running the tests

**FastAPI:**
```bash
cd fastapi

# single file
pytest tests/test_widgets.py -v

# single test
pytest tests/test_widgets.py::test_create_widget -v

# all tests
pytest -v
```

**Next.js:**
```bash
cd nextjs

# single file
npx jest tests/api/widgets.test.ts

# by keyword
npx jest -t "unauthenticated"

# full suite
npm test
```

---

## Acceptance Criteria Checklist

Mark every item before calling the tests done.

### FastAPI test file
- [ ] File at `fastapi/tests/test_RESOURCE.py`
- [ ] No redefinition of `db`, `client`, `test_user`, or `auth_headers` — all come from `conftest.py`
- [ ] Local fixtures (`project_id`, `task_id`) defined if the resource is nested; each asserts its own precondition
- [ ] `other_auth_headers` fixture defined locally if cross-ownership tests are included
- [ ] Helper function `_create_RESOURCE(client, headers, **overrides)` defined for multi-step tests
- [ ] Test sections separated by `# --- section name ---` comment blocks

### FastAPI coverage (five buckets)
- [ ] **Auth guard**: 401 tested for every HTTP method without `auth_headers`
- [ ] **Create happy path**: 201 status; all key response fields asserted; defaults tested
- [ ] **Read happy path**: empty list → 200 `[]`; list with items; detail fetch by id; response shape (`set(data.keys()) >= {...}`)
- [ ] **Partial update**: title/field change only; verifies unspecified fields are not clobbered
- [ ] **Access control**: other user's resource returns 404; list returns only caller's own records
- [ ] **Not found**: `99999` fake ID returns 404 for GET, PUT, DELETE
- [ ] **Validation**: missing required fields return 422; invalid enum values return 422
- [ ] **Delete confirms gone**: GET after DELETE returns 404
- [ ] **DB-level side effects** (if any): `db` fixture used to query tables directly; both "created" and "not created" cases tested

### Next.js test file
- [ ] File at `nextjs/tests/api/RESOURCE.test.ts`
- [ ] `/** @jest-environment node */` pragma is the first two lines, before all imports
- [ ] `jest.mock("next-auth", ...)` and `jest.mock("@/lib/db", ...)` present
- [ ] `jest.clearAllMocks()` in `beforeEach`
- [ ] `params: Promise.resolve({ id: "..." })` used for detail route tests

### Next.js coverage
- [ ] 401 for unauthenticated GET and POST (list route)
- [ ] 400 for POST with missing required field
- [ ] 201 for POST with valid body (Prisma `create` mock returns fixture)
- [ ] 401 for unauthenticated PATCH/DELETE (detail route)
- [ ] 404 when `findUnique` returns null (item not found)
- [ ] 403 when `findUnique` returns item with different `ownerId`

### Both tracks
- [ ] `pytest -v` passes in `fastapi/`
- [ ] `npm test` passes in `nextjs/`
- [ ] No test relies on state from a sibling test (each test is self-contained)
- [ ] Intentional gaps in existing test files (`test_projects.py`, `test_auth.py`) left untouched
