import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def project_id(client, auth_headers):
    """Create a project owned by the primary test user and return its id."""
    resp = client.post(
        "/api/projects", json={"name": "Sprint Test Project"}, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def sprint_id(client, auth_headers, project_id):
    """Create a sprint in the primary user's project and return its id."""
    resp = client.post(
        "/api/sprints",
        json={
            "name": "Sprint 1",
            "start_date": "2026-06-01T00:00:00",
            "end_date": "2026-06-14T00:00:00",
            "project_id": project_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def other_auth_headers(client):
    """Register and authenticate a second user, return auth headers."""
    client.post(
        "/api/auth/register",
        json={
            "email": "other_sprint@example.com",
            "name": "Other Sprint User",
            "password": "otherpass123",
        },
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "other_sprint@example.com", "password": "otherpass123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_sprint(client, headers, project_id, **overrides):
    payload = {
        "name": "Default Sprint",
        "start_date": "2026-06-01T00:00:00",
        "end_date": "2026-06-14T00:00:00",
        "project_id": project_id,
        **overrides,
    }
    return client.post("/api/sprints", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

def test_list_sprints_unauthenticated(client: TestClient, project_id: int):
    resp = client.get(f"/api/sprints?project_id={project_id}")
    assert resp.status_code == 401


def test_create_sprint_unauthenticated(client: TestClient, project_id: int):
    resp = client.post(
        "/api/sprints",
        json={
            "name": "Unauth Sprint",
            "start_date": "2026-06-01T00:00:00",
            "end_date": "2026-06-14T00:00:00",
            "project_id": project_id,
        },
    )
    assert resp.status_code == 401


def test_get_sprint_unauthenticated(client: TestClient):
    resp = client.get("/api/sprints/1")
    assert resp.status_code == 401


def test_update_sprint_unauthenticated(client: TestClient):
    resp = client.put("/api/sprints/1", json={"name": "No auth"})
    assert resp.status_code == 401


def test_delete_sprint_unauthenticated(client: TestClient):
    resp = client.delete("/api/sprints/1")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# create_sprint — happy path
# ---------------------------------------------------------------------------

def test_create_sprint(client: TestClient, auth_headers: dict, project_id: int):
    resp = _create_sprint(
        client,
        auth_headers,
        project_id,
        name="Alpha Sprint",
        start_date="2026-07-01T00:00:00",
        end_date="2026-07-14T00:00:00",
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alpha Sprint"
    assert data["project_id"] == project_id
    assert data["status"] == "PLANNING"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_sprint_default_status_is_planning(
    client: TestClient, auth_headers: dict, project_id: int
):
    resp = _create_sprint(client, auth_headers, project_id)
    assert resp.status_code == 201
    assert resp.json()["status"] == "PLANNING"


def test_create_sprint_with_explicit_status(
    client: TestClient, auth_headers: dict, project_id: int
):
    resp = _create_sprint(client, auth_headers, project_id, status="ACTIVE")
    assert resp.status_code == 201
    assert resp.json()["status"] == "ACTIVE"


def test_create_sprint_all_statuses(
    client: TestClient, auth_headers: dict, project_id: int
):
    for sprint_status in ("PLANNING", "ACTIVE", "COMPLETED"):
        resp = _create_sprint(
            client, auth_headers, project_id,
            name=f"Sprint {sprint_status}", status=sprint_status,
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == sprint_status


# ---------------------------------------------------------------------------
# create_sprint — error / access control
# ---------------------------------------------------------------------------

def test_create_sprint_missing_name(
    client: TestClient, auth_headers: dict, project_id: int
):
    resp = client.post(
        "/api/sprints",
        json={
            "start_date": "2026-06-01T00:00:00",
            "end_date": "2026-06-14T00:00:00",
            "project_id": project_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_sprint_missing_start_date(
    client: TestClient, auth_headers: dict, project_id: int
):
    resp = client.post(
        "/api/sprints",
        json={"name": "No Start", "end_date": "2026-06-14T00:00:00", "project_id": project_id},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_sprint_missing_end_date(
    client: TestClient, auth_headers: dict, project_id: int
):
    resp = client.post(
        "/api/sprints",
        json={
            "name": "No End",
            "start_date": "2026-06-01T00:00:00",
            "project_id": project_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_sprint_missing_project_id(
    client: TestClient, auth_headers: dict
):
    resp = client.post(
        "/api/sprints",
        json={
            "name": "No Project",
            "start_date": "2026-06-01T00:00:00",
            "end_date": "2026-06-14T00:00:00",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_sprint_nonexistent_project(
    client: TestClient, auth_headers: dict
):
    resp = _create_sprint(client, auth_headers, project_id=99999)
    assert resp.status_code in (403, 404)


def test_create_sprint_other_users_project(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """Cannot create a sprint in another user's project."""
    other_proj = client.post(
        "/api/projects", json={"name": "Other Project"}, headers=other_auth_headers
    ).json()["id"]
    resp = _create_sprint(client, auth_headers, other_proj)
    assert resp.status_code in (403, 404)


def test_create_sprint_invalid_status(
    client: TestClient, auth_headers: dict, project_id: int
):
    resp = _create_sprint(client, auth_headers, project_id, status="INVALID")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# list_sprints — happy path and edge cases
# ---------------------------------------------------------------------------

def test_list_sprints_empty(client: TestClient, auth_headers: dict, project_id: int):
    resp = client.get(f"/api/sprints?project_id={project_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_sprints(client: TestClient, auth_headers: dict, project_id: int):
    _create_sprint(client, auth_headers, project_id, name="Sprint A")
    _create_sprint(client, auth_headers, project_id, name="Sprint B")
    resp = client.get(f"/api/sprints?project_id={project_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_sprints_missing_project_id_param(
    client: TestClient, auth_headers: dict
):
    """project_id query param is required; omitting it should return 422."""
    resp = client.get("/api/sprints", headers=auth_headers)
    assert resp.status_code == 422


def test_list_sprints_does_not_return_other_users_sprints(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """A user must only see sprints in their own projects."""
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    _create_sprint(client, other_auth_headers, other_proj, name="Other's Sprint")

    # The primary user's project has no sprints, and the other project is not visible.
    own_proj = client.post(
        "/api/projects", json={"name": "My Project"}, headers=auth_headers
    ).json()["id"]
    resp = client.get(f"/api/sprints?project_id={own_proj}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_sprints_other_users_project_returns_empty(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """Requesting sprints for another user's project returns empty list (no 403/404)."""
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    _create_sprint(client, other_auth_headers, other_proj)

    resp = client.get(f"/api/sprints?project_id={other_proj}", headers=auth_headers)
    # Service filters by owner_id, so cross-project always returns []
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# get_sprint — happy path and error handling
# ---------------------------------------------------------------------------

def test_get_sprint(client: TestClient, auth_headers: dict, sprint_id: int):
    resp = client.get(f"/api/sprints/{sprint_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == sprint_id
    assert data["name"] == "Sprint 1"


def test_get_sprint_not_found(client: TestClient, auth_headers: dict):
    resp = client.get("/api/sprints/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_get_sprint_other_users_sprint(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """A user must not be able to fetch another user's sprint."""
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_sprint_id = _create_sprint(
        client, other_auth_headers, other_proj, name="Private Sprint"
    ).json()["id"]

    resp = client.get(f"/api/sprints/{other_sprint_id}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# update_sprint — happy path
# ---------------------------------------------------------------------------

def test_update_sprint_name(
    client: TestClient, auth_headers: dict, sprint_id: int
):
    resp = client.put(
        f"/api/sprints/{sprint_id}", json={"name": "Renamed Sprint"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed Sprint"


def test_update_sprint_status(
    client: TestClient, auth_headers: dict, sprint_id: int
):
    resp = client.put(
        f"/api/sprints/{sprint_id}", json={"status": "ACTIVE"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACTIVE"


def test_update_sprint_status_to_completed(
    client: TestClient, auth_headers: dict, sprint_id: int
):
    resp = client.put(
        f"/api/sprints/{sprint_id}", json={"status": "COMPLETED"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "COMPLETED"


def test_update_sprint_partial_preserves_unset_fields(
    client: TestClient, auth_headers: dict, project_id: int
):
    """A partial update must not clobber unspecified fields."""
    created = _create_sprint(
        client, auth_headers, project_id,
        name="Keep Fields",
        start_date="2026-08-01T00:00:00",
        end_date="2026-08-15T00:00:00",
        status="ACTIVE",
    ).json()
    sid = created["id"]

    resp = client.put(f"/api/sprints/{sid}", json={"name": "Changed Only"}, headers=auth_headers)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["name"] == "Changed Only"
    assert updated["status"] == "ACTIVE"
    # start_date and end_date should be unchanged (check they are present in response)
    assert "start_date" in updated
    assert "end_date" in updated


def test_update_sprint_dates(
    client: TestClient, auth_headers: dict, sprint_id: int
):
    resp = client.put(
        f"/api/sprints/{sprint_id}",
        json={
            "start_date": "2026-09-01T00:00:00",
            "end_date": "2026-09-30T00:00:00",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "2026-09-01" in data["start_date"]
    assert "2026-09-30" in data["end_date"]


# ---------------------------------------------------------------------------
# update_sprint — error handling
# ---------------------------------------------------------------------------

def test_update_sprint_not_found(client: TestClient, auth_headers: dict):
    resp = client.put("/api/sprints/99999", json={"name": "Ghost"}, headers=auth_headers)
    assert resp.status_code == 404


def test_update_sprint_other_users_sprint(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_sprint_id = _create_sprint(
        client, other_auth_headers, other_proj
    ).json()["id"]

    resp = client.put(
        f"/api/sprints/{other_sprint_id}", json={"name": "Hijacked"}, headers=auth_headers
    )
    assert resp.status_code == 404


def test_update_sprint_invalid_status(
    client: TestClient, auth_headers: dict, sprint_id: int
):
    resp = client.put(
        f"/api/sprints/{sprint_id}", json={"status": "NOPE"}, headers=auth_headers
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# delete_sprint — happy path and error handling
# ---------------------------------------------------------------------------

def test_delete_sprint(client: TestClient, auth_headers: dict, sprint_id: int):
    resp = client.delete(f"/api/sprints/{sprint_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Confirm it is gone
    resp = client.get(f"/api/sprints/{sprint_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_sprint_not_found(client: TestClient, auth_headers: dict):
    resp = client.delete("/api/sprints/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_sprint_other_users_sprint(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_sprint_id = _create_sprint(
        client, other_auth_headers, other_proj
    ).json()["id"]

    resp = client.delete(f"/api/sprints/{other_sprint_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_sprint_unauthenticated_explicit(client: TestClient, sprint_id: int):
    resp = client.delete(f"/api/sprints/{sprint_id}")
    assert resp.status_code == 401
