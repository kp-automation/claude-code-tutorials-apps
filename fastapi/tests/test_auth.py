import pytest


def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "name": "New User",
            "password": "securepass123",
            "role": "MEMBER",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["name"] == "New User"
    assert "id" in data
    assert "password" not in data


def test_login(client, test_user):
    """Test user login"""
    response = client.post(
        "/api/auth/login", json={"email": "test@example.com", "password": "testpass123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"


def test_get_current_user(client, auth_headers):
    """Test getting current user info"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"


# Intentional gap: Missing test for duplicate email registration
# Intentional gap: Missing test for invalid login credentials
