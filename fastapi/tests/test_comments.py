"""Integration tests for the comments endpoints.

Routes under test (all nested under /api/tasks):
  GET  /api/tasks/{task_id}/comments
  POST /api/tasks/{task_id}/comments

Intentional inconsistency (preserved from source):
  GET  raises NotFoundException  -> 404 when task not found / not owned.
  POST raises ForbiddenException -> 403 for the same condition.
"""

import pytest
from fastapi.testclient import TestClient
from app.models.notification import Notification


# ---------------------------------------------------------------------------
# Local fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def project_id(client, auth_headers):
    resp = client.post(
        "/api/projects",
        json={"name": "Comment Test Project"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def task_id(client, auth_headers, project_id):
    resp = client.post(
        "/api/tasks",
        json={"title": "Comment Test Task", "project_id": project_id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def other_auth_headers(client):
    """Registers a second user and returns their auth headers."""
    client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "name": "Other User", "password": "otherpass123"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "other@example.com", "password": "otherpass123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_comment(client, headers, task_id, content="A test comment"):
    return client.post(
        f"/api/tasks/{task_id}/comments",
        json={"content": content},
        headers=headers,
    )


# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

def test_get_comments_unauthenticated(client: TestClient, task_id: int):
    resp = client.get(f"/api/tasks/{task_id}/comments")
    assert resp.status_code == 401


def test_create_comment_unauthenticated(client: TestClient, task_id: int):
    resp = client.post(
        f"/api/tasks/{task_id}/comments",
        json={"content": "sneaky comment"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/tasks/{task_id}/comments — happy path
# ---------------------------------------------------------------------------

def test_get_comments_empty_list(client: TestClient, auth_headers: dict, task_id: int):
    resp = client.get(f"/api/tasks/{task_id}/comments", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_comments_returns_all_comments_for_task(
    client: TestClient, auth_headers: dict, task_id: int
):
    _create_comment(client, auth_headers, task_id, "First comment")
    _create_comment(client, auth_headers, task_id, "Second comment")

    resp = client.get(f"/api/tasks/{task_id}/comments", headers=auth_headers)
    assert resp.status_code == 200
    bodies = [c["content"] for c in resp.json()]
    assert "First comment" in bodies
    assert "Second comment" in bodies


def test_get_comments_response_shape(
    client: TestClient, auth_headers: dict, task_id: int
):
    _create_comment(client, auth_headers, task_id, "Shape check")

    resp = client.get(f"/api/tasks/{task_id}/comments", headers=auth_headers)
    assert resp.status_code == 200
    comment = resp.json()[0]
    assert set(comment.keys()) >= {"id", "content", "task_id", "author_id", "created_at", "updated_at"}


def test_get_comments_only_returns_comments_for_requested_task(
    client: TestClient, auth_headers: dict, project_id: int
):
    task_a = client.post(
        "/api/tasks",
        json={"title": "Task A", "project_id": project_id},
        headers=auth_headers,
    ).json()["id"]
    task_b = client.post(
        "/api/tasks",
        json={"title": "Task B", "project_id": project_id},
        headers=auth_headers,
    ).json()["id"]

    _create_comment(client, auth_headers, task_a, "Comment on A")
    _create_comment(client, auth_headers, task_b, "Comment on B")

    resp = client.get(f"/api/tasks/{task_a}/comments", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["content"] == "Comment on A"


# ---------------------------------------------------------------------------
# GET /api/tasks/{task_id}/comments — error / access control
# ---------------------------------------------------------------------------

def test_get_comments_task_not_found(client: TestClient, auth_headers: dict):
    resp = client.get("/api/tasks/99999/comments", headers=auth_headers)
    assert resp.status_code == 404


def test_get_comments_other_users_task_returns_404(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    other_project = client.post(
        "/api/projects",
        json={"name": "Other Project"},
        headers=other_auth_headers,
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Other Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]

    resp = client.get(f"/api/tasks/{other_task}/comments", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/tasks/{task_id}/comments — happy path
# ---------------------------------------------------------------------------

def test_create_comment(client: TestClient, auth_headers: dict, task_id: int):
    resp = _create_comment(client, auth_headers, task_id, "Hello world")
    assert resp.status_code == 201
    assert resp.json()["content"] == "Hello world"


def test_create_comment_response_shape(
    client: TestClient, auth_headers: dict, task_id: int
):
    resp = _create_comment(client, auth_headers, task_id, "Shape test")
    assert resp.status_code == 201
    data = resp.json()
    assert set(data.keys()) >= {"id", "content", "task_id", "author_id", "created_at", "updated_at"}
    assert isinstance(data["id"], int)
    assert data["task_id"] == task_id


def test_create_comment_sets_author_id_to_current_user(
    client: TestClient, auth_headers: dict, task_id: int, test_user
):
    resp = _create_comment(client, auth_headers, task_id, "Authored by test_user")
    assert resp.status_code == 201
    assert resp.json()["author_id"] == test_user.id


def test_create_comment_persists_and_appears_in_get(
    client: TestClient, auth_headers: dict, task_id: int
):
    comment_id = _create_comment(client, auth_headers, task_id, "Persist me").json()["id"]

    resp = client.get(f"/api/tasks/{task_id}/comments", headers=auth_headers)
    assert resp.status_code == 200
    assert comment_id in [c["id"] for c in resp.json()]


def test_create_multiple_comments_on_same_task(
    client: TestClient, auth_headers: dict, task_id: int
):
    for i in range(3):
        resp = _create_comment(client, auth_headers, task_id, f"Comment {i}")
        assert resp.status_code == 201

    resp = client.get(f"/api/tasks/{task_id}/comments", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_create_comment_preserves_content_exactly(
    client: TestClient, auth_headers: dict, task_id: int
):
    content = "Exact: @alice — see task #42, done?"
    resp = _create_comment(client, auth_headers, task_id, content)
    assert resp.status_code == 201
    assert resp.json()["content"] == content


# ---------------------------------------------------------------------------
# POST /api/tasks/{task_id}/comments — error / access control
#
# Intentional inconsistency: POST raises ForbiddenException (403) instead of
# NotFoundException (404) when task is absent or owned by another user.
# ---------------------------------------------------------------------------

def test_create_comment_task_not_found_returns_403(
    client: TestClient, auth_headers: dict
):
    resp = _create_comment(client, auth_headers, task_id=99999)
    assert resp.status_code == 403


def test_create_comment_other_users_task_returns_403(
    client: TestClient, auth_headers: dict, other_auth_headers: dict
):
    other_project = client.post(
        "/api/projects",
        json={"name": "Other Project"},
        headers=other_auth_headers,
    ).json()["id"]
    other_task = client.post(
        "/api/tasks",
        json={"title": "Private Task", "project_id": other_project},
        headers=other_auth_headers,
    ).json()["id"]

    resp = _create_comment(client, auth_headers, other_task, "Sneaky")
    assert resp.status_code == 403


def test_create_comment_missing_content_returns_422(
    client: TestClient, auth_headers: dict, task_id: int
):
    resp = client.post(
        f"/api/tasks/{task_id}/comments",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# notify_mentions integration
# Notifications are written to the same test DB, so we can assert on them directly.
# ---------------------------------------------------------------------------

def test_create_comment_without_mention_creates_no_notifications(
    client: TestClient, auth_headers: dict, task_id: int, db
):
    _create_comment(client, auth_headers, task_id, "No mention here")
    assert db.query(Notification).count() == 0


def test_create_comment_mentioning_nonexistent_user_creates_no_notifications(
    client: TestClient, auth_headers: dict, task_id: int, db
):
    _create_comment(client, auth_headers, task_id, "Hey @ghostuser, check this out")
    assert db.query(Notification).count() == 0


def test_create_comment_with_mention_creates_notification(
    client: TestClient, auth_headers: dict, task_id: int, db
):
    # Register a user whose lowercase name matches the @handle.
    client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "name": "alice", "password": "alicepass123"},
    )

    resp = _create_comment(client, auth_headers, task_id, "Hey @alice, please review")
    assert resp.status_code == 201
    comment_id = resp.json()["id"]

    notification = db.query(Notification).first()
    assert notification is not None
    assert notification.type.value == "MENTION"
    assert notification.task_id == task_id
    assert notification.comment_id == comment_id


def test_create_comment_mention_sets_correct_recipient(
    client: TestClient, auth_headers: dict, task_id: int, db
):
    bob_id = client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "name": "bob", "password": "bobpass123"},
    ).json()["id"]

    _create_comment(client, auth_headers, task_id, "Thanks @bob!")

    notification = db.query(Notification).filter_by(type="MENTION").first()
    assert notification is not None
    assert notification.user_id == bob_id


def test_create_comment_self_mention_creates_no_notification(
    client: TestClient, db
):
    # Create a user whose name equals their @handle so we can test self-exclusion.
    client.post(
        "/api/auth/register",
        json={"email": "selfuser@example.com", "name": "selfuser", "password": "selfpass123"},
    )
    self_resp = client.post(
        "/api/auth/login",
        json={"email": "selfuser@example.com", "password": "selfpass123"},
    )
    self_headers = {"Authorization": f"Bearer {self_resp.json()['access_token']}"}

    proj = client.post(
        "/api/projects", json={"name": "Self Project"}, headers=self_headers
    ).json()["id"]
    self_task = client.post(
        "/api/tasks",
        json={"title": "Self Task", "project_id": proj},
        headers=self_headers,
    ).json()["id"]

    resp = _create_comment(client, self_headers, self_task, "I did this @selfuser!")
    assert resp.status_code == 201

    # notify_mentions excludes the actor, so no notification is created.
    assert db.query(Notification).count() == 0


def test_create_comment_with_multiple_mentions_notifies_each_user(
    client: TestClient, auth_headers: dict, task_id: int, db
):
    alice_id = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "name": "alice", "password": "alicepass123"},
    ).json()["id"]
    bob_id = client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "name": "bob", "password": "bobpass123"},
    ).json()["id"]

    _create_comment(client, auth_headers, task_id, "@alice and @bob please review")

    notifications = db.query(Notification).filter_by(type="MENTION").all()
    assert len(notifications) == 2
    notified_ids = {n.user_id for n in notifications}
    assert alice_id in notified_ids
    assert bob_id in notified_ids
