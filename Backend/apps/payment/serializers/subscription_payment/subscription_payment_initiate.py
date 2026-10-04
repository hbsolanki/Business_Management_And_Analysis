from rest_framework import serializers
from django.conf import settings
import logging

from apps.subscription.models import Subscription
from apps.payment.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

class InitiateSubscriptionPaymentSerializer(serializers.Serializer):
    subscription_id = serializers.PrimaryKeyRelatedField(
        queryset=Subscription.objects.all(),
        write_only=True
    )
    success_url = serializers.URLField(required=True)
    cancel_url = serializers.URLField(required=True)

    def validate_subscription_id(self, value):
        request = self.context.get("request")
        if request and request.user:
            if value.business != request.user.business:
                raise serializers.ValidationError("Subscription does not belong to your business.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        subscription = validated_data["subscription_id"]

        try:
            business = subscription.business
            amount_in_cents = int((subscription.price or 0) * 100)

            # Get or create Stripe Customer for this business
            customer_email = getattr(business, "email", None)
            stripe_customer = StripeService.get_or_create_customer(
                email=customer_email or f"business_{business.id}@bma.internal",
                name=getattr(business, "name", None),
                metadata={"business_id": str(business.id)},
            )

            success_url = validated_data["success_url"]
            cancel_url = validated_data["cancel_url"]

            session = StripeService.create_subscription_checkout_session(
                subscription_id=subscription.id,
                business_id=business.id,
                user_id=request.user.id,
                amount_in_cents=amount_in_cents,
                currency="inr",
                plan_name=subscription.plan_name or subscription.plan.name,
                success_url=success_url,
                cancel_url=cancel_url,
                stripe_customer_id=stripe_customer.id,
            )

            return {
                "checkout_url": session.url,
                "subscription_id": subscription.id
            }

        except Exception as exc:
            logger.exception("Failed to create subscription Checkout Session: %s", exc)
            raise serializers.ValidationError({"stripe_error": str(exc)})
