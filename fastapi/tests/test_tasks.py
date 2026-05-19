import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def project_id(client, auth_headers):
    """Create a project owned by the primary test user and return its id."""
    resp = client.post("/api/projects", json={"name": "Task Test Project"}, headers=auth_headers)
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


def _create_task(client, headers, project_id, **overrides):
    payload = {"title": "Default Task", "project_id": project_id, **overrides}
    return client.post("/api/tasks", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

def test_list_tasks_unauthenticated(client: TestClient):
    response = client.get("/api/tasks")
    assert response.status_code == 401


def test_create_task_unauthenticated(client: TestClient):
    response = client.post("/api/tasks", json={"title": "x", "project_id": 1})
    assert response.status_code == 401


def test_get_task_unauthenticated(client: TestClient):
    response = client.get("/api/tasks/1")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# create_task — happy path
# ---------------------------------------------------------------------------

def test_create_task(client: TestClient, auth_headers: dict, project_id: int):
    resp = _create_task(client, auth_headers, project_id, title="Test Task",
                        description="A test task", status="TODO", priority="MEDIUM")
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Task"
    assert data["description"] == "A test task"
    assert data["status"] == "TODO"
    assert data["priority"] == "MEDIUM"
    assert data["project_id"] == project_id
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_task_defaults(client: TestClient, auth_headers: dict, project_id: int):
    """Omitting status/priority should apply TODO and MEDIUM defaults."""
    resp = _create_task(client, auth_headers, project_id, title="Minimal Task")
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "TODO"
    assert data["priority"] == "MEDIUM"
    assert data["description"] is None
    assert data["assignee_id"] is None


def test_create_task_with_assignee(client: TestClient, auth_headers: dict, project_id: int,
                                   test_user):
    """Assigning a task to a user should succeed and persist the assignee_id."""
    resp = _create_task(client, auth_headers, project_id, title="Assigned Task",
                        assignee_id=test_user.id)
    assert resp.status_code == 201
    assert resp.json()["assignee_id"] == test_user.id


def test_create_task_all_statuses(client: TestClient, auth_headers: dict, project_id: int):
    for status in ("TODO", "IN_PROGRESS", "DONE"):
        resp = _create_task(client, auth_headers, project_id, title=f"Task {status}",
                            status=status)
        assert resp.status_code == 201
        assert resp.json()["status"] == status


def test_create_task_all_priorities(client: TestClient, auth_headers: dict, project_id: int):
    for priority in ("LOW", "MEDIUM", "HIGH", "URGENT"):
        resp = _create_task(client, auth_headers, project_id, title=f"Task {priority}",
                            priority=priority)
        assert resp.status_code == 201
        assert resp.json()["priority"] == priority


# ---------------------------------------------------------------------------
# create_task — error / access control
# ---------------------------------------------------------------------------

def test_create_task_forbidden_other_users_project(client: TestClient, auth_headers: dict,
                                                    other_auth_headers: dict):
    """Creating a task in another user's project must be rejected."""
    other_project = client.post(
        "/api/projects", json={"name": "Other Project"}, headers=other_auth_headers
    ).json()["id"]

    resp = _create_task(client, auth_headers, other_project, title="Stolen Task")
    assert resp.status_code in (403, 404)


def test_create_task_nonexistent_project(client: TestClient, auth_headers: dict):
    resp = _create_task(client, auth_headers, project_id=99999, title="Ghost Task")
    assert resp.status_code in (403, 404)


def test_create_task_missing_title(client: TestClient, auth_headers: dict, project_id: int):
    resp = client.post("/api/tasks", json={"project_id": project_id}, headers=auth_headers)
    assert resp.status_code == 422


def test_create_task_missing_project_id(client: TestClient, auth_headers: dict):
    resp = client.post("/api/tasks", json={"title": "No project"}, headers=auth_headers)
    assert resp.status_code == 422


def test_create_task_invalid_status(client: TestClient, auth_headers: dict, project_id: int):
    resp = _create_task(client, auth_headers, project_id, title="Bad Status", status="INVALID")
    assert resp.status_code == 422


def test_create_task_invalid_priority(client: TestClient, auth_headers: dict, project_id: int):
    resp = _create_task(client, auth_headers, project_id, title="Bad Priority", priority="CRITICAL")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# get_tasks — happy path and edge cases
# ---------------------------------------------------------------------------

def test_list_tasks_empty(client: TestClient, auth_headers: dict):
    resp = client.get("/api/tasks", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_tasks(client: TestClient, auth_headers: dict, project_id: int):
    _create_task(client, auth_headers, project_id, title="Task 1")
    _create_task(client, auth_headers, project_id, title="Task 2")

    resp = client.get("/api/tasks", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_tasks_by_project(client: TestClient, auth_headers: dict):
    proj1 = client.post("/api/projects", json={"name": "P1"}, headers=auth_headers).json()["id"]
    proj2 = client.post("/api/projects", json={"name": "P2"}, headers=auth_headers).json()["id"]
    _create_task(client, auth_headers, proj1, title="Task P1")
    _create_task(client, auth_headers, proj2, title="Task P2")

    resp = client.get(f"/api/tasks?project_id={proj1}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Task P1"


def test_list_tasks_does_not_return_other_users_tasks(client: TestClient, auth_headers: dict,
                                                       other_auth_headers: dict):
    """A user must only see tasks from their own projects."""
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    _create_task(client, other_auth_headers, other_proj, title="Theirs")

    resp = client.get("/api/tasks", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_tasks_project_filter_nonexistent(client: TestClient, auth_headers: dict):
    """Filtering by a project that doesn't exist should return an empty list."""
    resp = client.get("/api/tasks?project_id=99999", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_tasks_invalid_status_returns_422(client: TestClient, auth_headers: dict):
    """An unrecognized status value must be rejected with 422, not crash with 500."""
    resp = client.get("/api/tasks?status=invalid", headers=auth_headers)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# get_task — happy path and error handling
# ---------------------------------------------------------------------------

def test_get_task(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Fetch Me").json()["id"]
    resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == task_id
    assert resp.json()["title"] == "Fetch Me"


def test_get_task_not_found(client: TestClient, auth_headers: dict):
    resp = client.get("/api/tasks/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_get_task_other_users_task(client: TestClient, auth_headers: dict,
                                    other_auth_headers: dict):
    """A user must not be able to fetch another user's task."""
    other_proj = client.post(
        "/api/projects", json={"name": "Private P"}, headers=other_auth_headers
    ).json()["id"]
    task_id = _create_task(client, other_auth_headers, other_proj, title="Private Task").json()["id"]

    resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# update_task — happy path
# ---------------------------------------------------------------------------

def test_update_task_title(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Before").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"title": "After"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "After"


def test_update_task_status(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Move Me").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"status": "IN_PROGRESS"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "IN_PROGRESS"


def test_update_task_priority(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Escalate").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"priority": "URGENT"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["priority"] == "URGENT"


def test_update_task_partial_only_changes_specified_fields(client: TestClient,
                                                            auth_headers: dict, project_id: int):
    """A partial update must not clobber unspecified fields."""
    task = _create_task(client, auth_headers, project_id, title="Original",
                        description="Keep me", priority="HIGH").json()
    resp = client.put(f"/api/tasks/{task['id']}", json={"title": "Changed"}, headers=auth_headers)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["title"] == "Changed"
    assert updated["description"] == "Keep me"
    assert updated["priority"] == "HIGH"


def test_update_task_to_done_status(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Finish Me").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"status": "DONE"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "DONE"


def test_update_task_assign_user(client: TestClient, auth_headers: dict, project_id: int,
                                  test_user):
    task_id = _create_task(client, auth_headers, project_id, title="Assign Me").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"assignee_id": test_user.id},
                      headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["assignee_id"] == test_user.id


def test_update_task_clear_description(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Task",
                            description="Remove me").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"description": None}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["description"] is None


# ---------------------------------------------------------------------------
# update_task — error handling
# ---------------------------------------------------------------------------

def test_update_task_not_found(client: TestClient, auth_headers: dict):
    resp = client.put("/api/tasks/99999", json={"title": "Ghost"}, headers=auth_headers)
    assert resp.status_code == 404


def test_update_task_other_users_task(client: TestClient, auth_headers: dict,
                                       other_auth_headers: dict):
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    task_id = _create_task(client, other_auth_headers, other_proj, title="Theirs").json()["id"]

    resp = client.put(f"/api/tasks/{task_id}", json={"title": "Hijacked"}, headers=auth_headers)
    assert resp.status_code == 404


def test_update_task_invalid_status(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Task").json()["id"]
    resp = client.put(f"/api/tasks/{task_id}", json={"status": "NOPE"}, headers=auth_headers)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# delete_task — happy path and error handling
# ---------------------------------------------------------------------------

def test_delete_task(client: TestClient, auth_headers: dict, project_id: int):
    task_id = _create_task(client, auth_headers, project_id, title="Delete Me").json()["id"]
    resp = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Confirm it is gone
    resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_task_not_found(client: TestClient, auth_headers: dict):
    resp = client.delete("/api/tasks/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_task_other_users_task(client: TestClient, auth_headers: dict,
                                       other_auth_headers: dict):
    other_proj = client.post(
        "/api/projects", json={"name": "Other P"}, headers=other_auth_headers
    ).json()["id"]
    task_id = _create_task(client, other_auth_headers, other_proj, title="Theirs").json()["id"]

    resp = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_task_unauthenticated(client: TestClient):
    resp = client.delete("/api/tasks/1")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# notify_task_completed — race condition regression (Bug 5)
# ---------------------------------------------------------------------------

def test_update_to_done_fires_completion_notification_exactly_once(
    client: TestClient, auth_headers: dict, project_id: int
):
    """Transitioning a task from IN_PROGRESS to DONE fires exactly one notification."""
    from unittest.mock import patch

    task_id = _create_task(
        client, auth_headers, project_id, title="Notify Me", status="IN_PROGRESS"
    ).json()["id"]

    with patch("app.routers.tasks.notify_task_completed") as mock_notify:
        resp = client.put(f"/api/tasks/{task_id}", json={"status": "DONE"}, headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["status"] == "DONE"
    assert mock_notify.call_count == 1


def test_second_done_update_does_not_fire_duplicate_notification(
    client: TestClient, auth_headers: dict, project_id: int
):
    """Regression: a second PUT setting status=DONE on an already-DONE task must not
    fire notify_task_completed again (simulates two sequential updates same intent).

    Previously, the misleading re-fetch (confirmed = repo.get_by_id) created a false
    sense of correctness. The fix: use task.status directly so the second sequential
    request reads prior_status=DONE and skips the notification correctly.
    """
    from unittest.mock import patch

    task_id = _create_task(
        client, auth_headers, project_id, title="No Dupe", status="IN_PROGRESS"
    ).json()["id"]

    with patch("app.routers.tasks.notify_task_completed") as mock_notify:
        # First request: IN_PROGRESS → DONE, should notify once
        resp1 = client.put(f"/api/tasks/{task_id}", json={"status": "DONE"}, headers=auth_headers)
        # Second request: DONE → DONE, task already complete — must NOT fire again
        resp2 = client.put(f"/api/tasks/{task_id}", json={"status": "DONE"}, headers=auth_headers)

    assert resp1.status_code == 200
    assert resp2.status_code == 200
    # Both updates 200-OK, notification fired exactly once despite two DONE updates
    assert mock_notify.call_count == 1
