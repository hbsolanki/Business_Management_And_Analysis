from rest_framework import status
from rest_framework.response import Response
from apps.subscription.models import Subscription
from apps.base.views.payment_base import BasePaymentViewSet

class PaymentViewSet(BasePaymentViewSet):
    """
    Subscription Payment ViewSet using shared BasePaymentViewSet.
    """

    def get_payment_details(self, request):
        subscription_id = request.data.get('subscription_id')
        subscription = Subscription.objects.get(id=subscription_id)
        
        return int(subscription.price * 100), {
            "subscription_id": subscription.id,
            "business_id": subscription.business.id,
            "user_id": request.user.id,
            "type": "SUBSCRIPTION"
        }

    def handle_not_found(self):
         return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)
