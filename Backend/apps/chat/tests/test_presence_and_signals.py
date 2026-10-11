import pytest
from unittest.mock import MagicMock, patch

from apps.chat.signals import get_file_key, delete_media_on_message_delete
from apps.chat.utils.presence import (
    presence_key,
    set_user_online,
    refresh_user_online,
    set_user_offline,
    is_user_online,
)
from apps.base.mixins import DirtyFieldsMixin
from apps.user.utils.uploads import user_avatar_path


class TestChatPresenceAndSignals:

    def test_presence_lifecycle(self):
        # presence_key
        assert presence_key(10, 20) == "presence:10:20"

        with patch("django.core.cache.cache.set") as mock_set, \
             patch("django.core.cache.cache.touch") as mock_touch, \
             patch("django.core.cache.cache.delete") as mock_del, \
             patch("django.core.cache.cache.get") as mock_get:

            set_user_online(10, 20)
            mock_set.assert_called_once_with("presence:10:20", True, timeout=60)

            refresh_user_online(10, 20)
            mock_touch.assert_called_once_with("presence:10:20", timeout=60)

            set_user_offline(10, 20)
            mock_del.assert_called_once_with("presence:10:20")

            mock_get.return_value = True
            assert is_user_online(10, 20) is True

            mock_get.return_value = None
            assert is_user_online(10, 20) is False

    def test_chat_signals(self):
        # 1. get_file_key
        assert get_file_key(None) is None
        mock_file = MagicMock()
        mock_file.name = "media/chat/image.png"
        assert get_file_key(mock_file) == "media/chat/image.png"

        # 2. delete_media_on_message_delete with and without media
        with patch("apps.chat.signals.delete_media") as mock_delete:
            # Without media
            msg_no_media = MagicMock(media=None)
            delete_media_on_message_delete(None, msg_no_media)
            mock_delete.assert_not_called()

            # With media
            msg_with_media = MagicMock(media=mock_file, message_type="IMAGE")
            delete_media_on_message_delete(None, msg_with_media)
            mock_delete.assert_called_once_with("media/chat/image.png", "IMAGE")


class TestBaseMixinsAndUserUploads:

    def test_dirty_fields_mixin(self):
        class DummyField:
            def __init__(self, attname):
                self.attname = attname

        class DummyModel(DirtyFieldsMixin):
            class _meta:
                concrete_fields = [DummyField("name"), DummyField("status")]

            def __init__(self, name="Old", status="ACTIVE"):
                self.name = name
                self.status = status
                super().__init__()

        obj = DummyModel(name="Original", status="PENDING")
        assert obj.get_dirty_fields() == {}

        obj.name = "Modified"
        changes = obj.get_dirty_fields()
        assert "name" in changes
        assert changes["name"] == {"old": "Original", "new": "Modified"}

    def test_user_avatar_path(self):
        user = MagicMock(id=99)
        path = user_avatar_path(user, "avatar.JPEG")
        assert "bma/profile_pictures/user_99/" in path
        assert path.endswith(".jpeg")
