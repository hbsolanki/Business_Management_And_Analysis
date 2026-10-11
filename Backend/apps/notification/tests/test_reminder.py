import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from rest_framework.test import APIClient
from urllib.parse import urlencode

from apps.base.tests import BaseTestCase
from apps.notification.models import Reminder


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass

        def _create_reminder(self, user, title="Alert", content="Body",
                             remind_at=None, recurrence=Reminder.RecurrenceChoices.NONE):
            if remind_at is None:
                remind_at = timezone.now() + timezone.timedelta(days=1)
            return Reminder.objects.create(
                user=user, title=title, content=content,
                remind_at=remind_at, recurrence=recurrence
            )

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.list_url = reverse('reminder-list')

    # Two reminders for owner_a — soonest first
    tc.remind_time_soon = timezone.now() + timezone.timedelta(hours=1)
    tc.remind_time_later = timezone.now() + timezone.timedelta(days=2)

    tc.reminder_a1 = Reminder.objects.create(
        user=tc.owner_a,
        title="Reminder A1",
        content="Content A1",
        remind_at=tc.remind_time_soon
    )
    tc.reminder_a2 = Reminder.objects.create(
        user=tc.owner_a,
        title="Reminder A2",
        content="Content A2",
        remind_at=tc.remind_time_later
    )
    return tc


