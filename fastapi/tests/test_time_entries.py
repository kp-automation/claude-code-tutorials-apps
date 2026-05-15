import pytest
from fastapi.testclient import TestClient
from app.models.user import User, UserRole
from app.models.time_entry import TimeEntry
from app.utils.security import get_password_hash


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def project_id(client, auth_headers):
    """Create a project owned by the primary test user and return its id."""
    resp = client.post("/api/projects", json={"name": "Time Entry Project"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def task_id(client, auth_headers, project_id):
    """Create a task in the project and return its id."""
    resp = client.post(
        "/api/tasks",
        json={"title": "Time Test Task", "project_id": project_id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def other_auth_headers(client):
    """Register and authenticate a second user, return auth headers."""
    client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "name": "Other User", "password": "otherpass123"},
    )
    resp = client.post(
        "/api/auth/login", json={"email": "other@example.com", "password": "otherpass123"}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_entry(client, headers, task_id, duration_seconds=3600, description=None):
    payload = {"duration_seconds": duration_seconds}
    if description is not None:
        payload["description"] = description
    return client.post(f"/api/tasks/{task_id}/time-entries", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Authentication guards
# ---------------------------------------------------------------------------

def test_list_entries_unauthenticated(client: TestClient, task_id: int):
    resp = client.get(f"/api/tasks/{task_id}/time-entries")
    assert resp.status_code == 401


def test_create_entry_unauthenticated(client: TestClient, task_id: int):
    resp = client.post(
        f"/api/tasks/{task_id}/time-entries", json={"duration_seconds": 3600}
    )
    assert resp.status_code == 401


def test_update_entry_unauthenticated(client: TestClient):
    resp = client.patch("/api/time-entries/1", json={"duration_seconds": 1800})
    assert resp.status_code == 401


def test_delete_entry_unauthenticated(client: TestClient):
    resp = client.delete("/api/time-entries/1")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# create_time_entry — happy path
# ---------------------------------------------------------------------------

def test_create_time_entry(client: TestClient, auth_headers: dict, task_id: int, test_user):
    resp = _create_entry(client, auth_headers, task_id, duration_seconds=3600, description="Work session")
    assert resp.status_code == 201
    data = resp.json()
    assert data["duration_seconds"] == 3600
    assert data["description"] == "Work session"
    assert data["task_id"] == task_id
    assert data["user_id"] == test_user.id
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_time_entry_no_description(client: TestClient, auth_headers: dict, task_id: int):
    resp = _create_entry(client, auth_headers, task_id, duration_seconds=1800)
    assert resp.status_code == 201
    assert resp.json()["description"] is None


# ---------------------------------------------------------------------------
# create_time_entry — invalid duration validation
# ---------------------------------------------------------------------------

def test_create_entry_zero_duration(client: TestClient, auth_headers: dict, task_id: int):
    """Duration of 0 must be rejected with 422."""
    resp = client.post(
        f"/api/tasks/{task_id}/time-entries",
        json={"duration_seconds": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_entry_negative_duration(client: TestClient, auth_headers: dict, task_id: int):
    """Negative duration must be rejected with 422."""
    resp = client.post(
        f"/api/tasks/{task_id}/time-entries",
        json={"duration_seconds": -100},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_entry_missing_duration(client: TestClient, auth_headers: dict, task_id: int):
    """Missing duration_seconds must be rejected with 422."""
    resp = client.post(
        f"/api/tasks/{task_id}/time-entries",
        json={"description": "no duration"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# create_time_entry — access control
# ---------------------------------------------------------------------------

def test_create_entry_task_not_found(client: TestClient, auth_headers: dict):
    resp = client.post(
        "/api/tasks/99999/time-entries",
        json={"duration_seconds": 3600},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_create_entry_other_users_task(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """Creating an entry on another user's task must be rejected."""
    other_project = client.post(
        "/api/projects", json={"name": "Other Project"}, headers=other_auth_headers
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Other Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]

    resp = client.post(
        f"/api/tasks/{other_task}/time-entries",
        json={"duration_seconds": 3600},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# get_time_entries — happy path
# ---------------------------------------------------------------------------

def test_list_time_entries_empty(client: TestClient, auth_headers: dict, task_id: int):
    resp = client.get(f"/api/tasks/{task_id}/time-entries", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_time_entries(client: TestClient, auth_headers: dict, task_id: int):
    _create_entry(client, auth_headers, task_id, duration_seconds=1800)
    _create_entry(client, auth_headers, task_id, duration_seconds=3600)

    resp = client.get(f"/api/tasks/{task_id}/time-entries", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    # Ordered newest-first
    assert data[0]["duration_seconds"] == 3600
    assert data[1]["duration_seconds"] == 1800


def test_list_time_entries_task_not_found(client: TestClient, auth_headers: dict):
    resp = client.get("/api/tasks/99999/time-entries", headers=auth_headers)
    assert resp.status_code == 404


def test_list_time_entries_other_users_task(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """Cannot list entries on another user's task."""
    other_project = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Private Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]

    resp = client.get(f"/api/tasks/{other_task}/time-entries", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# update_time_entry — happy path
# ---------------------------------------------------------------------------

def test_update_time_entry_duration(
    client: TestClient, auth_headers: dict, task_id: int
):
    entry_id = _create_entry(client, auth_headers, task_id, duration_seconds=3600).json()["id"]
    resp = client.patch(
        f"/api/time-entries/{entry_id}",
        json={"duration_seconds": 7200},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["duration_seconds"] == 7200


def test_update_time_entry_description(
    client: TestClient, auth_headers: dict, task_id: int
):
    entry_id = _create_entry(client, auth_headers, task_id, description="Old desc").json()["id"]
    resp = client.patch(
        f"/api/time-entries/{entry_id}",
        json={"description": "New desc"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "New desc"


def test_update_time_entry_partial_only_changes_specified_fields(
    client: TestClient, auth_headers: dict, task_id: int
):
    """Partial update must not clobber unspecified fields."""
    entry_id = _create_entry(
        client, auth_headers, task_id, duration_seconds=3600, description="Keep me"
    ).json()["id"]
    resp = client.patch(
        f"/api/time-entries/{entry_id}",
        json={"duration_seconds": 1800},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["duration_seconds"] == 1800
    assert data["description"] == "Keep me"


def test_update_time_entry_empty_body_returns_unchanged(
    client: TestClient, auth_headers: dict, task_id: int
):
    """PATCH with empty body returns entry unchanged."""
    entry_id = _create_entry(client, auth_headers, task_id, duration_seconds=3600).json()["id"]
    resp = client.patch(f"/api/time-entries/{entry_id}", json={}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["duration_seconds"] == 3600


# ---------------------------------------------------------------------------
# update_time_entry — error handling
# ---------------------------------------------------------------------------

def test_update_entry_zero_duration_rejected(
    client: TestClient, auth_headers: dict, task_id: int
):
    entry_id = _create_entry(client, auth_headers, task_id, duration_seconds=3600).json()["id"]
    resp = client.patch(
        f"/api/time-entries/{entry_id}",
        json={"duration_seconds": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_update_entry_not_found(client: TestClient, auth_headers: dict):
    resp = client.patch(
        "/api/time-entries/99999", json={"duration_seconds": 1800}, headers=auth_headers
    )
    assert resp.status_code == 404


def test_update_entry_other_users_entry(
    client: TestClient, auth_headers: dict, other_auth_headers: dict, task_id: int
):
    """Cannot update another user's time entry."""
    # other user creates their own project and task
    other_project = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Other Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]
    other_entry_id = _create_entry(
        client, other_auth_headers, other_task, duration_seconds=3600
    ).json()["id"]

    resp = client.patch(
        f"/api/time-entries/{other_entry_id}",
        json={"duration_seconds": 1800},
        headers=auth_headers,
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# delete_time_entry — happy path and error handling
# ---------------------------------------------------------------------------

def test_delete_time_entry(client: TestClient, auth_headers: dict, task_id: int):
    entry_id = _create_entry(client, auth_headers, task_id, duration_seconds=3600).json()["id"]
    resp = client.delete(f"/api/time-entries/{entry_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Confirm it is gone — list should be empty
    entries = client.get(f"/api/tasks/{task_id}/time-entries", headers=auth_headers).json()
    assert entries == []


def test_delete_entry_not_found(client: TestClient, auth_headers: dict):
    resp = client.delete("/api/time-entries/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_entry_other_users_entry(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """Cannot delete another user's time entry."""
    other_project = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Other Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]
    other_entry_id = _create_entry(
        client, other_auth_headers, other_task, duration_seconds=3600
    ).json()["id"]

    resp = client.delete(f"/api/time-entries/{other_entry_id}", headers=auth_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# time report endpoint
# ---------------------------------------------------------------------------

def test_time_report_empty(client: TestClient, auth_headers: dict, project_id: int):
    """Time report for a project with no entries returns empty array."""
    resp = client.get(f"/api/projects/{project_id}/time-report", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_time_report(client: TestClient, auth_headers: dict, project_id: int, task_id: int, test_user):
    """Time report aggregates correctly."""
    _create_entry(client, auth_headers, task_id, duration_seconds=3600)
    _create_entry(client, auth_headers, task_id, duration_seconds=1800)

    resp = client.get(f"/api/projects/{project_id}/time-report", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    row = data[0]
    assert row["userId"] == test_user.id
    assert row["totalSeconds"] == 5400  # 3600 + 1800
    assert row["entryCount"] == 2
    assert row["userName"] == test_user.name
    assert row["userEmail"] == test_user.email


def test_time_report_multiple_users(
    client: TestClient, auth_headers: dict, project_id: int, task_id: int, other_auth_headers: dict
):
    """Time report groups totals separately per user."""
    # Primary user logs time on their own project
    _create_entry(client, auth_headers, task_id, duration_seconds=3600)

    # Another user also owns a project with a task — should NOT appear in primary user's report
    other_project = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Other Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]
    _create_entry(client, other_auth_headers, other_task, duration_seconds=7200)

    resp = client.get(f"/api/projects/{project_id}/time-report", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    # Only the primary user's entries for primary user's project
    assert len(data) == 1
    assert data[0]["totalSeconds"] == 3600


def test_time_report_project_not_found(client: TestClient, auth_headers: dict):
    resp = client.get("/api/projects/99999/time-report", headers=auth_headers)
    assert resp.status_code == 404


def test_time_report_other_users_project(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    """Cannot access time report for a project the caller does not own."""
    other_project = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]

    resp = client.get(f"/api/projects/{other_project}/time-report", headers=auth_headers)
    assert resp.status_code == 404


def test_time_report_unauthenticated(client: TestClient, project_id: int):
    resp = client.get(f"/api/projects/{project_id}/time-report")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# cascade delete — task deletion removes entries
# ---------------------------------------------------------------------------

def test_cascade_delete_task_removes_entries(
    client: TestClient, auth_headers: dict, project_id: int, task_id: int
):
    """Deleting a task cascades to its time entries."""
    _create_entry(client, auth_headers, task_id, duration_seconds=3600)
    _create_entry(client, auth_headers, task_id, duration_seconds=1800)

    # Delete the task
    resp = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Create a new task to verify entries don't linger
    new_task_id = client.post(
        "/api/tasks",
        json={"title": "Fresh Task", "project_id": project_id},
        headers=auth_headers,
    ).json()["id"]

    # The old task's entries are gone — verify by checking the project report is empty for new task
    resp = client.get(f"/api/projects/{project_id}/time-report", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# cascade delete — user deletion removes entries
# ---------------------------------------------------------------------------

def test_cascade_delete_user_removes_entries(
    client: TestClient, auth_headers: dict, task_id: int, db
):
    """Deleting a user cascades to their authored time entries."""
    # Create a second user directly via the DB fixture (no projects/tasks owned)
    second_user = User(
        email="second@example.com",
        name="Second User",
        role=UserRole.MEMBER,
        password_hash=get_password_hash("secondpass123"),
    )
    db.add(second_user)
    db.commit()
    db.refresh(second_user)

    # Create a time entry directly in the DB attributed to the second user
    # (bypasses API ownership rules — we only need to test the DB cascade)
    entry = TimeEntry(
        duration_seconds=900,
        description="Second user's work",
        task_id=task_id,
        user_id=second_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    entry_id = entry.id

    # Verify the entry exists
    assert db.query(TimeEntry).filter(TimeEntry.id == entry_id).first() is not None

    # Delete the second user; SQLAlchemy cascade should remove their time entries
    db.delete(second_user)
    db.commit()

    # The time entry should have been cascade-deleted
    assert db.query(TimeEntry).filter(TimeEntry.id == entry_id).first() is None
