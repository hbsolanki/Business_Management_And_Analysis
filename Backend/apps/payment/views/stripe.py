from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
import logging
import stripe

from apps.base.views.base_view import BaseViewSet
from apps.base.permission.model_permissions import ModelPermissions
from apps.master.permission.custom_permissions import IsOwnerOrManager
from apps.payment.models import StripeConnectAccount
from apps.payment.services.stripe_service import StripeService
from apps.payment.serializers import (
    StripeConnectAccountSerializer,
    EnableOnlinePaymentsSerializer,
    OnboardingReturnSerializer,
    OnboardingRefreshSerializer,
    StripeWebhookSerializer,
)

logger = logging.getLogger(__name__)


from drf_spectacular.utils import extend_schema

class StripeConnectViewSet(BaseViewSet):
    """
    Manages Stripe Connect onboarding for invoice online payments.

    Full Flow:
      POST /payment/connect/enable          → Step 1+2: create account + return onboarding URL
      GET  /payment/connect/return          → Step 3: after owner returns from Stripe
      GET  /payment/connect/refresh         → Step 3b: if onboarding link expired, regenerate
      GET  /payment/connect/status          → check can_accept_payments
    """
    permission_classes = [ModelPermissions, IsOwnerOrManager]
    serializer_class = StripeConnectAccountSerializer

    def get_queryset(self):
        return StripeConnectAccount.objects.filter(business=self.request.user.business)

    def get_serializer_class(self):
        if self.action == "enable_online_payments":
            return EnableOnlinePaymentsSerializer
        if self.action == "onboarding_return":
            return OnboardingReturnSerializer
        if self.action == "onboarding_refresh":
            return OnboardingRefreshSerializer
        return StripeConnectAccountSerializer

    @extend_schema(
        summary="Enable online payments",
        request=EnableOnlinePaymentsSerializer,
        responses={200: serializers.Serializer}
    )
    @action(detail=False, methods=["post"], url_path="enable")
    def enable_online_payments(self, request):
        """Creates a Stripe Express connected account and generates an onboarding link."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res_data = serializer.save()
        if res_data.get("already_active"):
            return Response(
                {"detail": "Online payments already active.", "status": res_data["status"]},
                status=status.HTTP_200_OK,
            )
        return Response({"onboarding_url": res_data["onboarding_url"]}, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Stripe onboarding return",
        responses={200: StripeConnectAccountSerializer}
    )
    @action(detail=False, methods=["get"], url_path="return")
    def onboarding_return(self, request):
        """Handles Stripe onboarding redirection back and syncs account status."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        connect_account = serializer.save()
        return Response(StripeConnectAccountSerializer(connect_account).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Refresh onboarding link",
        responses={200: serializers.Serializer}
    )
    @action(detail=False, methods=["get"], url_path="refresh")
    def onboarding_refresh(self, request):
        """Regenerates a fresh Stripe Account onboarding link when expired."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res_data = serializer.save()
        return Response({"onboarding_url": res_data["onboarding_url"]}, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get Stripe connection status",
        responses={200: StripeConnectAccountSerializer}
    )
    @action(detail=False, methods=["get"], url_path="status")
    def connect_status(self, request):
        """Returns current Stripe Connect status for the business."""
        connect_account = StripeConnectAccount.objects.filter(
            business=request.user.business
        ).first()
        if not connect_account:
            return Response({"status": "NOT_CONFIGURED", "can_accept_payments": False})
        return Response(self.get_serializer(connect_account).data)


class StripeWebhookViewSet(viewsets.ViewSet):
    """
    Unified Webhook handler for ALL Stripe events across the platform.
    Delegates all parsing, verification, and database updates to StripeWebhookSerializer.
    """
    permission_classes = []
    authentication_classes = []
    serializer_class = StripeWebhookSerializer

    @extend_schema(
        summary="Process Stripe webhook event",
        request=StripeWebhookSerializer,
        responses={200: None}
    )
    @action(detail=False, methods=["post"], url_path="")
    def webhook(self, request):
        try:
            event = StripeService.construct_webhook_event(
                request.body, request.META.get("HTTP_STRIPE_SIGNATURE")
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            logger.warning("Invalid Stripe webhook signature")
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Webhook event construction failed: %s", exc)
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)

        # Utilize serializer to parse, validate, and execute changes
        serializer = StripeWebhookSerializer(data=event)
        if not serializer.is_valid():
            logger.error("Stripe event validation failed: %s", serializer.errors)
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)

        try:
            serializer.save()
            return HttpResponse(status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Stripe webhook processing failed: %s", exc)
            return HttpResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
