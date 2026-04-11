import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    @staticmethod
    def create_payment_intent(amount_in_cents, metadata, currency='inr'):
        """Create a Stripe PaymentIntent."""
        return stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=currency,
            metadata=metadata,
            automatic_payment_methods={'enabled': True},
        )

    @staticmethod
    def construct_webhook_event(payload, sig_header):
        """Verify and construct a Stripe Webhook Event."""
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