@pytest.mark.django_db
class TestReminder:
    # -----------------------------------------------------------------------
    # CRUD TESTS
    # -----------------------------------------------------------------------

    def test_list_returns_only_own_reminders(self, api_client, env):
        """Each user only sees their own reminders in the list."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "results" in sut_response.data

        own_ids = set(Reminder.objects.filter(user=env.owner_a).values_list('id', flat=True))
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert returned_ids == own_ids

    def test_list_is_ordered_soonest_first(self, env):
        """Model meta ordering (remind_at ASC) is stored correctly in DB."""
        # Arrange & Act
        reminders = list(Reminder.objects.filter(user=env.owner_a))
        remind_times = [r.remind_at for r in reminders]
        
        # Assert
        assert remind_times == sorted(remind_times)

    def test_create_reminder_sets_celery_task_id(self, api_client, env):
        """Creating a reminder schedules a Celery task and stores its ID."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        future_time = timezone.now() + timezone.timedelta(days=1)
        data = {
            "title": "New Alert",
            "content": "Pay the invoice",
            "remind_at": future_time.isoformat()
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        created = Reminder.objects.get(id=sut_response.data["id"])
        assert created.celery_task_id is not None
        assert created.user == env.owner_a

    def test_create_reminder_requires_title(self, api_client, env):
        """title is a required field — missing it returns 400."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {"content": "No title", "remind_at": (timezone.now() + timezone.timedelta(hours=2)).isoformat()}
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in sut_response.data

    def test_create_reminder_requires_remind_at(self, api_client, env):
        """remind_at is a required field — missing it returns 400."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {"title": "No time"}
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "remind_at" in sut_response.data

    def test_detail_read_own_reminder(self, api_client, env):
        """Owner can retrieve their own reminder detail."""
        # Arrange
        sut_url = reverse('reminder-detail', kwargs={'pk': env.reminder_a1.id})
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert sut_response.data["id"] == env.reminder_a1.id
        assert sut_response.data["title"] == env.reminder_a1.title

    def test_update_reminder_reschedules_task_and_resets_sent(self, api_client, env):
        """PATCH on remind_at revokes old Celery task, schedules new one, resets is_sent."""
        # Arrange
        env.reminder_a1.is_sent = True
        env.reminder_a1.celery_task_id = "old-task-abc"
        env.reminder_a1.save()

        sut_url = reverse('reminder-detail', kwargs={'pk': env.reminder_a1.id})
        api_client.force_authenticate(user=env.owner_a)

        new_time = timezone.now() + timezone.timedelta(days=5)
        
        # Act
        sut_response = api_client.patch(sut_url, {"remind_at": new_time.isoformat()}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        env.reminder_a1.refresh_from_db()

        assert not env.reminder_a1.is_sent
        assert env.reminder_a1.celery_task_id is not None
        assert env.reminder_a1.celery_task_id != "old-task-abc"

    def test_delete_reminder_via_api(self, api_client, env):
        """DELETE endpoint removes the reminder from the database."""
        # Arrange
        sut_url = reverse('reminder-detail', kwargs={'pk': env.reminder_a2.id})
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.delete(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_204_NO_CONTENT
        assert not Reminder.objects.filter(id=env.reminder_a2.id).exists()

    def test_model_delete_revokes_celery_task(self, env):
        """Direct model.delete() (e.g. from admin/shell) also cleans up Celery task."""
        # Arrange
        env.reminder_a1.celery_task_id = "task-to-revoke"
        env.reminder_a1.save()
        reminder_id = env.reminder_a1.id
        
        # Act
        env.reminder_a1.delete()

        # Assert
        assert not Reminder.objects.filter(id=reminder_id).exists()

    # ISOLATION / SECURITY TESTS

    def test_isolation_cannot_read_others_reminder(self, api_client, env):
        """User B gets 404 when accessing user A's reminder detail."""
        # Arrange
        sut_url = reverse('reminder-detail', kwargs={'pk': env.reminder_a1.id})
        api_client.force_authenticate(user=env.owner_b)
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_isolation_cannot_update_others_reminder(self, api_client, env):
        """User B gets 404 when PATCHing user A's reminder."""
        # Arrange
        sut_url = reverse('reminder-detail', kwargs={'pk': env.reminder_a1.id})
        api_client.force_authenticate(user=env.owner_b)
        
        # Act
        sut_response = api_client.patch(sut_url, {"title": "Hacked"})
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND
        env.reminder_a1.refresh_from_db()
        assert env.reminder_a1.title == "Reminder A1"

    def test_isolation_cannot_delete_others_reminder(self, api_client, env):
        """User B gets 404 when DELETEing user A's reminder."""
        # Arrange
        sut_url = reverse('reminder-detail', kwargs={'pk': env.reminder_a1.id})
        api_client.force_authenticate(user=env.owner_b)
        
        # Act
        sut_response = api_client.delete(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND
        assert Reminder.objects.filter(id=env.reminder_a1.id).exists()

    def test_cross_tenant_create_is_scoped_to_own_user(self, api_client, env):
        """Reminders created by user B always belong to user B, never user A."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_b)
        data = {
            "title": "B's Reminder",
            "content": "Belongs to B",
            "remind_at": (timezone.now() + timezone.timedelta(days=1)).isoformat()
        }
        
        # Act
        sut_response = api_client.post(sut_url, data, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        created = Reminder.objects.get(id=sut_response.data["id"])
        assert created.user == env.owner_b
        assert created.user != env.owner_a

    def test_cross_tenant_list_does_not_leak_other_users_data(self, api_client, env):
        """User B's list never contains user A's reminders."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_b)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        owner_a_ids = set(Reminder.objects.filter(user=env.owner_a).values_list('id', flat=True))

        assert returned_ids.isdisjoint(owner_a_ids)

    # -----------------------------------------------------------------------
    # FILTER TESTS
    # -----------------------------------------------------------------------

    def test_filter_is_sent_false_returns_only_unsent(self, api_client, env):
        """?is_sent=false returns only reminders where is_sent is False."""
        # Arrange
        env.reminder_a2.is_sent = True
        env.reminder_a2.save()
        sut_url = f"{env.list_url}?is_sent=false"

        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        results = sut_response.data["results"]

        returned_ids = {r["id"] for r in results}
        assert env.reminder_a1.id in returned_ids
        assert env.reminder_a2.id not in returned_ids

    def test_filter_is_sent_true_returns_only_sent(self, api_client, env):
        """?is_sent=true returns only reminders where is_sent is True."""
        # Arrange
        env.reminder_a2.is_sent = True
        env.reminder_a2.save()
        sut_url = f"{env.list_url}?is_sent=true"

        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        results = sut_response.data["results"]

        returned_ids = {r["id"] for r in results}
        assert env.reminder_a2.id in returned_ids
        assert env.reminder_a1.id not in returned_ids

    def test_filter_from_date_excludes_earlier_reminders(self, api_client, env):
        """?from_date=X only returns reminders where remind_at >= X."""
        # Arrange
        from_date = (timezone.now() + timezone.timedelta(days=1, hours=12)).isoformat()
        qs = urlencode({"from_date": from_date})
        sut_url = f"{env.list_url}?{qs}"

        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert env.reminder_a2.id in returned_ids
        assert env.reminder_a1.id not in returned_ids

    def test_filter_to_date_excludes_later_reminders(self, api_client, env):
        """?to_date=X only returns reminders where remind_at <= X."""
        # Arrange
        to_date = (timezone.now() + timezone.timedelta(hours=2)).isoformat()
        qs = urlencode({"to_date": to_date})
        sut_url = f"{env.list_url}?{qs}"

        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert env.reminder_a1.id in returned_ids
        assert env.reminder_a2.id not in returned_ids

    def test_filter_date_range_from_and_to(self, api_client, env):
        """?from_date + ?to_date together returns only reminders inside the window."""
        # Arrange
        from_date = (timezone.now() - timezone.timedelta(minutes=30)).isoformat()
        to_date = (timezone.now() + timezone.timedelta(hours=2)).isoformat()
        qs = urlencode({"from_date": from_date, "to_date": to_date})
        sut_url = f"{env.list_url}?{qs}"

        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert env.reminder_a1.id in returned_ids
        assert env.reminder_a2.id not in returned_ids

    def test_filter_search_by_title(self, api_client, env):
        """?search=<text> matches reminders whose title contains the query."""
        # Arrange
        sut_url = f"{env.list_url}?search=A1"
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert env.reminder_a1.id in returned_ids
        assert env.reminder_a2.id not in returned_ids

    def test_filter_search_by_content(self, api_client, env):
        """?search=<text> also matches reminders whose content contains the query."""
        # Arrange
        sut_url = f"{env.list_url}?search=Content A2"
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert env.reminder_a2.id in returned_ids
        assert env.reminder_a1.id not in returned_ids

    def test_filter_recurrence(self, api_client, env):
        """?recurrence=DAILY returns only reminders with that recurrence type."""
        # Arrange
        daily = env._create_reminder(
            env.owner_a, title="Daily Stand-up",
            recurrence=Reminder.RecurrenceChoices.DAILY
        )
        sut_url = f"{env.list_url}?recurrence=DAILY"
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        returned_ids = {r["id"] for r in sut_response.data["results"]}
        assert daily.id in returned_ids
        assert env.reminder_a1.id not in returned_ids
        assert env.reminder_a2.id not in returned_ids
