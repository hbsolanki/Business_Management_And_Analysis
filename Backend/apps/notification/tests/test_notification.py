import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.notification.models import Notification
from apps.notification.utils import send_notification, send_broadcast_notification
from apps.user.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass
            
        def create_notification(self, user, title="Test Title", content="Test Content",
                                action_type=Notification.ActionType.SYSTEM):
            return Notification.objects.create(
                user=user,
                title=title,
                content=content,
                action_type=action_type
            )
            
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    Notification.objects.all().delete()
    tc.list_url = reverse('notification-list')
    return tc

@pytest.mark.django_db
class TestNotification:

    # --- API Tests ---

    def test_notification_list_returns_only_own(self, api_client, env):
        """User only sees their own notifications, not other users'."""
        # Arrange
        sut_url = env.list_url
        note_a1 = env.create_notification(env.owner_a, title="A Note 1")
        note_a2 = env.create_notification(env.owner_a, title="A Note 2")
        env.create_notification(env.owner_b, title="B Note 1")  # should NOT appear
        api_client.force_authenticate(user=env.owner_a)

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "results" in sut_response.data

        expected_ids = {note_a1.id, note_a2.id}
        returned_ids = {n["id"] for n in sut_response.data["results"]}
        assert returned_ids == expected_ids

    def test_notification_list_ordering_most_recent_first(self, api_client, env):
        """Notifications are ordered by most recent first."""
        # Arrange
        sut_url = env.list_url
        first = env.create_notification(env.owner_a, title="First")
        second = env.create_notification(env.owner_a, title="Second")
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        results = sut_response.data["results"]

        returned_ids_in_order = [n["id"] for n in results]
        assert returned_ids_in_order.index(first.id) > returned_ids_in_order.index(second.id)

    def test_notification_delete_own(self, api_client, env):
        """Owner can delete their own notification."""
        # Arrange
        note = env.create_notification(env.owner_a)
        sut_url = reverse('notification-detail', kwargs={'pk': note.id})
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.delete(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_204_NO_CONTENT
        assert not Notification.objects.filter(id=note.id).exists()

    def test_notification_mark_read(self, api_client, env):
        """Marking a notification read flips is_read to True."""
        # Arrange
        note = env.create_notification(env.owner_a)
        assert not note.is_read
        sut_url = reverse('notification-mark-read', kwargs={'pk': note.id})
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.post(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        note.refresh_from_db()
        assert note.is_read

    # --- Bulk Action Tests ---

    def test_notification_bulk_mark_read(self, api_client, env):
        """Bulk mark-read flips all specified notifications to is_read=True."""
        # Arrange
        notes = [env.create_notification(env.owner_a, title=f"Note {i}") for i in range(3)]
        ids = [n.id for n in notes]
        sut_url = reverse('notification-bulk-mark-read')
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.post(sut_url, {"ids": ids}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        for nid in ids:
            assert Notification.objects.get(id=nid).is_read

    def test_notification_bulk_delete(self, api_client, env):
        """Bulk delete removes all specified notifications from the database."""
        # Arrange
        notes = [env.create_notification(env.owner_a, title=f"Note {i}") for i in range(3)]
        ids = [n.id for n in notes]
        sut_url = reverse('notification-bulk-delete')
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.post(sut_url, {"ids": ids}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert not Notification.objects.filter(id__in=ids).exists()

    # --- Security & Isolation Tests ---

    def test_notification_isolation_list_empty_for_other_user(self, api_client, env):
        """User A sees zero results when only user B has notifications."""
        # Arrange
        sut_url = env.list_url
        env.create_notification(env.owner_b, title="Private B Note")
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "results" in sut_response.data
        assert len(sut_response.data["results"]) == 0

    def test_notification_isolation_cannot_delete_others(self, api_client, env):
        """User A cannot delete user B's notification."""
        # Arrange
        note_b = env.create_notification(env.owner_b)
        sut_url = reverse('notification-detail', kwargs={'pk': note_b.id})
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.delete(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND
        assert Notification.objects.filter(id=note_b.id).exists()

    def test_notification_isolation_cannot_mark_read_others(self, api_client, env):
        """User A cannot mark user B's notification as read."""
        # Arrange
        note_b = env.create_notification(env.owner_b)
        sut_url = reverse('notification-mark-read', kwargs={'pk': note_b.id})
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.post(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND
        note_b.refresh_from_db()
        assert not note_b.is_read

    def test_notification_isolation_bulk_mark_read_ignores_others(self, api_client, env):
        """Bulk mark-read silently ignores IDs belonging to other users."""
        # Arrange
        note_b = env.create_notification(env.owner_b)
        sut_url = reverse('notification-bulk-mark-read')
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.post(sut_url, {"ids": [note_b.id]}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        note_b.refresh_from_db()
        assert not note_b.is_read

    def test_notification_isolation_bulk_delete_ignores_others(self, api_client, env):
        """Bulk delete silently ignores IDs belonging to other users."""
        # Arrange
        note_b = env.create_notification(env.owner_b)
        sut_url = reverse('notification-bulk-delete')
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.post(sut_url, {"ids": [note_b.id]}, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert Notification.objects.filter(id=note_b.id).exists()

    # --- Utility Function Tests ---

    def test_send_notification_creates_record_with_correct_fields(self, env):
        """send_notification() creates a DB record with the exact fields passed."""
        # Arrange & Act
        sut_note = send_notification(
            user=env.owner_a,
            title="Invoice Paid",
            content="Your invoice #100 was paid.",
            action_type=Notification.ActionType.INVOICE_PAID,
            actor=env.owner_b
        )

        # Assert
        fetched = Notification.objects.get(id=sut_note.id)
        assert fetched.user == env.owner_a
        assert fetched.actor == env.owner_b
        assert fetched.title == "Invoice Paid"
        assert fetched.action_type == Notification.ActionType.INVOICE_PAID

    def test_send_notification_optional_actor_and_type(self, env):
        """send_notification() works with no actor and no action_type."""
        # Arrange & Act
        sut_note = send_notification(
            user=env.owner_a,
            title="Minimal",
            content="No actor, no type",
            action_type=None,
            actor=None
        )

        # Assert
        fetched = Notification.objects.get(id=sut_note.id)
        assert fetched.actor is None
        assert fetched.action_type is None

    def test_send_notification_missing_user_raises(self, env):
        """send_notification() with user=None must raise an error."""
        # Act & Assert
        with pytest.raises(Exception):
            send_notification(user=None, title="Oops", content="No user",
                              action_type=Notification.ActionType.SYSTEM)

    def test_send_notification_missing_title_raises(self, env):
        """send_notification() with title=None must raise an error."""
        # Act & Assert
        with pytest.raises(Exception):
            send_notification(user=env.owner_a, title=None, content="No title",
                              action_type=Notification.ActionType.SYSTEM)

    def test_send_broadcast_notification_reaches_all_active_users(self, env):
        """send_broadcast_notification() creates one notification per active user."""
        # Arrange
        Notification.objects.all().delete()
        active_users = list(User.objects.filter(is_active=True))

        # Act
        send_broadcast_notification(
            title="System Broadcast",
            content="Maintenance at midnight.",
            action_type=Notification.ActionType.SYSTEM,
            actor=env.owner_a
        )

        # Assert
        assert Notification.objects.count() == len(active_users)
        for user in active_users:
            note = Notification.objects.get(user=user)
            assert note.title == "System Broadcast"
            assert note.content == "Maintenance at midnight."
            assert note.action_type == Notification.ActionType.SYSTEM
            assert note.actor == env.owner_a
