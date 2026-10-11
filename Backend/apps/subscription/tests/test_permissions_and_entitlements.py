from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.business.models import Business
from apps.employee.models import UserBusinessRole
from apps.product.models import Product
from apps.subscription.models import Plan, Subscription, Usage
from apps.subscription.permissions import (
    AdvancedAnalyticsFeaturePermission,
    AIAgentFeaturePermission,
    APIAccessFeaturePermission,
    ChatFeaturePermission,
    FeaturePermission,
    ResourceLimitPermission,
)
from apps.subscription.utils.entitlements import (
    can_use_feature,
    check_feature,
    check_monthly_quota,
    check_resource_limit,
    get_active_subscription,
    get_subscription_usage,
    increment_usage,
)
from apps.user.models import User


@pytest.fixture(autouse=True)
def clear_caches():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestFeaturePermissions:
    def test_feature_permission_no_feature_name(self):
        # Arrange
        perm = FeaturePermission()
        request = MagicMock()
        view = MagicMock()

        # Act
        sut_res = perm.has_permission(request, view)

        # Assert
        assert sut_res is True

    @patch("apps.subscription.permissions.can_use_feature")
    def test_feature_permission_debug_mode(self, mock_can_use, settings):
        # Arrange
        settings.DEBUG = True
        perm = ChatFeaturePermission()
        request = MagicMock()
        view = MagicMock()

        # Act
        sut_res = perm.has_permission(request, view)

        # Assert
        assert sut_res is True
        mock_can_use.assert_not_called()

    @patch("apps.subscription.permissions.can_use_feature")
    def test_feature_permission_denied_and_allowed(self, mock_can_use, settings):
        # Arrange
        settings.DEBUG = False
        perm = AdvancedAnalyticsFeaturePermission()
        request = MagicMock()
        request.user.business = MagicMock()
        view = MagicMock()

        # Act - Denied
        mock_can_use.return_value = (False, "Feature disabled on plan")
        sut_denied = perm.has_permission(request, view)

        # Assert - Denied
        assert sut_denied is False
        assert perm.message == "Feature disabled on plan"

        # Act - Allowed
        mock_can_use.return_value = (True, True)
        sut_allowed = perm.has_permission(request, view)

        # Assert - Allowed
        assert sut_allowed is True

    def test_subclassed_feature_names(self):
        # Arrange & Act & Assert
        assert AIAgentFeaturePermission().feature_name == "has_ai_agent"
        assert APIAccessFeaturePermission().feature_name == "has_api_access"
        assert ChatFeaturePermission().feature_name == "has_chat"


