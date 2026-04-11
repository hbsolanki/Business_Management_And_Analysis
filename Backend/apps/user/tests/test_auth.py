from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase

class UserAuthTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.login_url = reverse('login')
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
