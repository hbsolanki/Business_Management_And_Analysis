from rest_framework import serializers
from django.conf import settings
from django.utils import timezone
import logging

import stripe

from apps.payment.models import StripeConnectAccount
from apps.master.utils.text_choices import StripeAccountStatus
from apps.payment.serializers.stripe.stripe_connect import StripeConnectAccountSerializer
from apps.payment.utils.connect_account import sync_connect_account

logger = logging.getLogger(__name__)


class StripeOnboardingBaseSerializer(serializers.Serializer):
    def _get_request(self):
        return self.context.get("request")

    def _get_business(self):
        request = self._get_request()
        return getattr(getattr(request, "user", None), "business", None)

    def _get_connect_account(self):
        business = self._get_business()
        if not business:
            return None
        return StripeConnectAccount.objects.filter(business=business).first()

    def _require_connect_account(self):
        connect_account = self._get_connect_account()
        if not connect_account:
            raise serializers.ValidationError({"detail": "No Connect account found."})
        return connect_account


class EnableOnlinePaymentsSerializer(StripeOnboardingBaseSerializer):
    def validate(self, attrs):
        request = self._get_request()
        if not hasattr(request.user, 'role_name') or request.user.role_name != 'OWNER':
            raise serializers.ValidationError({"detail": "Only the business owner can set up online payments."})
        return attrs

    def create(self, validated_data):
        from apps.payment.services.stripe_service import StripeService
        business = self._get_business()
        connect_account = self._get_connect_account()

        if connect_account and connect_account.can_accept_payments:
            return {
                "already_active": True,
                "status": connect_account.status
            }

        try:
            # Step 1: Create Stripe Express Account
            if not connect_account:
                stripe_account = StripeService.create_connect_account(
                    email=getattr(business, "email", None),
                    country=getattr(settings, "STRIPE_CONNECT_COUNTRY", "IN"),
                )
                create_serializer = StripeConnectAccountSerializer(data={
                    "business_id": business.id,
                    "stripe_account_id": stripe_account.id,
                    "status": StripeAccountStatus.PENDING,
                    "onboarding_started_at": timezone.now(),
                })
                create_serializer.is_valid(raise_exception=True)
                connect_account = create_serializer.save()

            # Step 2: Generate Account Link
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            link = StripeService.create_account_link(
                stripe_account_id=connect_account.stripe_account_id,
                refresh_url=f"{frontend_url}/payment/connect/refresh",
                return_url=f"{frontend_url}/payment/connect/return",
            )
            return {
                "already_active": False,
                "onboarding_url": link.url
            }

        except Exception as exc:
            logger.exception("Stripe Connect account creation failed: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})


class OnboardingReturnSerializer(StripeOnboardingBaseSerializer):
    def validate(self, attrs):
        self._require_connect_account()
        return attrs

    def create(self, validated_data):
        from apps.payment.services.stripe_service import StripeService
        connect_account = self._require_connect_account()

        try:
            stripe_account = StripeService.retrieve_account(connect_account.stripe_account_id)
            sync_connect_account(connect_account, stripe_account)
            return connect_account
        except Exception as exc:
            logger.exception("Failed to retrieve Stripe account on return: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})


class OnboardingRefreshSerializer(StripeOnboardingBaseSerializer):
    def validate(self, attrs):
        self._require_connect_account()
        return attrs

    def create(self, validated_data):
        from apps.payment.services.stripe_service import StripeService
        connect_account = self._require_connect_account()

        try:
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            link = StripeService.create_account_link(
                stripe_account_id=connect_account.stripe_account_id,
                refresh_url=f"{frontend_url}/payment/connect/refresh",
                return_url=f"{frontend_url}/payment/connect/return",
            )
            return {"onboarding_url": link.url}
        except Exception as exc:
            logger.exception("Failed to regenerate Stripe onboarding link: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})


def _ensure_api_key():
    stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeConnectAccountInputSerializer(serializers.Serializer):
    """
    Standard DRF Serializer to validate inputs and natively construct/create
    Stripe connected express accounts.
    """
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    country = serializers.CharField(max_length=2, default="IN")

    def validate_country(self, value):
        if len(value) != 2:
            raise serializers.ValidationError("Country must be a 2-letter code.")
        return value

    def create(self, validated_data):
        _ensure_api_key()
        email = validated_data.get("email")
        country = validated_data.get("country", "IN")

        params = {
            "type": "express",
            "country": country,
            "capabilities": {
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            "business_profile": {
                "mcc": "7372",
                "product_description": "Business management and invoice payment platform",
            },
            "settings": {
                "payouts": {
                    "schedule": {"interval": "manual"},
                }
            },
        }
        if email:
            params["email"] = email

        return stripe.Account.create(**params)


class StripeAccountLinkInputSerializer(serializers.Serializer):
    """
    Standard DRF Serializer to validate inputs and natively construct/create
    Stripe connected express account links.
    """
    stripe_account_id = serializers.CharField()
    refresh_url = serializers.URLField()
    return_url = serializers.URLField()

    def validate_stripe_account_id(self, value):
        if not value.strip():
            raise serializers.ValidationError("Stripe account id is required.")
        return value

    def create(self, validated_data):
        _ensure_api_key()
        stripe_account_id = validated_data["stripe_account_id"]
        refresh_url = validated_data["refresh_url"]
        return_url = validated_data["return_url"]

        return stripe.AccountLink.create(
            account=stripe_account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )