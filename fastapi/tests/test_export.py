import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def project_id(client, auth_headers):
    resp = client.post(
        "/api/projects", json={"name": "Export Test Project"}, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
def other_auth_headers(client):
    client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "name": "Other User", "password": "otherpass123"},
    )
    resp = client.post(
        "/api/auth/login", json={"email": "other@example.com", "password": "otherpass123"}
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

def test_export_unauthenticated(client: TestClient):
    resp = client.get("/api/projects/1/export")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Ownership / not-found checks
# ---------------------------------------------------------------------------

def test_export_project_not_found(client: TestClient, auth_headers):
    resp = client.get("/api/projects/9999/export", headers=auth_headers)
    assert resp.status_code == 404


def test_export_forbidden_for_other_user(
    client: TestClient, auth_headers, other_auth_headers, project_id
):
    resp = client.get(f"/api/projects/{project_id}/export", headers=other_auth_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Happy-path: empty project
# ---------------------------------------------------------------------------

def test_export_empty_project_returns_header_row(
    client: TestClient, auth_headers, project_id
):
    resp = client.get(f"/api/projects/{project_id}/export", headers=auth_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers["content-disposition"]
    assert f"tasks-{project_id}.csv" in resp.headers["content-disposition"]

    lines = resp.text.strip().split("\n")
    assert len(lines) == 1
    assert lines[0] == "id,title,description,status,priority,assignee,labels,created_at,updated_at"


# ---------------------------------------------------------------------------
# Happy-path: project with tasks
# ---------------------------------------------------------------------------

def test_export_includes_task_rows(client: TestClient, auth_headers, project_id):
    client.post(
        "/api/tasks",
        json={"title": "Alpha Task", "project_id": project_id, "status": "TODO", "priority": "HIGH"},
        headers=auth_headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Beta Task", "project_id": project_id, "status": "DONE", "priority": "LOW"},
        headers=auth_headers,
    )

    resp = client.get(f"/api/projects/{project_id}/export", headers=auth_headers)
    assert resp.status_code == 200

    lines = resp.text.strip().split("\n")
    assert len(lines) == 3  # header + 2 tasks
    body = resp.text
    assert "Alpha Task" in body
    assert "Beta Task" in body
    assert "TODO" in body
    assert "HIGH" in body
    assert "DONE" in body
    assert "LOW" in body


def test_export_row_contains_all_columns(client: TestClient, auth_headers, project_id):
    client.post(
        "/api/tasks",
        json={"title": "Single Task", "project_id": project_id},
        headers=auth_headers,
    )
    resp = client.get(f"/api/projects/{project_id}/export", headers=auth_headers)
    assert resp.status_code == 200

    lines = resp.text.strip().split("\n")
    assert len(lines) == 2
    # Header has 9 columns
    header_cols = lines[0].split(",")
    assert len(header_cols) == 9
    # Data row also has 9 columns
    data_cols = lines[1].split(",")
    assert len(data_cols) == 9


def test_export_isolates_projects_between_users(
    client: TestClient, auth_headers, other_auth_headers
):
    """Tasks from one user's project must not appear in another user's export."""
    other_project = client.post(
        "/api/projects", json={"name": "Other Project"}, headers=other_auth_headers
    ).json()["id"]
    client.post(
        "/api/tasks",
        json={"title": "Secret Task", "project_id": other_project},
        headers=other_auth_headers,
    )

    my_project = client.post(
        "/api/projects", json={"name": "My Project"}, headers=auth_headers
    ).json()["id"]
    resp = client.get(f"/api/projects/{my_project}/export", headers=auth_headers)
    assert resp.status_code == 200
    assert "Secret Task" not in resp.text
