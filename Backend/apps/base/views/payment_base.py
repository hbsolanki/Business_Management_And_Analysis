from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.http import HttpResponse
import logging
from apps.base.services.stripe_service import StripeService
import stripe

logger = logging.getLogger(__name__)

class BasePaymentViewSet(viewsets.ViewSet):
    """
    Base ViewSet for handling Stripe Payments.
    Subclasses must implement:
    - get_payment_details(request) -> returns (amount_in_cents, metadata)
    - handle_not_found() -> returns Response
    """
    permission_classes = [IsAuthenticated]

    def get_payment_details(self, request):
        raise NotImplementedError()
    
    def handle_not_found(self):
        return Response({'error': 'Resource not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path="create-intent")
    def create_intent(self, request):
        try:
            amount_in_cents, metadata = self.get_payment_details(request)
            intent = StripeService.create_payment_intent(amount_in_cents, metadata)
            return Response({'clientSecret': intent['client_secret']}, status=status.HTTP_200_OK)
        except Exception as e:
            if "DoesNotExist" in str(type(e)):
                return self.handle_not_found()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StripeWebhookViewSet(viewsets.ViewSet):
    """
    Unified Webhook handler for all Stripe events.
    Dispatches to app-specific services based on metadata['type'].
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @action(detail=False, methods=["post"], url_path="")
    def webhook(self, request):
        try:
            event = StripeService.construct_webhook_event(
                request.body, request.META.get('HTTP_STRIPE_SIGNATURE')
            )
            event_id = event.get('id')
            event_type = event.get('type')
            intent = event['data']['object']
            metadata = intent.get('metadata', {})
            payment_type = metadata.get('type')
            
            if event_type == 'payment_intent.succeeded':
                if payment_type == 'INVOICE':
                    from apps.invoice.services.payment_service import InvoicePaymentService
                    InvoicePaymentService.handle_success(metadata, intent.get('id'))
                elif payment_type == 'SUBSCRIPTION':
                    from apps.subscription.services.payment_service import SubscriptionPaymentService
                    SubscriptionPaymentService.handle_success(
                        metadata,
                        intent.get('id'),
                        event_id=event_id,
                        event_type=event_type,
                        payment_type=payment_type,
                    )
            
            elif event_type in ['payment_intent.payment_failed', 'payment_intent.canceled']:
                if payment_type == 'INVOICE':
                    from apps.invoice.services.payment_service import InvoicePaymentService
                    InvoicePaymentService.handle_failure(metadata)
                elif payment_type == 'SUBSCRIPTION':
                    from apps.subscription.services.payment_service import SubscriptionPaymentService
                    SubscriptionPaymentService.handle_failure(
                        metadata,
                        event_id=event_id,
                        event_type=event_type,
                        payment_type=payment_type,
                    )
                
            return HttpResponse(status=status.HTTP_200_OK)
        except (ValueError, stripe.error.SignatureVerificationError):
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Stripe webhook processing failed: %s", exc)
            return HttpResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
