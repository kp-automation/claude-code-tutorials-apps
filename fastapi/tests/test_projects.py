import pytest
from app.models.project import ProjectStatus


def test_create_project(client, auth_headers):
    """Test creating a new project"""
    response = client.post(
        "/api/projects",
        json={"name": "Test Project", "description": "A test project", "status": "ACTIVE"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert data["status"] == "ACTIVE"
    assert "id" in data
    assert "created_at" in data


def test_list_projects(client, auth_headers):
    """Test listing projects"""
    # Create a project first
    client.post(
        "/api/projects",
        json={"name": "Project 1", "description": "First project"},
        headers=auth_headers,
    )
    client.post(
        "/api/projects", json={"name": "Project 2", "description": "Second project"}, headers=auth_headers
    )

    # List projects
    response = client.get("/api/projects", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Project 1"
    assert data[1]["name"] == "Project 2"


def test_get_project(client, auth_headers):
    """Test getting a specific project"""
    # Create a project
    create_response = client.post(
        "/api/projects", json={"name": "Get Test Project"}, headers=auth_headers
    )
    project_id = create_response.json()["id"]

    # Get the project
    response = client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Get Test Project"
    assert data["id"] == project_id


def test_update_project(client, auth_headers):
    """Test updating a project"""
    # Create a project
    create_response = client.post(
        "/api/projects", json={"name": "Old Name", "status": "ACTIVE"}, headers=auth_headers
    )
    project_id = create_response.json()["id"]

    # Update the project
    response = client.put(
        f"/api/projects/{project_id}",
        json={"name": "New Name", "status": "ARCHIVED"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["status"] == "ARCHIVED"


# Intentional gap: Missing delete project test
# Intentional gap: Missing test for unauthorized access
# Intentional gap: Missing test for invalid project ID
