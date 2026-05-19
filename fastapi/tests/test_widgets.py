import pytest
from fastapi.testclient import TestClient


def test_list_widgets_unauthenticated(client: TestClient):
    response = client.get("/api/widgets")
    assert response.status_code == 401


def test_create_widget(client: TestClient, auth_headers: dict):
    payload = {"name": "Test Widget"}
    response = client.post("/api/widgets", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert "id" in data


def test_get_widget(client: TestClient, auth_headers: dict):
    created = client.post(
        "/api/widgets", json={"name": "Fetch Me"}, headers=auth_headers
    ).json()
    response = client.get(f"/api/widgets/{created['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_widget(client: TestClient, auth_headers: dict):
    created = client.post(
        "/api/widgets", json={"name": "Before"}, headers=auth_headers
    ).json()
    response = client.put(
        f"/api/widgets/{created['id']}", json={"name": "After"}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "After"


def test_delete_widget(client: TestClient, auth_headers: dict):
    created = client.post(
        "/api/widgets", json={"name": "Delete Me"}, headers=auth_headers
    ).json()
    response = client.delete(f"/api/widgets/{created['id']}", headers=auth_headers)
    assert response.status_code == 204


def test_widget_not_found(client: TestClient, auth_headers: dict):
    response = client.get("/api/widgets/99999", headers=auth_headers)
    assert response.status_code == 404
