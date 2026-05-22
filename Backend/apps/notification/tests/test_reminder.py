# Framework Imports
from django.urls import reverse
from rest_framework import status
from django.utils import timezone

# Local Imports
from apps.base.tests import BaseTestCase
from apps.notification.models import Reminder


class ReminderTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('reminder-list')

        # Two reminders for owner_a — soonest first
        self.remind_time_soon = timezone.now() + timezone.timedelta(hours=1)
        self.remind_time_later = timezone.now() + timezone.timedelta(days=2)

        self.reminder_a1 = Reminder.objects.create(
            user=self.owner_a,
            title="Reminder A1",
            content="Content A1",
            remind_at=self.remind_time_soon
        )
        self.reminder_a2 = Reminder.objects.create(
            user=self.owner_a,
            title="Reminder A2",
            content="Content A2",
            remind_at=self.remind_time_later
        )

    def _create_reminder(self, user, title="Alert", content="Body",
                         remind_at=None, recurrence=Reminder.RecurrenceChoices.NONE):
        if remind_at is None:
            remind_at = timezone.now() + timezone.timedelta(days=1)
        return Reminder.objects.create(
            user=user, title=title, content=content,
            remind_at=remind_at, recurrence=recurrence
        )

    # -----------------------------------------------------------------------
    # CRUD TESTS
    # -----------------------------------------------------------------------

    def test_list_returns_only_own_reminders(self):
        """Each user only sees their own reminders in the list."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

        # All returned reminders must belong to owner_a
        own_ids = set(Reminder.objects.filter(user=self.owner_a).values_list('id', flat=True))
        returned_ids = {r["id"] for r in response.data["results"]}
        self.assertEqual(returned_ids, own_ids)

    def test_list_is_ordered_soonest_first(self):
        """Model meta ordering (remind_at ASC) is stored correctly in DB."""
        # Verify model-level ordering: soonest remind_at comes first
        reminders = list(Reminder.objects.filter(user=self.owner_a))
        remind_times = [r.remind_at for r in reminders]
        # DB meta ordering = ["remind_at"] → ascending
        self.assertEqual(remind_times, sorted(remind_times))

    def test_create_reminder_sets_celery_task_id(self):
        """Creating a reminder schedules a Celery task and stores its ID."""
        self.client.force_authenticate(user=self.owner_a)
        future_time = timezone.now() + timezone.timedelta(days=1)
        data = {
            "title": "New Alert",
            "content": "Pay the invoice",
            "remind_at": future_time.isoformat()
        }
        response = self.client.post(self.list_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Reminder.objects.get(id=response.data["id"])
        self.assertIsNotNone(created.celery_task_id)
        # owner is automatically set to the authenticated user
        self.assertEqual(created.user, self.owner_a)

    def test_create_reminder_requires_title(self):
        """title is a required field — missing it returns 400."""
        self.client.force_authenticate(user=self.owner_a)
        data = {"content": "No title", "remind_at": (timezone.now() + timezone.timedelta(hours=2)).isoformat()}
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_create_reminder_requires_remind_at(self):
        """remind_at is a required field — missing it returns 400."""
        self.client.force_authenticate(user=self.owner_a)
        data = {"title": "No time"}
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("remind_at", response.data)

    def test_detail_read_own_reminder(self):
        """Owner can retrieve their own reminder detail."""
        url = reverse('reminder-detail', kwargs={'pk': self.reminder_a1.id})
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.reminder_a1.id)
        self.assertEqual(response.data["title"], self.reminder_a1.title)

    def test_update_reminder_reschedules_task_and_resets_sent(self):
        """PATCH on remind_at revokes old Celery task, schedules new one, resets is_sent."""
        # Simulate a previously sent reminder with a task
        self.reminder_a1.is_sent = True
        self.reminder_a1.celery_task_id = "old-task-abc"
        self.reminder_a1.save()

        url = reverse('reminder-detail', kwargs={'pk': self.reminder_a1.id})
        self.client.force_authenticate(user=self.owner_a)

        new_time = timezone.now() + timezone.timedelta(days=5)
        response = self.client.patch(url, {"remind_at": new_time.isoformat()}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.reminder_a1.refresh_from_db()

        self.assertFalse(self.reminder_a1.is_sent)                         # reset
        self.assertIsNotNone(self.reminder_a1.celery_task_id)               # new task
        self.assertNotEqual(self.reminder_a1.celery_task_id, "old-task-abc")  # different

    def test_delete_reminder_via_api(self):
        """DELETE endpoint removes the reminder from the database."""
        url = reverse('reminder-detail', kwargs={'pk': self.reminder_a2.id})
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Reminder.objects.filter(id=self.reminder_a2.id).exists())

    def test_model_delete_revokes_celery_task(self):
        """Direct model.delete() (e.g. from admin/shell) also cleans up Celery task."""
        self.reminder_a1.celery_task_id = "task-to-revoke"
        self.reminder_a1.save()

        reminder_id = self.reminder_a1.id
        self.reminder_a1.delete()

        self.assertFalse(Reminder.objects.filter(id=reminder_id).exists())

    # ISOLATION / SECURITY TESTS

    def test_isolation_cannot_read_others_reminder(self):
        """User B gets 404 when accessing user A's reminder detail."""
        url = reverse('reminder-detail', kwargs={'pk': self.reminder_a1.id})
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_isolation_cannot_update_others_reminder(self):
        """User B gets 404 when PATCHing user A's reminder."""
        url = reverse('reminder-detail', kwargs={'pk': self.reminder_a1.id})
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.patch(url, {"title": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Title unchanged
        self.reminder_a1.refresh_from_db()
        self.assertEqual(self.reminder_a1.title, "Reminder A1")

    def test_isolation_cannot_delete_others_reminder(self):
        """User B gets 404 when DELETEing user A's reminder."""
        url = reverse('reminder-detail', kwargs={'pk': self.reminder_a1.id})
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Reminder.objects.filter(id=self.reminder_a1.id).exists())

    def test_cross_tenant_create_is_scoped_to_own_user(self):
        """Reminders created by user B always belong to user B, never user A."""
        self.client.force_authenticate(user=self.owner_b)
        data = {
            "title": "B's Reminder",
            "content": "Belongs to B",
            "remind_at": (timezone.now() + timezone.timedelta(days=1)).isoformat()
        }
        response = self.client.post(self.list_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Reminder.objects.get(id=response.data["id"])
        self.assertEqual(created.user, self.owner_b)
        self.assertNotEqual(created.user, self.owner_a)

    def test_cross_tenant_list_does_not_leak_other_users_data(self):
        """User B's list never contains user A's reminders."""
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        owner_a_ids = set(Reminder.objects.filter(user=self.owner_a).values_list('id', flat=True))

        # No overlap
        self.assertTrue(returned_ids.isdisjoint(owner_a_ids))

    # -----------------------------------------------------------------------
    # FILTER TESTS
    # -----------------------------------------------------------------------

    def test_filter_is_sent_false_returns_only_unsent(self):
        """?is_sent=false returns only reminders where is_sent is False."""
        self.reminder_a2.is_sent = True
        self.reminder_a2.save()

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?is_sent=false")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]

        returned_ids = {r["id"] for r in results}
        # a1 is unsent — must appear; a2 is sent — must not appear
        self.assertIn(self.reminder_a1.id, returned_ids)
        self.assertNotIn(self.reminder_a2.id, returned_ids)

    def test_filter_is_sent_true_returns_only_sent(self):
        """?is_sent=true returns only reminders where is_sent is True."""
        self.reminder_a2.is_sent = True
        self.reminder_a2.save()

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?is_sent=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]

        returned_ids = {r["id"] for r in results}
        self.assertIn(self.reminder_a2.id, returned_ids)
        self.assertNotIn(self.reminder_a1.id, returned_ids)

    def test_filter_from_date_excludes_earlier_reminders(self):
        """?from_date=X only returns reminders where remind_at >= X."""
        # a1 is 1 hour away; a2 is 2 days away
        # set from_date = 1.5 days from now → only a2 should match
        from urllib.parse import urlencode
        from_date = (timezone.now() + timezone.timedelta(days=1, hours=12)).isoformat()
        qs = urlencode({"from_date": from_date})

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?{qs}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        self.assertIn(self.reminder_a2.id, returned_ids)
        self.assertNotIn(self.reminder_a1.id, returned_ids)

    def test_filter_to_date_excludes_later_reminders(self):
        """?to_date=X only returns reminders where remind_at <= X."""
        # set to_date = 2 hours from now → only a1 should match
        from urllib.parse import urlencode
        to_date = (timezone.now() + timezone.timedelta(hours=2)).isoformat()
        qs = urlencode({"to_date": to_date})

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?{qs}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        self.assertIn(self.reminder_a1.id, returned_ids)
        self.assertNotIn(self.reminder_a2.id, returned_ids)

    def test_filter_date_range_from_and_to(self):
        """?from_date + ?to_date together returns only reminders inside the window."""
        from urllib.parse import urlencode
        from_date = (timezone.now() - timezone.timedelta(minutes=30)).isoformat()
        to_date = (timezone.now() + timezone.timedelta(hours=2)).isoformat()
        qs = urlencode({"from_date": from_date, "to_date": to_date})

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?{qs}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        # a1 (1h away) is inside window; a2 (2d away) is outside
        self.assertIn(self.reminder_a1.id, returned_ids)
        self.assertNotIn(self.reminder_a2.id, returned_ids)

    def test_filter_search_by_title(self):
        """?search=<text> matches reminders whose title contains the query."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?search=A1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        self.assertIn(self.reminder_a1.id, returned_ids)
        self.assertNotIn(self.reminder_a2.id, returned_ids)

    def test_filter_search_by_content(self):
        """?search=<text> also matches reminders whose content contains the query."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?search=Content A2")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        self.assertIn(self.reminder_a2.id, returned_ids)
        self.assertNotIn(self.reminder_a1.id, returned_ids)

    def test_filter_recurrence(self):
        """?recurrence=DAILY returns only reminders with that recurrence type."""
        daily = self._create_reminder(
            self.owner_a, title="Daily Stand-up",
            recurrence=Reminder.RecurrenceChoices.DAILY
        )

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?recurrence=DAILY")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {r["id"] for r in response.data["results"]}
        self.assertIn(daily.id, returned_ids)
        # One-off reminders must not appear
        self.assertNotIn(self.reminder_a1.id, returned_ids)
        self.assertNotIn(self.reminder_a2.id, returned_ids)
