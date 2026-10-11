from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

from apps.chat.middleware import JWTAuthMiddleware, get_user
from apps.chat.services.cloudinary_storage import (
    MessageMediaCloudinaryStorage,
    delete_media as delete_cloudinary_media,
    get_resource_type,
)
from apps.chat.services.s3_storage import delete_media as delete_s3_media

User = get_user_model()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestChatMiddleware:
    @pytest.fixture
    def test_user(self):
        return User.objects.create_user(email="ws_user@example.com", username="ws_user")

    async def test_get_user_found_and_not_found(self, test_user):
        # Arrange & Act - Found
        sut_user = await get_user(test_user.id)

        # Assert - Found
        assert sut_user.id == test_user.id

        # Arrange & Act - Not Found
        sut_anon = await get_user(999999)

        # Assert - Not Found
        assert isinstance(sut_anon, AnonymousUser)

    async def test_jwt_auth_middleware_no_token(self):
        # Arrange
        inner_app = AsyncMock()
        middleware = JWTAuthMiddleware(inner_app)
        scope = {"query_string": b""}

        # Act
        await middleware(scope, None, None)

        # Assert
        assert isinstance(scope["user"], AnonymousUser)
        inner_app.assert_called_once()

    async def test_jwt_auth_middleware_invalid_token(self):
        # Arrange
        inner_app = AsyncMock()
        middleware = JWTAuthMiddleware(inner_app)
        scope = {"query_string": b"token=invalid_garbage_token"}

        # Act
        await middleware(scope, None, None)

        # Assert
        assert isinstance(scope["user"], AnonymousUser)
        inner_app.assert_called_once()

    async def test_jwt_auth_middleware_valid_token(self, test_user):
        # Arrange
        inner_app = AsyncMock()
        middleware = JWTAuthMiddleware(inner_app)
        access_token = str(AccessToken.for_user(test_user))
        scope = {"query_string": f"token={access_token}".encode()}

        # Act
        await middleware(scope, None, None)

        # Assert
        assert scope["user"].id == test_user.id
        inner_app.assert_called_once()


class TestCloudinaryStorage:
    def test_message_media_cloudinary_storage_resource_types(self):
        # Arrange
        storage = MessageMediaCloudinaryStorage()

        # Act
        sut_img = storage._get_resource_type("photo.png")
        sut_vid = storage._get_resource_type("clip.mp4")
        sut_raw = storage._get_resource_type("doc.pdf")

        # Assert
        assert sut_img == "image"
        assert sut_vid == "video"
        assert sut_raw == "raw"

    def test_message_media_cloudinary_storage_save_extension(self):
        # Arrange
        storage = MessageMediaCloudinaryStorage()
        with patch("cloudinary_storage.storage.MediaCloudinaryStorage._save", side_effect=["bma/chat/file_id", "bma/chat/file_id.png"]):
            # Act - Without extension
            sut_name1 = storage._save("document.pdf", MagicMock())
            # Act - Already has extension
            sut_name2 = storage._save("photo.png", MagicMock())

            # Assert
            assert sut_name1 == "bma/chat/file_id.pdf"
            assert sut_name2 == "bma/chat/file_id.png"

    def test_get_resource_type(self):
        # Arrange & Act & Assert
        assert get_resource_type("IMAGE") == "image"
        assert get_resource_type("VIDEO") == "video"
        assert get_resource_type("DOCUMENT") == "raw"

    @patch("cloudinary.uploader.destroy")
    def test_delete_cloudinary_media(self, mock_destroy):
        # Arrange empty public_id
        delete_cloudinary_media("", "IMAGE")
        mock_destroy.assert_not_called()

        # Arrange image with extension and success
        mock_destroy.return_value = {"result": "ok"}
        delete_cloudinary_media("chat/pic.jpg", "IMAGE")
        mock_destroy.assert_called_once_with("chat/pic", resource_type="image", invalidate=True)

        # Arrange failure requiring fallback
        mock_destroy.reset_mock()
        mock_destroy.side_effect = [{"result": "not_found"}, {"result": "ok"}]
        delete_cloudinary_media("chat/pic.jpg", "IMAGE")
        assert mock_destroy.call_count == 2


class TestS3Storage:
    @patch("apps.chat.services.s3_storage.boto3.client")
    def test_delete_s3_media_success_and_empty(self, mock_boto):
        # Arrange empty
        delete_s3_media("")
        mock_boto.assert_not_called()

        # Arrange success
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        delete_s3_media("bma/chat/file.pdf")
        mock_s3.delete_object.assert_called_once()

    @patch("apps.chat.services.s3_storage.boto3.client")
    def test_delete_s3_media_exception_handled(self, mock_boto):
        # Arrange exception
        mock_s3 = MagicMock()
        mock_s3.delete_object.side_effect = RuntimeError("S3 Network Error")
        mock_boto.return_value = mock_s3

        # Act & Assert (should not raise)
        delete_s3_media("bma/chat/file.pdf")
