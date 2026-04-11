from django.urls import reverse
from rest_framework import status
from django.core.cache import cache
from unittest.mock import patch
from apps.base.tests import BaseTestCase

class ForgetPasswordTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.user = self.owner_a
        self.user.email = "test@example.com"
        self.user.save()
        self.validate_username_url = reverse('forget-validate-username')
        self.validate_otp_url = reverse('forget-validate-otp')
        self.reset_password_url = reverse('forget-reset')
        self.forget_username_url = reverse('forget-forget-username')

    @patch('apps.user.tasks.send_otp_email.delay')
    def test_validate_username_sends_otp(self, mock_send_email):
        """OTP send."""
        data = {"username": self.user.username}
        response = self.client.post(self.validate_username_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("OTP sent to t****@example.com", response.data["message"])
        self.assertIsNotNone(cache.get(f"fp:{self.user.username}"))
        mock_send_email.assert_called_once()

    def test_validate_otp_success(self):
        """OTP verify."""
        cache.set(f"fp:{self.user.username}", "123456", 180)
        data = {"username": self.user.username, "otp": "123456"}
        response = self.client.post(self.validate_otp_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(cache.get(f"fp_verified:{self.user.username}"))

    def test_validate_otp_failure(self):
        """OTP fail."""
        cache.set(f"fp:{self.user.username}", "123456", 180)
        data = {"username": self.user.username, "otp": "000000"}
        response = self.client.post(self.validate_otp_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_success(self):
        """Reset success."""
        cache.set(f"fp_verified:{self.user.username}", True, 120)
        data = {
            "username": self.user.username,
            "password": "NewPassword123!"
        }
        response = self.client.post(self.reset_password_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123!"))

    def test_reset_password_without_otp_verification(self):
        """Reset forbidden."""
        data = {
            "username": self.user.username,
            "password": "NewPassword123!"
        }
        response = self.client.post(self.reset_password_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.user.tasks.send_username_email.delay')
    def test_forget_username_success(self, mock_send_email):
        """Forget success."""
        data = {"email": "test@example.com"}
        response = self.client.post(self.forget_username_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send_email.assert_called_once_with(to_email="test@example.com", username=self.user.username)
