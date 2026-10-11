import asyncio
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.base.tests import BaseTestCase
from apps.cost.models import CostCategory
from apps.notification.models import Notification, Reminder, ReminderLink
from apps.notification.tasks import send_notification_task, trigger_reminder_task
from apps.notification.views import NotificationViewSet


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestNotificationViewsExtended:
    def test_stream_action(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        url = reverse("notification-stream")

        # Act
        sut_response = api_client.get(url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert sut_response["Content-Type"] == "text/event-stream"
        assert sut_response["Cache-Control"] == "no-cache"

    @pytest.mark.asyncio
    async def test_event_generator_no_channel_layer(self, env):
        # Arrange
        view = NotificationViewSet()
        with patch("apps.notification.views.get_channel_layer", return_value=None):
            # Act
            gen = view._event_generator(env.owner_a)
            events = [item async for item in gen]

            # Assert
            assert len(events) == 1
            assert "Channel layer not configured" in events[0]

    @pytest.mark.asyncio
    async def test_event_generator_messages_and_timeout(self, env):
        # Arrange
        view = NotificationViewSet()
        mock_channel_layer = AsyncMock()
        mock_channel_layer.new_channel.return_value = "chan_123"

        # Simulate receiving 1 notification, 1 timeout, then StopIteration / Exception to exit while loop
        call_count = 0

        async def fake_wait_for(coro, timeout):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "notification", "title": "Test Title", "content": "Body"}
            elif call_count == 2:
                raise asyncio.TimeoutError()
            raise RuntimeError("Connection closed")

        with patch("apps.notification.views.get_channel_layer", return_value=mock_channel_layer), \
             patch("asyncio.wait_for", side_effect=fake_wait_for):
            # Act
            gen = view._event_generator(env.owner_a)
            events = [item async for item in gen]

            # Assert
            assert len(events) >= 3
            assert '"type": "connection"' in events[0]
            assert '"title": "Test Title"' in events[1]
            assert ": keep-alive" in events[2]

    def test_notification_error_branches(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        note = Notification.objects.create(user=env.owner_a, title="Test", content="Content")

        # Act & Assert - mark_read exception
        with patch.object(Notification, "save", side_effect=RuntimeError("Save failed")):
            res = api_client.post(reverse("notification-mark-read", kwargs={"pk": note.id}))
            assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Act & Assert - bulk_mark_read exception
        with patch("django.db.models.query.QuerySet.update", side_effect=RuntimeError("Update error")):
            res_bulk = api_client.post(reverse("notification-bulk-mark-read"), data={"ids": [note.id]})
            assert res_bulk.status_code == status.HTTP_400_BAD_REQUEST

        # Act & Assert - bulk_delete exception
        with patch("django.db.models.query.QuerySet.delete", side_effect=RuntimeError("Delete error")):
            res_del = api_client.post(reverse("notification-bulk-delete"), data={"ids": [note.id]})
            assert res_del.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestReminderViewsExtended:
    def test_list_links_and_delete_link(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        reminder = Reminder.objects.create(
            user=env.owner_a,
            title="Meeting",
            remind_at=timezone.now() + timedelta(days=1),
        )
        ct = ContentType.objects.get_for_model(CostCategory)
        link = ReminderLink.objects.create(
            reminder=reminder,
            content_type=ct,
            object_id=env.cost_category_a.id,
        )

        # Act - list_links
        url_links = reverse("reminder-list-links", kwargs={"pk": reminder.id})
        res_list = api_client.get(url_links)

        # Assert - list_links
        assert res_list.status_code == status.HTTP_200_OK
        assert len(res_list.data) == 1

        # Act - delete_link
        url_del = reverse("reminder-delete-link", kwargs={"pk": reminder.id, "link_pk": link.id})
        res_del = api_client.delete(url_del)

        # Assert - delete_link
        assert res_del.status_code == status.HTTP_204_NO_CONTENT
        assert not ReminderLink.objects.filter(id=link.id).exists()

    def test_entity_reminder_viewset(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        url = reverse("entity-reminder-list")

        # 1. Missing query params
        res_missing = api_client.get(url)
        assert res_missing.status_code == status.HTTP_400_BAD_REQUEST

        # 2. Unknown entity_type
        res_unknown = api_client.get(f"{url}?entity_type=invalid.model&entity_id=1")
        assert res_unknown.status_code == status.HTTP_400_BAD_REQUEST

        # 3. Valid entity_type and entity_id
        reminder = Reminder.objects.create(
            user=env.owner_a,
            title="Category Reminder",
            remind_at=timezone.now() + timedelta(days=1),
        )
        ct = ContentType.objects.get_for_model(CostCategory)
        ReminderLink.objects.create(
            reminder=reminder,
            content_type=ct,
            object_id=env.cost_category_a.id,
        )

        res_ok = api_client.get(f"{url}?entity_type=cost.costcategory&entity_id={env.cost_category_a.id}")
        assert res_ok.status_code == status.HTTP_200_OK
        assert len(res_ok.data) == 1
        assert res_ok.data[0]["title"] == "Category Reminder"


@pytest.mark.django_db
class TestNotificationTasksExtended:
    def test_send_notification_task(self, env):
        # Arrange
        note = Notification.objects.create(
            user=env.owner_a,
            title="Alert",
            content="Details",
            action_type=Notification.ActionType.SYSTEM,
        )

        with patch("apps.notification.tasks.get_channel_layer") as mock_get_layer:
            mock_layer = MagicMock()
            mock_layer.group_send = AsyncMock()
            mock_get_layer.return_value = mock_layer

            # Act - Existing notification
            send_notification_task(note.id)

            # Assert
            mock_get_layer.assert_called_once()
            mock_layer.group_send.assert_called_once()

        # Act - Non-existent notification
        send_notification_task(999999)  # Should not raise

    def test_trigger_reminder_task_recurrences(self, env):
        # Arrange
        now = timezone.now()
        ct = ContentType.objects.get_for_model(CostCategory)

        # 1. One-off reminder (recurrence NONE) with costcategory link
        rem_none = Reminder.objects.create(
            user=env.owner_a,
            title="Single Reminder",
            content="Check cost",
            remind_at=now - timedelta(minutes=5),
            recurrence=Reminder.RecurrenceChoices.NONE,
        )
        ReminderLink.objects.create(reminder=rem_none, content_type=ct, object_id=env.cost_category_a.id)

        # Act
        trigger_reminder_task(rem_none.id)

        # Assert
        rem_none.refresh_from_db()
        assert rem_none.is_sent is True

        # 2. Recurring reminder (DAILY)
        rem_daily = Reminder.objects.create(
            user=env.owner_a,
            title="Daily Reminder",
            remind_at=now - timedelta(hours=1),
            recurrence=Reminder.RecurrenceChoices.DAILY,
        )

        with patch.object(trigger_reminder_task, "apply_async") as mock_apply:
            mock_apply.return_value = MagicMock(id="celery-task-456")
            trigger_reminder_task(rem_daily.id)

            rem_daily.refresh_from_db()
            assert rem_daily.remind_at > now
            assert rem_daily.celery_task_id == "celery-task-456"

        # 3. Non-existent reminder
        trigger_reminder_task(999999)  # Should not raise
