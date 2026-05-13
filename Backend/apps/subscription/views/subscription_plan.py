from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from apps.base.views.base_view import BaseViewSet
from apps.subscription.models import Plan, Subscription, Usage
from drf_spectacular.utils import extend_schema
from apps.subscription.serializers import subsription
from apps.base.permission.model_permissions import ModelPermissions
from django.core.cache import cache


class SubscriptionPlanViewSet(BaseViewSet):
    def get_queryset(self):
        return Plan.objects.all()

    def get_serializer_class(self):
        if self.action in ('plan_purchase', 'purchased_plan'):
            return subsription.SubscriptionSerializer
        elif self.action == 'plan_usage':
            return subsription.PlanUsageSerializer

        return subsription.PlanReadSerializer

    def get_permissions(self):
        if self.action == "plans_details":
            return [AllowAny()]
        if self.action in ["plan_purchase", "purchased_plan"]:
            return [ModelPermissions()]
        return super().get_permissions()

    @extend_schema(summary="Plan Details")
    @action(detail=False, methods=['get'], url_path="plan", authentication_classes=[])
    def plans_details(self, request):
        cache_key = "subscription:plans:all"
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            return Response(cached_data, status=status.HTTP_200_OK)

        plans = Plan.objects.all()
        serializer = self.get_serializer(plans, many=True)
        
        cache.set(cache_key, serializer.data, timeout=3600)
        
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(summary="Purchase Plan")
    @action(detail=False, methods=['post'], url_path="plan/purchase")
    def plan_purchase(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        business_id = request.user.business_id
        old_subscription = Subscription.objects.filter(business_id=business_id).first()
        old_id = old_subscription.id if old_subscription else None
        
        subscription = serializer.save()

        if old_id:
            cache.delete(f"subscription:usage:{old_id}")
        cache.delete(f"subscription:business:{business_id}:active")

        return Response(
            {
                "subscription_id": subscription.id,
                "plan": subscription.plan_name,
            },
            status=status.HTTP_200_OK
        )

    @extend_schema(summary="Purchased Plan")
    @action(detail=False, methods=['get'], url_path="plan/purchased")
    def purchased_plan(self, request):
        cache_key = f"subscription:business:{request.user.business_id}:active"
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            return Response(cached_data, status=status.HTTP_200_OK)

        data = Subscription.objects.filter(business=request.user.business).first()
        if not data:
            return Response(
                {"message": "You not purchased any plan"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data)
        # cache.set(cache_key, serializer.data, timeout=600)
        
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(summary="Plan Usage")
    @action(detail=True, methods=['get'], url_path="usage")
    def plan_usage(self, request, pk):
        cache_key = f"subscription:usage:{pk}"
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            return Response(cached_data, status=status.HTTP_200_OK)

        try:
            subscription = Subscription.objects.get(id=pk, business=request.user.business)
            usage_data = Usage.objects.filter(subscription=subscription).first()
            if not usage_data:
                return Response(
                    {"details": "Subscription Usage does not exist"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(usage_data)
            cache.set(cache_key, serializer.data, timeout=180)
            
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Subscription.DoesNotExist:
            return Response(
                {"details": "Subscription does not exist"},
                status=status.HTTP_400_BAD_REQUEST
            )
