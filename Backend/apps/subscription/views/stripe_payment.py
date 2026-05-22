from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from apps.subscription.models import Subscription
from apps.base.views.payment_base import BasePaymentViewSet
from django.conf import settings


class PaymentViewSet(BasePaymentViewSet):
    """
    Subscription Payment ViewSet using shared BasePaymentViewSet.
    """

    def get_payment_details(self, request):
        subscription_id = request.data.get("subscription_id")
        if not subscription_id:
            raise ValidationError("subscription_id is required")

        subscription = Subscription.objects.get(
            id=subscription_id,
            business=request.user.business,
        )

        if subscription.status != Subscription.SubscriptionStatus.PENDING_PAYMENT:
            raise ValidationError("Only pending subscriptions can be paid")

        if subscription.price is None or subscription.price <= 0:
            raise ValidationError("Invalid subscription price for payment")

        return int(subscription.price * 100), {
            "subscription_id": subscription.id,
            "business_id": subscription.business.id,
            "user_id": request.user.id,
            "type": "SUBSCRIPTION",
        }

    def handle_not_found(self):
        return Response(
            {"error": "Subscription not found"}, status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=False, methods=["post"], url_path="confirm")
    def confirm_payment(self, request):
        payment_intent_id = request.data.get("payment_intent_id")
        subscription_id = request.data.get("subscription_id")
        mock = request.data.get("mock", False)

        if not payment_intent_id and not subscription_id:
            raise ValidationError(
                "Either payment_intent_id or subscription_id is required"
            )

        # Handle Mock Payment simulation (Strictly restricted to Debug/Dev mode)
        if mock:
            if not getattr(settings, "DEBUG", False):
                return Response(
                    {"error": "Mock payment is only allowed in debug mode"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if not subscription_id:
                raise ValidationError("subscription_id is required for mock payment")

            try:
                subscription = Subscription.objects.get(
                    id=subscription_id,
                    business=request.user.business,
                )
                if (
                    subscription.status
                    != Subscription.SubscriptionStatus.PENDING_PAYMENT
                ):
                    raise ValidationError("Only pending subscriptions can be paid")

                metadata = {
                    "subscription_id": subscription.id,
                    "business_id": subscription.business.id,
                    "user_id": request.user.id,
                    "type": "SUBSCRIPTION",
                }

                from apps.subscription.services.payment_service import (
                    SubscriptionPaymentService,
                )

                SubscriptionPaymentService.handle_success(
                    metadata=metadata,
                    transaction_id=f"mock_txn_{subscription.id}",
                    event_type="payment_intent.succeeded",
                    payment_type="SUBSCRIPTION",
                )

                return Response(
                    {"success": True, "message": "Mock payment simulated successfully"},
                    status=status.HTTP_200_OK,
                )
            except Subscription.DoesNotExist:
                return self.handle_not_found()
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Handle secure Stripe Payment confirmation
        try:
            import stripe

            stripe.api_key = settings.STRIPE_SECRET_KEY

            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            metadata = intent.get("metadata", {})
            payment_type = metadata.get("type")

            if intent.status != "succeeded":
                return Response(
                    {
                        "error": f"Payment intent status is {intent.status}, not succeeded"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if payment_type != "SUBSCRIPTION":
                return Response(
                    {"error": "Invalid payment type for subscription confirmation"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Safety check: Verify business in metadata matches user's business
            business_id = metadata.get("business_id")
            if not business_id or str(business_id) != str(request.user.business.id):
                return Response(
                    {"error": "Unauthorized access to this payment confirmation"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            from apps.subscription.services.payment_service import (
                SubscriptionPaymentService,
            )

            SubscriptionPaymentService.handle_success(
                metadata=metadata,
                transaction_id=intent.get("id"),
                event_type="payment_intent.succeeded",
                payment_type="SUBSCRIPTION",
            )

            return Response(
                {"success": True, "message": "Subscription activated successfully"},
                status=status.HTTP_200_OK,
            )

        except stripe.error.StripeError as e:
            return Response(
                {"error": f"Stripe error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