@pytest.mark.django_db
class TestResourceLimitPermission:
    def test_has_permission_post(self):
        # Arrange
        perm = ResourceLimitPermission()
        view = MagicMock()
        view.resource_limit_field = "max_products"
        view.queryset.model = Product

        request = MagicMock()
        request.method = "POST"
        request.user.business = MagicMock()

        with patch("apps.subscription.permissions.check_resource_limit") as mock_check:
            mock_check.return_value = True

            # Act
            sut_res = perm.has_permission(request, view)

            # Assert
            assert sut_res is True
            mock_check.assert_called_once_with(request.user.business, Product, "max_products")

    def test_has_permission_skips(self):
        # Arrange
        perm = ResourceLimitPermission()
        request = MagicMock()
        view = MagicMock()

        # 1. No limit field
        view.resource_limit_field = None
        assert perm.has_permission(request, view) is True

        # 2. GET request
        view.resource_limit_field = "max_products"
        request.method = "GET"
        assert perm.has_permission(request, view) is True

        # 3. No business
        request.method = "POST"
        request.user.business = None
        assert perm.has_permission(request, view) is True

        # 4. No queryset
        request.user.business = MagicMock()
        view.queryset = None
        assert perm.has_permission(request, view) is True

    def test_has_object_permission_reactivation(self):
        # Arrange
        perm = ResourceLimitPermission()
        view = MagicMock()
        view.resource_limit_field = "max_products"

        request = MagicMock()
        request.method = "PATCH"
        request.data = {"is_active": True}
        business = MagicMock()
        request.user.business = business

        inactive_obj = MagicMock(spec=Product)
        inactive_obj.__class__ = Product
        inactive_obj.is_active = False

        with patch("apps.subscription.permissions.check_resource_limit") as mock_check:
            mock_check.return_value = True

            # Act
            sut_res = perm.has_object_permission(request, view, inactive_obj)

            # Assert
            assert sut_res is True
            mock_check.assert_called_once_with(business, Product, "max_products")

    def test_has_object_permission_skips(self):
        # Arrange
        perm = ResourceLimitPermission()
        view = MagicMock()
        request = MagicMock()
        obj = MagicMock()

        # 1. No limit field
        view.resource_limit_field = None
        assert perm.has_object_permission(request, view, obj) is True

        # 2. Non-PATCH/PUT method
        view.resource_limit_field = "max_products"
        request.method = "GET"
        assert perm.has_object_permission(request, view, obj) is True

        # 3. is_active not True in payload
        request.method = "PATCH"
        request.data = {"name": "New Name"}
        assert perm.has_object_permission(request, view, obj) is True

        # 4. Obj already active (not a reactivation)
        request.data = {"is_active": True}
        obj.is_active = True
        assert perm.has_object_permission(request, view, obj) is True

        # 5. No business
        obj.is_active = False
        request.user.business = None
        assert perm.has_object_permission(request, view, obj) is True

    def test_permission_denied_raises(self):
        # Arrange
        perm = ResourceLimitPermission()
        view = MagicMock()
        view.resource_limit_field = "max_products"
        view.queryset.model = Product

        request = MagicMock()
        request.method = "POST"
        request.user.business = MagicMock()

        # Act & Assert - has_permission
        with patch("apps.subscription.permissions.check_resource_limit", side_effect=PermissionDenied("Limit reached")):
            with pytest.raises(PermissionDenied):
                perm.has_permission(request, view)

        # Act & Assert - has_object_permission
        request.method = "PATCH"
        request.data = {"is_active": True}
        obj = MagicMock()
        obj.is_active = False
        with patch("apps.subscription.permissions.check_resource_limit", side_effect=PermissionDenied("Limit reached")):
            with pytest.raises(PermissionDenied):
                perm.has_object_permission(request, view, obj)


