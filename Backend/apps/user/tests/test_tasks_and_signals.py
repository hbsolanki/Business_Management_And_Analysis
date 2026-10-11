import pytest
from unittest.mock import MagicMock, patch

from apps.user.tasks import send_username_email
from apps.user.signals import (
    _delete_s3_file,
    auto_delete_old_profile,
    delete_profile_on_user_delete,
)
from apps.user.models import User


class TestUserTasks:

    def test_send_username_email(self):
        with patch("apps.user.tasks.send_email_task.delay") as mock_delay:
            send_username_email(to_email="test@example.com", username="john_doe")
            mock_delay.assert_called_once()
            _, kwargs = mock_delay.call_args
            assert kwargs["to_email"] == "test@example.com"
            assert "john_doe" in kwargs["text_content"]
            assert "john_doe" in kwargs["html_content"]


class TestUserSignals:

    def test_delete_s3_file(self):
        # 1. Empty filename returns early
        _delete_s3_file(None)
        _delete_s3_file("")

        # 2. File exists in storage -> deleted
        with patch("django.core.files.storage.default_storage.exists", return_value=True), \
             patch("django.core.files.storage.default_storage.delete") as mock_delete:
            _delete_s3_file("profile.png")
            mock_delete.assert_called_once_with("profile.png")

        # 3. File doesn't exist -> delete not called
        with patch("django.core.files.storage.default_storage.exists", return_value=False), \
             patch("django.core.files.storage.default_storage.delete") as mock_delete2:
            _delete_s3_file("nonexistent.png")
            mock_delete2.assert_not_called()

        # 4. Storage throws exception -> caught and logged
        with patch("django.core.files.storage.default_storage.exists", side_effect=Exception("Storage S3 down")):
            _delete_s3_file("error.png")

    def test_auto_delete_old_profile(self):
        # 1. No pk
        user_new = MagicMock(pk=None)
        auto_delete_old_profile(User, user_new)

        # 2. User doesn't exist in DB
        with patch("apps.user.models.User.objects.get", side_effect=User.DoesNotExist):
            user_existing = MagicMock(pk=10)
            auto_delete_old_profile(User, user_existing)

        # 3. Old profile picture exists and differs from new
        with patch("apps.user.models.User.objects.get") as mock_get, \
             patch("apps.user.signals._delete_s3_file") as mock_del_file:
            old_user = MagicMock(pk=10)
            old_pic = MagicMock()
            old_pic.name = "old_pic.jpg"
            old_user.profile_picture = old_pic
            mock_get.return_value = old_user

            new_user = MagicMock(pk=10)
            new_pic = MagicMock()
            new_pic.name = "new_pic.jpg"
            new_user.profile_picture = new_pic

            auto_delete_old_profile(User, new_user)
            mock_del_file.assert_called_once_with("old_pic.jpg")

    def test_delete_profile_on_user_delete(self):
        with patch("apps.user.signals._delete_s3_file") as mock_del_file:
            # 1. User without picture
            user_no_pic = MagicMock(profile_picture=None)
            delete_profile_on_user_delete(User, user_no_pic)
            mock_del_file.assert_not_called()

            # 2. User with picture
            pic = MagicMock()
            pic.name = "deleted_user_pic.jpg"
            user_with_pic = MagicMock(profile_picture=pic)
            delete_profile_on_user_delete(User, user_with_pic)
            mock_del_file.assert_called_once_with("deleted_user_pic.jpg")
