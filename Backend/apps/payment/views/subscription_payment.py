from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.base.views.base_view import BaseViewSet
from apps.payment.models import SubscriptionPayment
from apps.payment.serializers import (
    SubscriptionPaymentSerializer,
    InitiateSubscriptionPaymentSerializer,
)

class SubscriptionPaymentViewSet(BaseViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin):
    """
    Admin-only: Create a Stripe Checkout Session for a subscription plan payment.
    POST /payment/subscription-payments/initiate
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionPaymentSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            SubscriptionPayment.objects
            .filter(payment__business=self.request.user.business)
            .select_related("payment", "payment__gateway_detail", "subscription")
            .order_by("-payment__created_at")
        )

    def get_serializer_class(self):
        if self.action == "initiate":
            return InitiateSubscriptionPaymentSerializer
        return SubscriptionPaymentSerializer

    @extend_schema(
        summary="Initiate subscription payment session",
        request=InitiateSubscriptionPaymentSerializer,
        responses={200: SubscriptionPaymentSerializer}
    )
    @action(detail=False, methods=["post"], url_path="initiate")
    def initiate(self, request):
        """
        Admin assigns a plan → this creates a Stripe Checkout Session and returns the URL.
        The business owner pays via the URL.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res_data = serializer.save()
        return Response(res_data, status=status.HTTP_200_OK)
