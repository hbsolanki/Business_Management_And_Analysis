from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from apps.base.views.base_view import BaseViewSet
from apps.subscription.models import Plan, Subscription, Usage
from drf_spectacular.utils import extend_schema
from apps.subscription.serializers import subscription as subscription_serializers
from apps.base.permission.model_permissions import ModelPermissions
from apps.subscription.utils.entitlements import get_active_subscription
from django.core.cache import cache
from apps.notification.mixins import CreateReminderMixin


class SubscriptionPlanViewSet(CreateReminderMixin, BaseViewSet):
    def get_queryset(self):
        return Plan.objects.all()

    def get_serializer_class(self):
        if self.action in ("plan_purchase", "purchased_plan"):
            return subscription_serializers.SubscriptionSerializer
        elif self.action == "plan_usage":
            return subscription_serializers.PlanUsageSerializer

        return subscription_serializers.PlanReadSerializer

    def get_permissions(self):
        if self.action == "plans_details":
            return [AllowAny()]
        if self.action in ["plan_purchase", "purchased_plan"]:
            return [ModelPermissions()]
        return super().get_permissions()

    @extend_schema(summary="Plan Details")
    @action(detail=False, methods=["get"], url_path="plan", authentication_classes=[])
    def plans_details(self, _request):
        try:
            cache_key = "subscription:plans:all"
            
            def fetch_plans():
                plans = Plan.objects.all()
                return self.get_serializer(plans, many=True).data
                
            cached_data = cache.get_or_set(cache_key, fetch_plans, timeout=3600)
            return Response(cached_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Purchase Plan")
    @action(detail=False, methods=["post"], url_path="plan/purchase")
    def plan_purchase(self, request):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            business_id = request.user.business_id
            old_subscription = get_active_subscription(request.user.business)
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
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Purchased Plan")
    @action(detail=False, methods=["get"], url_path="plan/purchased")
    def purchased_plan(self, request):
        try:
            # 1. Look for active subscription first
            active_sub = get_active_subscription(request.user.business)

            # 2. Look for pending payment subscription
            pending_sub_qs = Subscription.objects.filter(
                business=request.user.business,
                status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
                is_active=False,
            )

            if active_sub:
                pending_sub_qs = pending_sub_qs.filter(created_at__gt=active_sub.created_at)

            pending_sub = pending_sub_qs.order_by("-created_at").first()

            # Bypass cache if there's a pending subscription to guarantee fresh real-time states
            if pending_sub:
                if active_sub:
                    serializer = self.get_serializer(active_sub)
                    data = serializer.data
                    data["pending_subscription"] = self.get_serializer(pending_sub).data
                    return Response(data, status=status.HTTP_200_OK)
                else:
                    serializer = self.get_serializer(pending_sub)
                    return Response(serializer.data, status=status.HTTP_200_OK)

            # Standard active cached path
            cache_key = f"subscription:business:{request.user.business_id}:active"
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data, status=status.HTTP_200_OK)

            if not active_sub:
                return Response(
                    None,
                    status=status.HTTP_200_OK,
                )

            serializer = self.get_serializer(active_sub)
            cache.set(cache_key, serializer.data, timeout=600)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Plan Usage")
    @action(detail=True, methods=["get"], url_path="usage")
    def plan_usage(self, request, pk):
        try:
            from django.shortcuts import get_object_or_404
            cache_key = f"subscription:usage:{pk}"

            def fetch_usage():
                subscription = get_object_or_404(Subscription, id=pk, business=request.user.business)
                usage_data, _ = Usage.objects.get_or_create(subscription=subscription)
                return self.get_serializer(usage_data).data

            try:
                cached_data = cache.get_or_set(cache_key, fetch_usage, timeout=180)
                return Response(cached_data, status=status.HTTP_200_OK)
            except Exception as e:
                from django.http import Http404
                if isinstance(e, Http404):
                    return Response(
                        {"details": "Subscription does not exist"},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                raise
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
