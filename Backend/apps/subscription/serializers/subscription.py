from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.subscription.models import Usage, Subscription, Plan
from apps.subscription.utils.entitlements import get_active_subscription


class PlanReadSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Plan
        fields = BaseSerializer.Meta.fields + [
            "name",
            "price",
            "duration_days",
            "max_products",
            "max_invoices",
            "max_staff",
            "max_branches",
            "has_advanced_analytics",
            "has_chat",
            "has_api_access",
            "has_ai_agent",
        ]


class SubscriptionSerializer(BaseSerializer):
    status = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.all(), source="plan", write_only=True, required=True
    )

    class Meta(BaseSerializer.Meta):
        model = Subscription
        fields = BaseSerializer.Meta.fields + [
            "plan_name",
            "plan",
            "price",
            "duration_days",
            "max_products",
            "max_invoices",
            "max_staff",
            "max_branches",
            "has_advanced_analytics",
            "has_chat",
            "has_api_access",
            "has_ai_agent",
            "start_date",
            "end_date",
            "remaining_days",
            "status",
            "is_trial",
            "plan_id",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "plan_name",
            "plan",
            "price",
            "duration_days",
            "max_products",
            "max_invoices",
            "max_staff",
            "max_branches",
            "has_advanced_analytics",
            "has_chat",
            "has_api_access",
            "has_ai_agent",
            "start_date",
            "end_date",
            "is_trial",
        ]

    def get_remaining_days(self, obj):
        delta = obj.end_date - timezone.now()
        return max(delta.days, 0)

    def get_status(self, obj):
        return obj.status.lower()



    def create(self, validated_data):
        plan_obj = validated_data.pop("plan")
        request = self.context.get("request")
        business = request.user.business

        now = timezone.now()
        existing_subscription = get_active_subscription(business)

        # 1. Handle Renewals (Same Plan)
        if existing_subscription and existing_subscription.plan_id == plan_obj.id:
            if float(plan_obj.price) == 0:
                with transaction.atomic():
                    # Extend the existing subscription's end_date
                    existing_subscription.end_date += timedelta(
                        days=plan_obj.duration_days
                    )

                    # Cumulative limit calculation for the same plan renewal
                    if (
                        plan_obj.max_products is not None
                        and existing_subscription.max_products is not None
                    ):
                        existing_subscription.max_products += plan_obj.max_products
                    if (
                        plan_obj.max_invoices is not None
                        and existing_subscription.max_invoices is not None
                    ):
                        existing_subscription.max_invoices += plan_obj.max_invoices
                    if (
                        plan_obj.max_staff is not None
                        and existing_subscription.max_staff is not None
                    ):
                        existing_subscription.max_staff += plan_obj.max_staff

                    existing_subscription.save()
                    return existing_subscription
            else:
                # Paid Renewal: create a PENDING_PAYMENT subscription queued to start after the active subscription ends
                limits = {
                    "max_products": plan_obj.max_products,
                    "max_invoices": plan_obj.max_invoices,
                    "max_staff": plan_obj.max_staff,
                    "max_branches": plan_obj.max_branches,
                }
                start_date = existing_subscription.end_date
                return self._create_subscription(
                    business, plan_obj, limits, start_date, is_free_plan=False
                )

        # 2. Handle Plan Transitions (Different Plan)
        is_free_plan = float(plan_obj.price) == 0
        is_upgrade = (
            existing_subscription is None
            or plan_obj.price >= existing_subscription.price
        )

        if is_upgrade:
            # Immediate Upgrade (non-cumulative limits)
            limits = {
                "max_products": plan_obj.max_products,
                "max_invoices": plan_obj.max_invoices,
                "max_staff": plan_obj.max_staff,
                "max_branches": plan_obj.max_branches,
            }
            with transaction.atomic():
                if existing_subscription:
                    existing_subscription.is_active = False
                    existing_subscription.status = (
                        Subscription.SubscriptionStatus.SUPERSEDED
                    )
                    existing_subscription.cancelled_at = now
                    existing_subscription.save(
                        update_fields=["is_active", "status", "cancelled_at"]
                    )

                return self._create_subscription(
                    business, plan_obj, limits, now, is_free_plan=is_free_plan
                )
        else:
            # Queued Downgrade (start after current subscription ends)
            limits = {
                "max_products": plan_obj.max_products,
                "max_invoices": plan_obj.max_invoices,
                "max_staff": plan_obj.max_staff,
                "max_branches": plan_obj.max_branches,
            }
            start_date = existing_subscription.end_date
            return self._create_subscription(
                business, plan_obj, limits, start_date, is_free_plan=False
            )

    def _create_subscription(
        self, business, plan_obj, limits, start_date, is_free_plan=False
    ):
        end_date = start_date + timedelta(days=plan_obj.duration_days)
        status = (
            Subscription.SubscriptionStatus.ACTIVE
            if is_free_plan
            else Subscription.SubscriptionStatus.PENDING_PAYMENT
        )
        return Subscription.objects.create(
            business=business,
            plan=plan_obj,
            plan_name=plan_obj.name,
            price=plan_obj.price,
            duration_days=plan_obj.duration_days,
            max_products=limits["max_products"],
            max_invoices=limits["max_invoices"],
            max_staff=limits["max_staff"],
            max_branches=limits["max_branches"],
            has_advanced_analytics=plan_obj.has_advanced_analytics,
            has_chat=plan_obj.has_chat,
            has_api_access=plan_obj.has_api_access,
            has_ai_agent=plan_obj.has_ai_agent,
            start_date=start_date,
            end_date=end_date,
            is_active=is_free_plan,
            status=status,
        )


class PlanUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = [
            "id",
            "subscription_id",
            "product_created",
            "invoices_created",
            "staff_created",
            "branches_created",
        ]
