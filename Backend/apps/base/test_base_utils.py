import pytest
from unittest.mock import MagicMock
from django.core.mail import EmailMessage
from rest_framework.test import APIRequestFactory
from apps.base.utils.email_backend import DebugEmailBackend
from apps.base.authentication import QueryParameterJWTAuthentication


class TestBaseUtils:

    def test_debug_email_backend_send_messages(self, tmp_path):
        """Test DebugEmailBackend writes debug emails and logs."""
        # Arrange
        sut_backend = DebugEmailBackend()
        message = EmailMessage(
            subject="Test Subject",
            body="Test OTP: 123456",
            from_email="noreply@example.com",
            to=["user@example.com"]
        )

        # Act
        sut_count = sut_backend.send_messages([message])

        # Assert
        assert sut_count == 1

    def test_query_parameter_jwt_authentication_header_present(self):
        """Test authentication when standard Authorization header is provided."""
        # Arrange
        sut_auth = QueryParameterJWTAuthentication()
        factory = APIRequestFactory()
        sut_request = factory.get("/api/test/", HTTP_AUTHORIZATION="Bearer my_token")

        # Act
        header = sut_auth.get_header(sut_request)

        # Assert
        assert header == b"Bearer my_token"

    def test_query_parameter_jwt_authentication_query_token_present(self):
        """Test authentication fallback to query parameter token."""
        # Arrange
        sut_auth = QueryParameterJWTAuthentication()
        factory = APIRequestFactory()
        sut_request = factory.get("/api/test/?token=query_jwt_token")

        # Act
        header = sut_auth.get_header(sut_request)

        # Assert
        assert header == b"Bearer query_jwt_token"

    def test_query_parameter_jwt_authentication_no_token(self):
        """Test authentication when no token is in header or query parameter."""
        # Arrange
        sut_auth = QueryParameterJWTAuthentication()
        factory = APIRequestFactory()
        sut_request = factory.get("/api/test/")

        # Act
        header = sut_auth.get_header(sut_request)

        # Assert
        assert header is None
