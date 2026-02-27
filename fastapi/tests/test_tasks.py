import pytest


def test_create_task(client, auth_headers):
    """Test creating a new task"""
    # Create a project first
    project_response = client.post(
        "/api/projects", json={"name": "Task Test Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    # Create a task
    response = client.post(
        "/api/tasks",
        json={
            "title": "Test Task",
            "description": "A test task",
            "status": "TODO",
            "priority": "MEDIUM",
            "project_id": project_id,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["status"] == "TODO"
    assert data["priority"] == "MEDIUM"
    assert data["project_id"] == project_id


def test_list_tasks(client, auth_headers):
    """Test listing tasks"""
    # Create a project
    project_response = client.post(
        "/api/projects", json={"name": "List Tasks Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    # Create tasks
    client.post(
        "/api/tasks",
        json={"title": "Task 1", "project_id": project_id},
        headers=auth_headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Task 2", "project_id": project_id},
        headers=auth_headers,
    )

    # List all tasks
    response = client.get("/api/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_list_tasks_by_project(client, auth_headers):
    """Test filtering tasks by project"""
    # Create two projects
    project1_response = client.post(
        "/api/projects", json={"name": "Project 1"}, headers=auth_headers
    )
    project1_id = project1_response.json()["id"]

    project2_response = client.post(
        "/api/projects", json={"name": "Project 2"}, headers=auth_headers
    )
    project2_id = project2_response.json()["id"]

    # Create tasks in different projects
    client.post(
        "/api/tasks", json={"title": "Task P1", "project_id": project1_id}, headers=auth_headers
    )
    client.post(
        "/api/tasks", json={"title": "Task P2", "project_id": project2_id}, headers=auth_headers
    )

    # Filter by project
    response = client.get(f"/api/tasks?project_id={project1_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Task P1"


# Intentional gap: Missing update task test
# Intentional gap: Missing delete task test
# Intentional gap: Missing test for task with assignee
# Intentional gap: Missing validation tests
