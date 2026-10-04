from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.user.views.user_view import LoginThrottle


class UserAuthTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.login_url = reverse('user-login')
        self.logout_url = reverse('user-logout')

    def test_login_success(self):
        """Login success."""
        data = {
            "username": self.owner_a.username,
            "password": "password123"
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['id'], self.owner_a.id)

    def test_login_invalid_credentials(self):
        """Login failure."""
        data = {
            "username": self.owner_a.username,
            "password": "wrongpassword"
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        """Logout success."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.owner_a.refresh_from_db()
        self.assertIsNone(self.owner_a.last_login)

    def test_login_inactive_user(self):
        """Inactive user rejected even with correct credentials."""
        self.owner_a.is_active = False
        self.owner_a.save(update_fields=["is_active"])
        response = self.client.post(self.login_url, {
            "username": self.owner_a.username,
            "password": "password123",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.data)

    def test_login_missing_fields(self):
        """Missing username or password returns 400."""
        response = self.client.post(self.login_url, {"username": self.owner_a.username})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(self.login_url, {"password": "password123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(self.login_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_throttle(self):
        """Throttled request returns 429."""
        data = {"username": self.owner_a.username, "password": "wrong"}
        with patch.object(LoginThrottle, "allow_request", return_value=False), \
             patch.object(LoginThrottle, "wait", return_value=60):
            response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_logout_unauthenticated(self):
        """Unauthenticated logout returns 401."""
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
