# Framework Imports
from django.urls import reverse
from rest_framework import status

# Local Imports
from apps.base.tests import BaseTestCase
from apps.notification.models import Notification
from apps.notification.utils import send_notification, send_broadcast_notification
from apps.user.models import User


class NotificationTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        # Clear any notifications created by setup (e.g. system/task events)
        Notification.objects.all().delete()
        self.list_url = reverse('notification-list')

    def create_notification(self, user, title="Test Title", content="Test Content",
                            action_type=Notification.ActionType.SYSTEM):
        return Notification.objects.create(
            user=user,
            title=title,
            content=content,
            action_type=action_type
        )

    # --- API Tests ---

    def test_notification_list_returns_only_own(self):
        """User only sees their own notifications, not other users'."""
        note_a1 = self.create_notification(self.owner_a, title="A Note 1")
        note_a2 = self.create_notification(self.owner_a, title="A Note 2")
        self.create_notification(self.owner_b, title="B Note 1")  # should NOT appear

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

        # Count matches exactly what was created for owner_a
        expected_ids = {note_a1.id, note_a2.id}
        returned_ids = {n["id"] for n in response.data["results"]}
        self.assertEqual(returned_ids, expected_ids)

    def test_notification_list_ordering_most_recent_first(self):
        """Notifications are ordered by most recent first."""
        first = self.create_notification(self.owner_a, title="First")
        second = self.create_notification(self.owner_a, title="Second")

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]

        # Most recently created (second) should come before first
        returned_ids_in_order = [n["id"] for n in results]
        self.assertGreater(returned_ids_in_order.index(first.id),
                           returned_ids_in_order.index(second.id))

    def test_notification_delete_own(self):
        """Owner can delete their own notification."""
        note = self.create_notification(self.owner_a)
        url = reverse('notification-detail', kwargs={'pk': note.id})

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(id=note.id).exists())

    def test_notification_mark_read(self):
        """Marking a notification read flips is_read to True."""
        note = self.create_notification(self.owner_a)
        self.assertFalse(note.is_read)

        url = reverse('notification-mark-read', kwargs={'pk': note.id})
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertTrue(note.is_read)

    # --- Bulk Action Tests ---

    def test_notification_bulk_mark_read(self):
        """Bulk mark-read flips all specified notifications to is_read=True."""
        notes = [self.create_notification(self.owner_a, title=f"Note {i}") for i in range(3)]
        ids = [n.id for n in notes]

        url = reverse('notification-bulk-mark-read')
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": ids}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for nid in ids:
            self.assertTrue(Notification.objects.get(id=nid).is_read)

    def test_notification_bulk_delete(self):
        """Bulk delete removes all specified notifications from the database."""
        notes = [self.create_notification(self.owner_a, title=f"Note {i}") for i in range(3)]
        ids = [n.id for n in notes]

        url = reverse('notification-bulk-delete')
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": ids}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(id__in=ids).exists())

    # --- Security & Isolation Tests ---

    def test_notification_isolation_list_empty_for_other_user(self):
        """User A sees zero results when only user B has notifications."""
        self.create_notification(self.owner_b, title="Private B Note")

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 0)

    def test_notification_isolation_cannot_delete_others(self):
        """User A cannot delete user B's notification."""
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-detail', kwargs={'pk': note_b.id})

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Notification still exists
        self.assertTrue(Notification.objects.filter(id=note_b.id).exists())

    def test_notification_isolation_cannot_mark_read_others(self):
        """User A cannot mark user B's notification as read."""
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-mark-read', kwargs={'pk': note_b.id})

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        note_b.refresh_from_db()
        self.assertFalse(note_b.is_read)

    def test_notification_isolation_bulk_mark_read_ignores_others(self):
        """Bulk mark-read silently ignores IDs belonging to other users."""
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-bulk-mark-read')

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": [note_b.id]}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_b.refresh_from_db()
        self.assertFalse(note_b.is_read)  # untouched

    def test_notification_isolation_bulk_delete_ignores_others(self):
        """Bulk delete silently ignores IDs belonging to other users."""
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-bulk-delete')

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": [note_b.id]}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(id=note_b.id).exists())  # untouched

    # --- Utility Function Tests ---

    def test_send_notification_creates_record_with_correct_fields(self):
        """send_notification() creates a DB record with the exact fields passed."""
        note = send_notification(
            user=self.owner_a,
            title="Invoice Paid",
            content="Your invoice #100 was paid.",
            action_type=Notification.ActionType.INVOICE_PAID,
            actor=self.owner_b
        )

        fetched = Notification.objects.get(id=note.id)
        self.assertEqual(fetched.user, self.owner_a)
        self.assertEqual(fetched.actor, self.owner_b)
        self.assertEqual(fetched.title, "Invoice Paid")
        self.assertEqual(fetched.action_type, Notification.ActionType.INVOICE_PAID)

    def test_send_notification_optional_actor_and_type(self):
        """send_notification() works with no actor and no action_type."""
        note = send_notification(
            user=self.owner_a,
            title="Minimal",
            content="No actor, no type",
            action_type=None,
            actor=None
        )

        fetched = Notification.objects.get(id=note.id)
        self.assertIsNone(fetched.actor)
        self.assertIsNone(fetched.action_type)

    def test_send_notification_missing_user_raises(self):
        """send_notification() with user=None must raise an error."""
        with self.assertRaises(Exception):
            send_notification(user=None, title="Oops", content="No user",
                              action_type=Notification.ActionType.SYSTEM)

    def test_send_notification_missing_title_raises(self):
        """send_notification() with title=None must raise an error."""
        with self.assertRaises(Exception):
            send_notification(user=self.owner_a, title=None, content="No title",
                              action_type=Notification.ActionType.SYSTEM)

    def test_send_broadcast_notification_reaches_all_active_users(self):
        """send_broadcast_notification() creates one notification per active user."""
        Notification.objects.all().delete()
        active_users = list(User.objects.filter(is_active=True))

        send_broadcast_notification(
            title="System Broadcast",
            content="Maintenance at midnight.",
            action_type=Notification.ActionType.SYSTEM,
            actor=self.owner_a
        )

        self.assertEqual(Notification.objects.count(), len(active_users))
        for user in active_users:
            note = Notification.objects.get(user=user)
            self.assertEqual(note.title, "System Broadcast")
            self.assertEqual(note.content, "Maintenance at midnight.")
            self.assertEqual(note.action_type, Notification.ActionType.SYSTEM)
            self.assertEqual(note.actor, self.owner_a)
