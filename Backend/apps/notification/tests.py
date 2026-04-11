# Framework Imports
from django.urls import reverse
from rest_framework import status

# Local Imports
from apps.base.tests import BaseTestCase
from apps.notification.models import Notification
from apps.notification.utils import send_notification, send_broadcast_notification
from apps.user.models import User

# Notification Tests
class NotificationTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('notification-list')
        
    def create_notification(self, user, title="Test Title", content="Test Content"):
        return Notification.objects.create(
            user=user,
            title=title,
            content=content,
            action_type=Notification.ActionType.SYSTEM
        )

    # --- API Tests ---

    def test_notification_list(self):
        self.create_notification(self.owner_a, title="Note 1")
        self.create_notification(self.owner_a, title="Note 2")
        self.create_notification(self.owner_b, title="Other Note")
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check count
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["title"], "Note 2") # Recent first

    def test_notification_delete(self):
        note = self.create_notification(self.owner_a)
        url = reverse('notification-detail', kwargs={'pk': note.id})
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(id=note.id).exists())

    def test_notification_mark_read(self):
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
        note1 = self.create_notification(self.owner_a)
        note2 = self.create_notification(self.owner_a)
        
        url = reverse('notification-bulk-mark-read')
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": [note1.id, note2.id]}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.get(id=note1.id).is_read)
        self.assertTrue(Notification.objects.get(id=note2.id).is_read)

    def test_notification_bulk_delete(self):
        note1 = self.create_notification(self.owner_a)
        note2 = self.create_notification(self.owner_a)
        
        url = reverse('notification-bulk-delete')
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": [note1.id, note2.id]}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(id__in=[note1.id, note2.id]).exists())

    # --- Security & Isolation Tests ---

    def test_notification_isolation_list(self):
        self.create_notification(self.owner_b, title="Private Note")
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_notification_isolation_delete(self):
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-detail', kwargs={'pk': note_b.id})
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(url)
        
        # DRF's get_object for a queryset that doesn't include the item returns 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Notification.objects.filter(id=note_b.id).exists())

    def test_notification_isolation_mark_read(self):
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-mark-read', kwargs={'pk': note_b.id})
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        note_b.refresh_from_db()
        self.assertFalse(note_b.is_read)

    def test_notification_isolation_bulk_mark_read(self):
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-bulk-mark-read')
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": [note_b.id]}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_b.refresh_from_db()
        self.assertFalse(note_b.is_read)

    def test_notification_isolation_bulk_delete(self):
        note_b = self.create_notification(self.owner_b)
        url = reverse('notification-bulk-delete')
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(url, {"ids": [note_b.id]}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(id=note_b.id).exists())

    # --- Utility Tests ---

    def test_send_notification(self):
        note = send_notification(
            user=self.owner_a,
            title="System Alert",
            content="Your invoice was paid.",
            action_type=Notification.ActionType.INVOICE_PAID,
            actor=self.owner_b
        )
        
        self.assertTrue(Notification.objects.filter(id=note.id).exists())
        self.assertEqual(note.user, self.owner_a)
        self.assertEqual(note.actor, self.owner_b)
        self.assertEqual(note.title, "System Alert")
        self.assertEqual(note.action_type, Notification.ActionType.INVOICE_PAID)

    def test_send_notification_optional_fields(self):
        note = send_notification(
            user=self.owner_a,
            title="Minimal Note",
            content="Minimal Content",
            action_type=None,
            actor=None
        )
        self.assertTrue(Notification.objects.filter(id=note.id).exists())
        self.assertIsNone(note.actor)
        self.assertIsNone(note.action_type)

    def test_send_notification_missing_user(self):
        with self.assertRaises(Exception):
            send_notification(
                user=None,
                title="Title",
                content="Content",
                action_type=Notification.ActionType.SYSTEM
            )

    def test_send_notification_missing_title(self):
        with self.assertRaises(Exception):
            send_notification(
                user=self.owner_a,
                title=None,
                content="Content",
                action_type=Notification.ActionType.SYSTEM
            )

    def test_send_broadcast_notification(self):
        Notification.objects.all().delete()
        active_users = User.objects.filter(is_active=True)
        active_users_count = active_users.count()
        
        send_broadcast_notification(
            title="Broadcast Title",
            content="Broadcast Content",
            action_type=Notification.ActionType.SYSTEM,
            actor=self.owner_a
        )
        
        self.assertEqual(Notification.objects.count(), active_users_count)
        
        for user in active_users:
            note = Notification.objects.get(user=user)
            self.assertEqual(note.title, "Broadcast Title")
            self.assertEqual(note.content, "Broadcast Content")
            self.assertEqual(note.action_type, Notification.ActionType.SYSTEM)
            self.assertEqual(note.actor, self.owner_a)
