import pytest
from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.user.views.user_view import LoginThrottle


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.login_url = reverse('user-login')
    tc.logout_url = reverse('user-logout')
    return tc


@pytest.mark.django_db
class TestUserAuth:

    def test_login_success(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.login_url
        payload = {
            "username": auth_env.owner_a.username,
            "password": "password123"
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert 'access' in sut_response.data
        assert sut_response.data['user']['id'] == auth_env.owner_a.id

    def test_login_invalid_credentials(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.login_url
        payload = {
            "username": auth_env.owner_a.username,
            "password": "wrongpassword"
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.logout_url
        api_client.force_authenticate(user=auth_env.owner_a)

        # Act
        sut_response = api_client.post(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        auth_env.owner_a.refresh_from_db()
        assert auth_env.owner_a.last_login is None

    def test_login_inactive_user(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.login_url
        auth_env.owner_a.is_active = False
        auth_env.owner_a.save(update_fields=["is_active"])
        payload = {
            "username": auth_env.owner_a.username,
            "password": "password123",
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "error" in sut_response.data

    def test_login_missing_fields(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.login_url

        # Act & Assert - missing password
        sut_res1 = api_client.post(sut_url, {"username": auth_env.owner_a.username})
        assert sut_res1.status_code == status.HTTP_400_BAD_REQUEST

        # Act & Assert - missing username
        sut_res2 = api_client.post(sut_url, {"password": "password123"})
        assert sut_res2.status_code == status.HTTP_400_BAD_REQUEST

        # Act & Assert - missing both
        sut_res3 = api_client.post(sut_url, {})
        assert sut_res3.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_throttle(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.login_url
        payload = {"username": auth_env.owner_a.username, "password": "wrong"}

        # Act & Assert
        with patch.object(LoginThrottle, "allow_request", return_value=False), \
             patch.object(LoginThrottle, "wait", return_value=60):
            sut_response = api_client.post(sut_url, payload)
        assert sut_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_logout_unauthenticated(self, api_client, auth_env):
        # Arrange
        sut_url = auth_env.logout_url

        # Act
        sut_response = api_client.post(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED
