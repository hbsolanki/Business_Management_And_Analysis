"""
CreateReminderMixin
====================
A DRF ViewSet mixin that adds a generic `POST /{id}/create-reminder/` action
to any ModelViewSet. Simply inherit from this mixin in any ViewSet — no extra
code required.

Usage:
    from apps.notification.mixins import CreateReminderMixin

    class PurchaseOrderViewSet(CreateReminderMixin, BaseViewSet, ModelViewSet):
        ...

The mixin will automatically call get_object() on the ViewSet, validate the
incoming data with CreateEntityReminderSerializer, create the Reminder and
ReminderLink, and return the serialized Reminder response.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response


class CreateReminderMixin:
    """
    Adds a `POST /{id}/create-reminder/` action to any ModelViewSet.

    Fields accepted in request body:
        - title      (str, required)
        - content    (str, optional)
        - remind_at  (ISO 8601 datetime, required, must be in the future)
        - recurrence (NONE | DAILY | WEEKLY | MONTHLY, default NONE)

    Returns the created Reminder (with its links) serialized via ReminderSerializer.
    """

    @action(detail=True, methods=["post"], url_path="create-reminder")
    def create_reminder(self, request, pk=None):
        from apps.notification.serializers import CreateEntityReminderSerializer, ReminderSerializer

        entity_instance = self.get_object()
        serializer = CreateEntityReminderSerializer(
            data=request.data,
            context={"request": request, "entity_instance": entity_instance},
        )
        serializer.is_valid(raise_exception=True)
        reminder = serializer.save()
        return Response(
            ReminderSerializer(reminder, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
