import stripe
from django.conf import settings
from apps.payment.serializers.stripe.stripe_onboarding import (
    StripeConnectAccountInputSerializer,
    StripeAccountLinkInputSerializer,
)


def _ensure_api_key():
    stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Central wrapper for all Stripe API interactions."""

    # Webhook
    @staticmethod
    def construct_webhook_event(payload, sig_header, secret=None):
        """Verify and construct a Stripe Webhook Event."""
        _ensure_api_key()
        return stripe.Webhook.construct_event(
            payload, sig_header, secret or settings.STRIPE_WEBHOOK_SECRET
        )

    # Stripe Connect — Invoice Payments
    @staticmethod
    def create_connect_account(email=None, country="IN"):
        # Create Stripe Express connected account
        serializer = StripeConnectAccountInputSerializer(data={"email": email, "country": country})
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    @staticmethod
    def create_account_link(stripe_account_id, refresh_url, return_url):
        # Generate one-time Stripe onboarding link
        serializer = StripeAccountLinkInputSerializer(data={
            "stripe_account_id": stripe_account_id,
            "refresh_url": refresh_url,
            "return_url": return_url,
        })
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    @staticmethod
    def retrieve_account(stripe_account_id):
        # Retrieve current Stripe account status
        _ensure_api_key()
        return stripe.Account.retrieve(stripe_account_id)

    @staticmethod
    def create_invoice_checkout_session(
        invoice_id,
        amount_in_cents,
        currency,
        connected_account_id,
        platform_fee_in_cents,
        success_url,
        cancel_url,
        customer_email=None,
    ):
        # Create Checkout Session for invoice payment via Destination Charge
        _ensure_api_key()
        payment_method_types = ["card"]
        if currency.lower() == "inr":
            payment_method_types.append("upi")

        params = {
            "payment_method_types": payment_method_types,
            "line_items": [
                {
                    "price_data": {
                        "currency": currency,
                        "unit_amount": amount_in_cents,
                        "product_data": {
                            "name": f"Invoice #{invoice_id}",
                        },
                    },
                    "quantity": 1,
                }
            ],
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "type": "INVOICE",
                "invoice_id": str(invoice_id),
                "connected_account_id": connected_account_id,
            },
            "payment_intent_data": {
                "transfer_data": {"destination": connected_account_id},
                "application_fee_amount": platform_fee_in_cents,
                "metadata": {
                    "type": "INVOICE",
                    "invoice_id": str(invoice_id),
                    "connected_account_id": connected_account_id,
                },
            },
        }
        if customer_email:
            params["customer_email"] = customer_email

        return stripe.checkout.Session.create(**params)

    # Standard Stripe Billing — Subscription Payments

    @staticmethod
    def get_or_create_customer(email, name=None, metadata=None):
        # Get or create Stripe Customer for a business
        _ensure_api_key()
        existing = stripe.Customer.list(email=email, limit=1)
        if existing.data:
            return existing.data[0]
        return stripe.Customer.create(
            email=email,
            name=name or email,
            metadata=metadata or {},
        )

    @staticmethod
    def create_subscription_checkout_session(
        subscription_id,
        business_id,
        user_id,
        amount_in_cents,
        currency,
        plan_name,
        success_url,
        cancel_url,
        customer_email=None,
        stripe_customer_id=None,
    ):
        # Create Checkout Session for subscription plan payment
        _ensure_api_key()
        params = {
            "payment_method_types": ["card"],
            "line_items": [
                {
                    "price_data": {
                        "currency": currency,
                        "unit_amount": amount_in_cents,
                        "product_data": {"name": f"{plan_name} Plan"},
                    },
                    "quantity": 1,
                }
            ],
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "type": "SUBSCRIPTION",
                "subscription_id": str(subscription_id),
                "business_id": str(business_id),
                "user_id": str(user_id),
            },
            "payment_intent_data": {
                "metadata": {
                    "type": "SUBSCRIPTION",
                    "subscription_id": str(subscription_id),
                    "business_id": str(business_id),
                    "user_id": str(user_id),
                }
            },
        }
        if stripe_customer_id:
            params["customer"] = stripe_customer_id
        elif customer_email:
            params["customer_email"] = customer_email

        return stripe.checkout.Session.create(**params)

    @staticmethod
    def create_refund(
        charge_id,
        amount_in_cents=None,
        reason=None,
        reverse_transfer=False,
        refund_application_fee=False,
    ):
        # Refund a Stripe charge; amount_in_cents=None for full refund
        _ensure_api_key()
        params = {"charge": charge_id}
        if amount_in_cents:
            params["amount"] = amount_in_cents
        if reason:
            params["reason"] = reason  # "duplicate" | "fraudulent" | "requested_by_customer"
        if reverse_transfer:
            params["reverse_transfer"] = True
        if refund_application_fee:
            params["refund_application_fee"] = True
        return stripe.Refund.create(**params)