@pytest.mark.django_db
class TestEntitlements:
    @pytest.fixture
    def subscription_setup(self):
        business = Business.objects.create(name="Entitlements Business")
        plan = Plan.objects.create(
            name="Pro Plan",
            price=199.0,
            has_chat=True,
            has_advanced_analytics=True,
            has_api_access=False,
            max_products=5,
        )
        now = timezone.now()
        sub = Subscription.objects.create(
            business=business,
            plan=plan,
            is_active=True,
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=25),
        )
        usage, _ = Usage.objects.get_or_create(subscription=sub)
        return business, plan, sub, usage

    def test_get_active_subscription_caching(self, subscription_setup):
        # Arrange
        business, _, sub, _ = subscription_setup

        # Act - first call (cache miss)
        sut_sub1 = get_active_subscription(business)

        # Assert
        assert sut_sub1.id == sub.id

        # Act - second call (cache hit)
        sut_sub2 = get_active_subscription(business)
        assert sut_sub2.id == sub.id

        # None business
        assert get_active_subscription(None) is None

    def test_get_subscription_usage(self, subscription_setup):
        # Arrange
        _, _, sub, usage = subscription_setup

        # Act
        sut_usage = get_subscription_usage(sub)

        # Assert
        assert sut_usage.id == usage.id
        assert get_subscription_usage(None) is None

    def test_check_feature(self, subscription_setup):
        # Arrange
        business, _, _, _ = subscription_setup

        # Act & Assert - Allowed
        assert check_feature(business, "has_chat") is True

        # Act & Assert - Denied
        with pytest.raises(PermissionDenied, match="This feature is not available"):
            check_feature(business, "has_api_access")

    def test_can_use_feature(self, subscription_setup):
        # Arrange
        business, _, sub, usage = subscription_setup

        # Act & Assert - No usage limit
        sut_chat_ok, _ = can_use_feature(business, "has_chat")
        assert sut_chat_ok is True

        sut_api_no, msg = can_use_feature(business, "has_api_access")
        assert sut_api_no is False
        assert "has_api_access not allowed" in msg

        # Act & Assert - With usage limit
        sut_prod_ok, _ = can_use_feature(business, "max_products", usage_field="product_created")
        assert sut_prod_ok is True

        # Exceed usage
        usage.product_created = 10
        usage.save()
        sut_prod_exceeded, msg_limit = can_use_feature(business, "max_products", usage_field="product_created")
        assert sut_prod_exceeded is False
        assert "limit reached" in msg_limit

    def test_check_resource_limit_non_user(self, subscription_setup):
        # Arrange
        business, plan, sub, _ = subscription_setup
        plan.max_products = 2
        plan.save()

        # Act & Assert - 0 products existing, limit is 2
        assert check_resource_limit(business, Product, "max_products") is True

        # Create 2 products
        Product.objects.create(business=business, name="P1", sku="P1-SKU", cost_price=10, base_price=15)
        Product.objects.create(business=business, name="P2", sku="P2-SKU", cost_price=20, base_price=25)

        # Act & Assert - Reached limit
        with pytest.raises(PermissionDenied, match="Limit reached"):
            check_resource_limit(business, Product, "max_products")

    def test_check_resource_limit_user(self, subscription_setup):
        # Arrange
        business, plan, sub, _ = subscription_setup
        plan.max_staff = 1
        plan.save()

        # Create employee user
        user = User.objects.create_user(email="staff@example.com", username="staff1")
        UserBusinessRole.objects.create(business=business, user=user, role="STAFF")

        # Act & Assert - Limit reached
        with pytest.raises(PermissionDenied, match="Limit reached"):
            check_resource_limit(business, User, "max_staff")

    def test_check_monthly_quota(self, subscription_setup):
        # Arrange
        business, plan, sub, usage = subscription_setup
        plan.max_invoices = 5
        plan.save()

        # Act & Assert - Within quota
        assert check_monthly_quota(business, "max_invoices", "invoices_created") is True

        # Exceed quota
        usage.invoices_created = 5
        usage.save()
        with pytest.raises(PermissionDenied, match="Monthly quota exceeded"):
            check_monthly_quota(business, "max_invoices", "invoices_created")

    def test_increment_usage(self, subscription_setup):
        # Arrange
        _, _, sub, usage = subscription_setup
        initial_count = usage.invoices_created

        # Act
        increment_usage(sub, "invoices_created")

        # Assert
        usage.refresh_from_db()
        assert usage.invoices_created == initial_count + 1

    def test_no_subscription_branches(self):
        # Arrange business with no subscription
        empty_business = Business.objects.create(name="No Sub Biz")

        # 1. get_active_subscription caches absence
        sut_none = get_active_subscription(empty_business)
        assert sut_none is None
        assert cache.get(f"subscription:business:{empty_business.id}:active_instance") is None

        # 2. check_feature raises PermissionDenied
        with pytest.raises(PermissionDenied, match="No active subscription"):
            check_feature(empty_business, "has_chat")

        # 3. can_use_feature returns False
        ok, msg = can_use_feature(empty_business, "has_chat")
        assert ok is False
        assert msg == "No active subscription"

        # 4. check_resource_limit with no subscription allows limit of 1
        assert check_resource_limit(empty_business, Product, "max_products") is True
        Product.objects.create(business=empty_business, name="P1", sku="P1-SKU", cost_price=10, base_price=20)
        with pytest.raises(PermissionDenied, match="Limit reached"):
            check_resource_limit(empty_business, Product, "max_products")

        # 5. check_monthly_quota raises PermissionDenied
        with pytest.raises(PermissionDenied, match="No active subscription"):
            check_monthly_quota(empty_business, "max_invoices", "invoices_created")

    def test_unlimited_limits(self, subscription_setup):
        # Arrange
        business, plan, sub, _ = subscription_setup
        plan.max_products = None
        plan.max_invoices = None
        plan.save()

        # Act & Assert
        ok, _ = can_use_feature(business, "max_products", usage_field="product_created")
        assert ok is True
        assert check_resource_limit(business, Product, "max_products") is True
        assert check_monthly_quota(business, "max_invoices", "invoices_created") is True

