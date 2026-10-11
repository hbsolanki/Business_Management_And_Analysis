import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.subscription.models import Subscription, Usage
from apps.product.models import Product


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def usage_env(api_client):
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    Subscription.objects.all().delete()
    Usage.objects.all().delete()
    tc.plan = tc.create_plan(
        name="Usage Plan",
        price=0.0,
        max_products=10,
        max_staff=10,
        max_invoices=10,
        max_branches=10,
    )
    api_client.force_authenticate(user=tc.owner_a)
    res = api_client.post(
        reverse("subscription_plan-plan-purchase"),
        {"plan_id": tc.plan.id},
        format="json",
    )
    tc.sub_id = res.data["subscription_id"]
    tc.url_usage = reverse("subscription_plan-plan-usage", args=[tc.sub_id])
    return tc


@pytest.mark.django_db
class TestSubscriptionUsage:

    def test_product_created(self, api_client, usage_env):
        # Arrange
        api_client.force_authenticate(user=usage_env.owner_a)
        sut_res_initial = api_client.get(usage_env.url_usage)
        initial = sut_res_initial.data["product_created"]

        product_data = {
            "name": "Usage Product",
            "sku": "U-001",
            "base_price": 10.0,
            "cost_price": 5.0,
            "input_gst_rate": 18.0,
            "output_gst_rate": 18.0,
        }

        # Act
        api_client.post(reverse("product-list"), product_data, format="json")

        # Assert
        sut_res_final = api_client.get(usage_env.url_usage)
        assert sut_res_final.data["product_created"] == initial + 1

    def test_invoices_created(self, api_client, usage_env):
        # Arrange
        api_client.force_authenticate(user=usage_env.owner_a)
        sut_res_initial = api_client.get(usage_env.url_usage)
        initial = sut_res_initial.data["invoices_created"]

        invoice_data = {
            "customer": {"name": "New Customer Usage", "mobile_number": "9998887776"},
            "branch_id": usage_env.branch_a1.id,
            "payment_mode": "CASH",
            "invoice_items": [
                {
                    "product_id": usage_env.product_a1.id,
                    "quantity": 2,
                    "selling_price": 50.0,
                    "base_price": 45.0,
                }
            ],
        }

        # Act
        res_p = api_client.post(reverse("invoice-list"), invoice_data, format="json")
        assert res_p.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]

        # Assert
        sut_res_final = api_client.get(usage_env.url_usage)
        assert sut_res_final.data["invoices_created"] == initial + 1

    def test_staff_created(self, api_client, usage_env):
        # Arrange
        api_client.force_authenticate(user=usage_env.owner_a)
        sut_res_initial = api_client.get(usage_env.url_usage)
        initial = sut_res_initial.data["staff_created"]

        manager_data = {
            "user": {
                "username": "new_manager_usage_h_final",
                "password": "P@ssw0rd_2024_Test!",
                "mobile_number": "1112229992",
                "first_name": "M",
                "email": "manager_usage@example.com",
            },
            "employee_details": {"employee_id": "MGR201", "designation": "Manager"},
            "assigned_branches": [{"id": usage_env.branch_a1.id}],
        }
        employee_data = {
            "user": {
                "username": "new_employee_usage_h_final",
                "password": "P@ssw0rd_2024_Test!",
                "mobile_number": "1112228882",
                "first_name": "E",
                "email": "employee_usage@example.com",
            },
            "employee_details": {"employee_id": "EMP201", "designation": "Employee"},
            "assigned_branches": [{"id": usage_env.branch_a1.id}],
        }

        # Act
        res_m = api_client.post(reverse("business-manager"), manager_data, format="json")
        assert res_m.status_code == status.HTTP_201_CREATED

        res_e = api_client.post(reverse("business-employee"), employee_data, format="json")
        assert res_e.status_code == status.HTTP_201_CREATED

        # Assert
        sut_res_final = api_client.get(usage_env.url_usage)
        assert sut_res_final.data["staff_created"] == initial + 2

    def test_branches_created(self, api_client, usage_env):
        # Arrange
        api_client.force_authenticate(user=usage_env.owner_a)
        sut_res_initial = api_client.get(usage_env.url_usage)
        initial = sut_res_initial.data["branches_created"]

        # Act
        res_b = api_client.post(reverse("branch-list"), {"name": "New Branch Robust Final"}, format="json")
        assert res_b.status_code == status.HTTP_201_CREATED

        # Assert
        sut_res_final = api_client.get(usage_env.url_usage)
        assert sut_res_final.data["branches_created"] == initial + 1

    def test_entitlements(self, api_client, usage_env):
        # Arrange - 1. FULL ACCESS
        full_plan = usage_env.create_plan(
            name="Full Plan Robust Ent",
            price=0.0,
            has_chat=True,
            has_ai_agent=True,
            has_advanced_analytics=True,
        )
        api_client.force_authenticate(user=usage_env.owner_a)
        api_client.post(
            reverse("subscription_plan-plan-purchase"),
            {"plan_id": full_plan.id},
            format="json",
        )

        # Act & Assert - Full access
        assert api_client.get(reverse("analysis-product-details")).status_code == status.HTTP_200_OK
        assert api_client.get(reverse("customer-customer-leaderboard-revenue")).status_code == status.HTTP_200_OK
        assert api_client.get(reverse("report-report")).status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        assert api_client.get(reverse("messages-list")).status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert api_client.get(reverse("broadcast-list")).status_code == status.HTTP_200_OK
        assert api_client.get(reverse("conversation-list")).status_code == status.HTTP_200_OK
        assert api_client.get(reverse("ai-chat-session-list")).status_code == status.HTTP_200_OK

        # Arrange - 2. RESTRICTED ACCESS
        no_plan = usage_env.create_plan(
            name="No Feature Plan",
            price=0.0,
            has_chat=False,
            has_ai_agent=False,
            has_advanced_analytics=False,
        )
        Subscription.objects.all().delete()
        api_client.post(
            reverse("subscription_plan-plan-purchase"),
            {"plan_id": no_plan.id},
            format="json",
        )

        # Act & Assert - 403 Forbidden for restricted
        assert api_client.get(reverse("analysis-product-details")).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(reverse("customer-customer-leaderboard-revenue")).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(reverse("report-report")).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(reverse("messages-list")).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(reverse("broadcast-list")).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(reverse("conversation-list")).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(reverse("ai-chat-session-list")).status_code == status.HTTP_403_FORBIDDEN

    def test_create_limits_refusal(self, api_client, usage_env):
        # Arrange
        p_count = Product.objects.filter(business=usage_env.business_a).count()
        limit_plan = usage_env.create_plan(
            name="Limit Refusal Plan Robust Final",
            price=0.0,
            max_products=p_count,
            max_staff=10,
            max_invoices=0,
        )
        Subscription.objects.all().delete()
        api_client.force_authenticate(user=usage_env.owner_a)
        res_pur = api_client.post(
            reverse("subscription_plan-plan-purchase"),
            {"plan_id": limit_plan.id},
            format="json",
        )
        assert res_pur.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

        # Act & Assert - Products Refusal
        product_data = {
            "name": "Over Limit Product",
            "sku": "OL-888",
            "base_price": 10.0,
            "cost_price": 5.0,
            "input_gst_rate": 18.0,
            "output_gst_rate": 18.0,
        }
        res_p = api_client.post(reverse("product-list"), product_data, format="json")
        assert res_p.status_code == status.HTTP_403_FORBIDDEN
        assert "Limit reached" in res_p.data["message"]

        # Act & Assert - Invoices Refusal
        inv_data = {
            "customer": {"name": "Inv Limit Customer", "mobile_number": "1112223335"},
            "branch_id": usage_env.branch_a1.id,
            "payment_mode": "CASH",
            "invoice_items": [
                {
                    "product_id": usage_env.product_a1.id,
                    "quantity": 1,
                    "selling_price": 10.0,
                    "base_price": 9.0,
                }
            ],
        }
        res_inv = api_client.post(reverse("invoice-list"), inv_data, format="json")
        assert res_inv.status_code == status.HTTP_403_FORBIDDEN
        assert "limit reached" in res_inv.data["message"].lower()
