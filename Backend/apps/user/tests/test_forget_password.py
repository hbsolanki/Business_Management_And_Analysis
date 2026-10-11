import pytest
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def forget_pw_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.user = tc.owner_a
    tc.user.email = "test@example.com"
    tc.user.save()
    tc.validate_username_url = reverse('forget-validate-username')
    tc.validate_otp_url = reverse('forget-validate-otp')
    tc.reset_password_url = reverse('forget-reset')
    tc.forget_username_url = reverse('forget-forget-username')
    return tc


@pytest.mark.django_db
class TestForgetPassword:

    @patch('apps.master.tasks.send_otp_email.delay')
    def test_validate_username_sends_otp(self, mock_send_email, api_client, forget_pw_env):
        # Arrange
        sut_url = forget_pw_env.validate_username_url
        payload = {"username": forget_pw_env.user.username}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "OTP sent to t****@example.com" in sut_response.data["message"]
        assert cache.get(f"fp:{forget_pw_env.user.username}") is not None
        mock_send_email.assert_called_once()

    def test_validate_otp_success(self, api_client, forget_pw_env):
        # Arrange
        cache.set(f"fp:{forget_pw_env.user.username}", "123456", 180)
        sut_url = forget_pw_env.validate_otp_url
        payload = {"username": forget_pw_env.user.username, "otp": "123456"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert cache.get(f"fp_verified:{forget_pw_env.user.username}") is True

    def test_validate_otp_failure(self, api_client, forget_pw_env):
        # Arrange
        cache.set(f"fp:{forget_pw_env.user.username}", "123456", 180)
        sut_url = forget_pw_env.validate_otp_url
        payload = {"username": forget_pw_env.user.username, "otp": "000000"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_password_success(self, api_client, forget_pw_env):
        # Arrange
        cache.set(f"fp_verified:{forget_pw_env.user.username}", True, 120)
        sut_url = forget_pw_env.reset_password_url
        payload = {
            "username": forget_pw_env.user.username,
            "password": "NewPassword123!"
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        forget_pw_env.user.refresh_from_db()
        assert forget_pw_env.user.check_password("NewPassword123!") is True

    def test_reset_password_without_otp_verification(self, api_client, forget_pw_env):
        # Arrange
        sut_url = forget_pw_env.reset_password_url
        payload = {
            "username": forget_pw_env.user.username,
            "password": "NewPassword123!"
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    @patch('apps.user.tasks.send_username_email.delay')
    def test_forget_username_success(self, mock_send_email, api_client, forget_pw_env):
        # Arrange
        sut_url = forget_pw_env.forget_username_url
        payload = {"email": "test@example.com"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        mock_send_email.assert_called_once_with(to_email="test@example.com", username=forget_pw_env.user.username)

    def test_reset_password_weak_password(self, api_client, forget_pw_env):
        # Arrange
        cache.set(f"fp_verified:{forget_pw_env.user.username}", True, 120)
        sut_url = forget_pw_env.reset_password_url
        payload = {
            "username": forget_pw_env.user.username,
            "password": "abc",
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in sut_response.data
        forget_pw_env.user.refresh_from_db()
        assert forget_pw_env.user.check_password("abc") is False

    def test_forget_username_nonexistent_email_returns_same_message(self, api_client, forget_pw_env):
        # Arrange
        sut_url = forget_pw_env.forget_username_url
        payload = {"email": "doesnotexist@example.com"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "If the email exists" in sut_response.data["message"]

    def test_validate_username_nonexistent_returns_same_message(self, api_client, forget_pw_env):
        # Arrange
        sut_url = forget_pw_env.validate_username_url
        payload = {"username": "ghost_user_xyz"}

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "If the account exists" in sut_response.data["message"]

    def test_reset_without_verified_otp_forbidden(self, api_client, forget_pw_env):
        # Arrange
        cache.delete(f"fp_verified:{forget_pw_env.user.username}")
        sut_url = forget_pw_env.reset_password_url
        payload = {
            "username": forget_pw_env.user.username,
            "password": "ValidPass123!",
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN
