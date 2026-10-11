import pytest
from uuid import uuid4
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.subscription.models import Plan, Subscription
from apps.payment.services.subscription_payment_service import SubscriptionPaymentService


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sub_case_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.url_plans = reverse("subscription_plan-plans-details")
    tc.url_purchase = reverse("subscription_plan-plan-purchase")
    tc.url_purchased = reverse("subscription_plan-purchased-plan")
    return tc


@pytest.mark.django_db
class TestSubscription:

    def test_plans_details(self, api_client, sub_case_env):
        # Arrange - 1. Unauthenticated
        sut_url = sub_case_env.url_plans
        api_client.force_authenticate(user=None)

        # Act - 1
        sut_response_unauth = api_client.get(sut_url)

        # Assert - 1
        assert sut_response_unauth.status_code == status.HTTP_200_OK
        assert len(sut_response_unauth.data) >= 1

        # Arrange - 2. Authenticated
        api_client.force_authenticate(user=sub_case_env.owner_a)

        # Act - 2
        sut_response_auth = api_client.get(sut_url)

        # Assert - 2
        assert sut_response_auth.status_code == status.HTTP_200_OK
        assert len(sut_response_auth.data) >= 1

    def test_plan_purchase(self, api_client, sub_case_env):
        # Arrange
        Subscription.objects.all().delete()
        api_client.force_authenticate(user=sub_case_env.owner_a)
        plan = Plan.objects.first()
        plan.price = 0.0
        plan.save()
        payload = {"plan_id": plan.id}
        sut_purchase_url = sub_case_env.url_purchase

        # Act
        sut_response = api_client.post(sut_purchase_url, payload, format="json")

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "subscription_id" in sut_response.data
        assert sut_response.data["plan"] == plan.name

        # 1. Verify subscription details via purchased_plan
        sut_purchased_res = api_client.get(sub_case_env.url_purchased)
        assert sut_purchased_res.status_code == status.HTTP_200_OK
        assert sut_purchased_res.data["plan_name"] == plan.name
        assert float(sut_purchased_res.data["price"]) == float(plan.price)
        assert sut_purchased_res.data["duration_days"] == plan.duration_days
        assert sut_purchased_res.data["max_products"] == plan.max_products
        assert sut_purchased_res.data["max_staff"] == plan.max_staff
        assert "status" in sut_purchased_res.data
        assert "remaining_days" in sut_purchased_res.data

        # 2. Invalid plan ID
        sut_res_invalid = api_client.post(sut_purchase_url, {"plan_id": 9999}, format="json")
        assert sut_res_invalid.status_code == status.HTTP_400_BAD_REQUEST
        assert "plan_id" in str(sut_res_invalid.data)

        # 3. Empty plan ID
        sut_res_empty = api_client.post(sut_purchase_url, {}, format="json")
        assert sut_res_empty.status_code == status.HTTP_400_BAD_REQUEST

        # 4. Cumulative Logic
        Subscription.objects.all().delete()
        api_client.post(sut_purchase_url, {"plan_id": plan.id}, format="json")
        api_client.post(sut_purchase_url, {"plan_id": plan.id}, format="json")

        sut_cumulative_res = api_client.get(sub_case_env.url_purchased)
        assert sut_cumulative_res.status_code == status.HTTP_200_OK
        assert sut_cumulative_res.data["max_products"] == plan.max_products * 2
        assert sut_cumulative_res.data["max_staff"] == plan.max_staff * 2
        assert sut_cumulative_res.data["max_invoices"] == plan.max_invoices * 2

    def test_purchased_plan(self, api_client, sub_case_env):
        # Arrange
        api_client.force_authenticate(user=sub_case_env.owner_a)
        sut_purchased_url = sub_case_env.url_purchased

        # Act & Assert - 1. No active subscription
        Subscription.objects.all().delete()
        res_no_sub = api_client.get(sut_purchased_url)
        assert res_no_sub.status_code == status.HTTP_200_OK
        assert res_no_sub.data is None

        # Act & Assert - 2. With active subscription
        plan = Plan.objects.first()
        plan.price = 0.0
        plan.save()
        api_client.post(sub_case_env.url_purchase, {"plan_id": plan.id}, format="json")

        res_active_sub = api_client.get(sut_purchased_url)
        assert res_active_sub.status_code == status.HTTP_200_OK
        assert res_active_sub.data["plan_name"] == plan.name

    def test_plan_transition_upgrade_and_downgrade(self, api_client, sub_case_env):
        # Arrange
        api_client.force_authenticate(user=sub_case_env.owner_a)
        Subscription.objects.all().delete()

        plan_cheap = Plan.objects.get(name="Plan A")
        plan_cheap.price = 100.0
        plan_cheap.save()

        plan_expensive = Plan.objects.get(name="Plan B")
        plan_expensive.price = 500.0
        plan_expensive.save()

        # Act - 1. Purchase Cheaper Plan
        res = api_client.post(sub_case_env.url_purchase, {"plan_id": plan_cheap.id}, format="json")
        assert res.status_code == status.HTTP_200_OK
        sub_cheap_id = res.data["subscription_id"]

        sub_cheap = Subscription.objects.get(id=sub_cheap_id)
        assert sub_cheap.is_active is False
        assert sub_cheap.status == Subscription.SubscriptionStatus.PENDING_PAYMENT

        # Simulate online payment success for cheap plan
        tx_id_cheap = str(uuid4())
        SubscriptionPaymentService.handle_success(
            metadata={
                "subscription_id": sub_cheap.id,
                "business_id": sub_case_env.business_a.id,
                "user_id": sub_case_env.owner_a.id,
            },
            transaction_id=tx_id_cheap,
            event_id=f"evt_{tx_id_cheap}",
        )
        sub_cheap.refresh_from_db()
        assert sub_cheap.is_active is True
        assert sub_cheap.status == Subscription.SubscriptionStatus.ACTIVE

        # Act - 2. Upgrade Transition: Purchase Expensive Plan
        res_up = api_client.post(sub_case_env.url_purchase, {"plan_id": plan_expensive.id}, format="json")
        assert res_up.status_code == status.HTTP_200_OK
        sub_up_id = res_up.data["subscription_id"]

        sub_cheap.refresh_from_db()
        assert sub_cheap.is_active is False
        assert sub_cheap.status == Subscription.SubscriptionStatus.SUPERSEDED

        sub_up = Subscription.objects.get(id=sub_up_id)
        assert sub_up.is_active is False
        assert sub_up.status == Subscription.SubscriptionStatus.PENDING_PAYMENT

        tx_id_up = str(uuid4())
        SubscriptionPaymentService.handle_success(
            metadata={
                "subscription_id": sub_up.id,
                "business_id": sub_case_env.business_a.id,
                "user_id": sub_case_env.owner_a.id,
            },
            transaction_id=tx_id_up,
            event_id=f"evt_{tx_id_up}",
        )
        sub_up.refresh_from_db()
        assert sub_up.is_active is True
        assert sub_up.status == Subscription.SubscriptionStatus.ACTIVE

        # Act - 3. Downgrade Transition: Purchase Cheaper Plan (queued)
        res_down = api_client.post(sub_case_env.url_purchase, {"plan_id": plan_cheap.id}, format="json")
        assert res_down.status_code == status.HTTP_200_OK
        sub_down_id = res_down.data["subscription_id"]

        sub_up.refresh_from_db()
        assert sub_up.is_active is True
        assert sub_up.status == Subscription.SubscriptionStatus.ACTIVE

        sub_down = Subscription.objects.get(id=sub_down_id)
        assert sub_down.is_active is False
        assert sub_down.status == Subscription.SubscriptionStatus.PENDING_PAYMENT
        assert sub_down.start_date == sub_up.end_date

        tx_id_down = str(uuid4())
        SubscriptionPaymentService.handle_success(
            metadata={
                "subscription_id": sub_down.id,
                "business_id": sub_case_env.business_a.id,
                "user_id": sub_case_env.owner_a.id,
            },
            transaction_id=tx_id_down,
            event_id=f"evt_{tx_id_down}",
        )
        sub_down.refresh_from_db()
        assert sub_down.is_active is False
        assert sub_down.status == Subscription.SubscriptionStatus.PENDING_PAYMENT

    def test_plan_usage(self, api_client, sub_case_env):
        # Arrange
        api_client.force_authenticate(user=sub_case_env.owner_a)
        Subscription.objects.all().delete()
        plan = Plan.objects.first()
        plan.price = 0.0
        plan.save()
        res = api_client.post(sub_case_env.url_purchase, {"plan_id": plan.id}, format="json")
        sub_id = res.data["subscription_id"]
        sut_url_usage = reverse("subscription_plan-plan-usage", args=[sub_id])

        # Act - 1. Initial usage
        res_initial = api_client.get(sut_url_usage)
        assert res_initial.status_code == status.HTTP_200_OK
        initial_products = res_initial.data["product_created"]

        # Act - 2. Create product via API
        product_data = {
            "name": "Test Usage Product API",
            "sku": "TU-API-001",
            "base_price": 10.0,
            "cost_price": 5.0,
            "input_gst_rate": 18.0,
            "output_gst_rate": 18.0,
        }
        res_p = api_client.post(reverse("product-list"), product_data, format="json")
        assert res_p.status_code == status.HTTP_201_CREATED

        # Assert - 3. Verify increment
        res_final = api_client.get(sut_url_usage)
        assert res_final.status_code == status.HTTP_200_OK
        assert res_final.data["product_created"] == initial_products + 1

    def test_purchased_plan_with_nested_pending_subscription(self, api_client, sub_case_env):
        # Arrange
        api_client.force_authenticate(user=sub_case_env.owner_a)
        Subscription.objects.all().delete()

        plan_expensive = Plan.objects.get(name="Plan B")
        plan_expensive.price = 500.0
        plan_expensive.save()

        plan_cheap = Plan.objects.get(name="Plan A")
        plan_cheap.price = 100.0
        plan_cheap.save()

        active_sub = Subscription.objects.create(
            business=sub_case_env.business_a,
            plan=plan_expensive,
            plan_name=plan_expensive.name,
            price=plan_expensive.price,
            duration_days=plan_expensive.duration_days,
            max_products=plan_expensive.max_products,
            max_invoices=plan_expensive.max_invoices,
            max_staff=plan_expensive.max_staff,
            max_branches=plan_expensive.max_branches,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=plan_expensive.duration_days),
            is_active=True,
            status=Subscription.SubscriptionStatus.ACTIVE,
        )

        pending_sub = Subscription.objects.create(
            business=sub_case_env.business_a,
            plan=plan_cheap,
            plan_name=plan_cheap.name,
            price=plan_cheap.price,
            duration_days=plan_cheap.duration_days,
            max_products=plan_cheap.max_products,
            max_invoices=plan_cheap.max_invoices,
            max_staff=plan_cheap.max_staff,
            max_branches=plan_cheap.max_branches,
            start_date=active_sub.end_date,
            end_date=active_sub.end_date + timedelta(days=plan_cheap.duration_days),
            is_active=False,
            status=Subscription.SubscriptionStatus.PENDING_PAYMENT,
        )

        # Act
        sut_response = api_client.get(sub_case_env.url_purchased)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert sut_response.data["id"] == active_sub.id
        assert sut_response.data["is_active"] is True

        assert "pending_subscription" in sut_response.data
        nested = sut_response.data["pending_subscription"]
        assert nested["id"] == pending_sub.id
        assert nested["plan_name"] == plan_cheap.name
        assert nested["is_active"] is False
        assert nested["status"] == "pending_payment"
