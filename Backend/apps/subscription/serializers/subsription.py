from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.subscription.models import Usage, Subscription, Plan


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
    plan_id = serializers.IntegerField(write_only=True, required=True)

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
        if not obj.is_active:
            return "cancelled"

        if obj.end_date < timezone.now():
            return "expired"

        return "active"

    def validate_plan_id(self, value):
        plan_obj = Plan.objects.filter(id=value).first()
        if not plan_obj:
            raise serializers.ValidationError("Plan does not exist")
        self.context["plan_obj"] = plan_obj
        return value

    def create(self, validated_data):
        plan_obj = self.context["plan_obj"]
        request = self.context.get("request")
        business = request.user.business
        business_id = business.id

        now = timezone.now()
        existing_subscription = Subscription.objects.filter(business_id=business_id).first()

        #Calculate Limits
        limits = self._calculate_limits(plan_obj, existing_subscription)

        #Cleanup Old Subscription
        if existing_subscription:
            self._cleanup_old_subscription(business_id)
        
        #Create New Subscription
        subscription = self._create_subscription(business, plan_obj, limits, now)
        return subscription

    def _calculate_limits(self, plan_obj, existing_subscription):
        max_products = plan_obj.max_products
        max_invoices = plan_obj.max_invoices
        max_staff = plan_obj.max_staff
        max_branch = plan_obj.max_branches

        if existing_subscription and existing_subscription.is_valid():
            if max_products is not None and existing_subscription.max_products is not None:
                max_products += existing_subscription.max_products
            elif existing_subscription.max_products is None:
                max_products = None

            if max_invoices is not None and existing_subscription.max_invoices is not None:
                max_invoices += existing_subscription.max_invoices
            elif existing_subscription.max_invoices is None:
                max_invoices = None

            if max_staff is not None and existing_subscription.max_staff is not None:
                max_staff += existing_subscription.max_staff
            elif existing_subscription.max_staff is None:
                max_staff = None

        return {
            "max_products": max_products,
            "max_invoices": max_invoices,
            "max_staff": max_staff,
            "max_branch": max_branch,
        }

    def _cleanup_old_subscription(self, business_id):
        Subscription.objects.filter(business_id=business_id).delete()

    def _create_subscription(self, business, plan_obj, limits, now):
        end_date = now + timedelta(days=plan_obj.duration_days)
        return Subscription.objects.create(
            business=business,
            plan=plan_obj,
            plan_name=plan_obj.name,
            price=plan_obj.price,
            duration_days=plan_obj.duration_days,
            max_products=limits["max_products"],
            max_invoices=limits["max_invoices"],
            max_staff=limits["max_staff"],
            max_branches=limits["max_branch"],
            has_advanced_analytics=plan_obj.has_advanced_analytics,
            has_chat=plan_obj.has_chat,
            has_api_access=plan_obj.has_api_access,
            has_ai_agent=plan_obj.has_ai_agent,
            start_date=now,
            end_date=end_date,
        )




class PlanUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = ["id", "subscription_id", "product_created", "invoices_created", "staff_created", "branches_created"]
