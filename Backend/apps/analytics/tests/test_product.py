import pytest
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType
from apps.product.models import ProductCategory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def product_analytics_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment(has_advanced_analytics=True)
    tc.cat = ProductCategory.objects.create(business=tc.business_a, name="Test Category")
    tc.product_a1.product_category = tc.cat
    tc.product_a1.save()
    tc.product_a2.product_category = tc.cat
    tc.product_a2.save()
    return tc


@pytest.mark.django_db
class TestProductAnalyticsPytest:

    # ───────────────────────────── Permissions ──────────────────────────────
    def test_permission(self, api_client, product_analytics_env):
        """Check user permissions."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/details/"

        # Act & Assert (Owner access)
        assert sut_client.get(sut_url).status_code == 200

        # Arrange (Employee denied)
        sut_client.force_authenticate(user=product_analytics_env.employee_a1)

        # Act & Assert
        assert sut_client.get(sut_url).status_code == 403

        # Arrange (Grant permission)
        product_analytics_env.assign_work_to_user(product_analytics_env.employee_a1, product_analytics_env.branch_a1, WorkType.ANALYTICS)
        product_analytics_env.employee_a1 = product_analytics_env.employee_a1.__class__.objects.get(id=product_analytics_env.employee_a1.id)
        if hasattr(product_analytics_env.employee_a1, '_perm_cache'):
            del product_analytics_env.employee_a1._perm_cache
        sut_client.force_authenticate(user=product_analytics_env.employee_a1)

        # Act & Assert
        assert sut_client.get(sut_url).status_code == 200

    # ─────────────────────────── Product Details ────────────────────────────
    def test_product_details(self, api_client, product_analytics_env):
        """Verify product detail fields and values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/details/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        assert sut_res.status_code == 200
        for f in ["name", "cost_price", "base_price", "net_profit", "product_category"]:
            assert f in sut_res.data[0]
        names = [item['name'] for item in sut_res.data]
        assert "Product A1" in names
        assert "Product A2" in names

    def test_product_details_filter(self, api_client, product_analytics_env):
        """Filter product details by name / SKU / category."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/details/"

        product_analytics_env.product_a1.name = "AlphaWidget"
        product_analytics_env.product_a1.save()
        product_analytics_env.product_a2.name = "BetaGadget"
        product_analytics_env.product_a2.save()

        # 1. Exact unique name
        # Act
        res1 = sut_client.get(f"{sut_url}?name=AlphaWidget")
        # Assert
        assert len(res1.data) == 1
        assert res1.data[0]['name'] == "AlphaWidget"

        # 2. Other unique name
        # Act
        res2 = sut_client.get(f"{sut_url}?name=BetaGadget")
        # Assert
        assert len(res2.data) == 1
        assert res2.data[0]['name'] == "BetaGadget"

        # 3. SKU match
        # Act
        res3 = sut_client.get(f"{sut_url}?sku=PRD-A2")
        # Assert
        assert len(res3.data) == 1
        assert res3.data[0]['name'] == "BetaGadget"

        # 3b. SKU icontains
        # Act
        res3b = sut_client.get(f"{sut_url}?sku=A1")
        # Assert
        assert len(res3b.data) >= 1

        # 4. Filter mismatch
        # Act
        res4 = sut_client.get(f"{sut_url}?name=UnknownProduct")
        # Assert
        assert len(res4.data) == 0

        # 5. Category filter
        # Act
        res5 = sut_client.get(f"{sut_url}?product_category={product_analytics_env.cat.id}")
        # Assert
        assert len(res5.data) == 2

    # ─────────────────────────── Product Stocks ─────────────────────────────
    def test_product_stocks(self, api_client, product_analytics_env):
        """Verify stock fields and values."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/stock/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        assert sut_res.status_code == 200
        for f in ["id", "name", "product_category", "stock_quantity", "branch"]:
            assert f in sut_res.data[0]
        assert sut_res.data[0]['stock_quantity'] == 100

    def test_product_stocks_filter(self, api_client, product_analytics_env):
        """Filter product stocks by branch, product, and combined."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/stock/"

        # 1. Branch A1 only
        # Act
        res1 = sut_client.get(f"{sut_url}?branch={product_analytics_env.branch_a1.id}")
        # Assert
        assert len(res1.data) == 2
        for item in res1.data:
            assert item['branch'] == product_analytics_env.branch_a1.id

        # 2. Product A1 in both branches
        # Act
        res2 = sut_client.get(f"{sut_url}?product_id={product_analytics_env.product_a1.id}")
        # Assert
        assert len(res2.data) == 2
        for item in res2.data:
            assert item['name'] == "Product A1"

        # 3. Branch A1 + Product A1
        # Act
        res3 = sut_client.get(f"{sut_url}?branch={product_analytics_env.branch_a1.id}&product_id={product_analytics_env.product_a1.id}")
        # Assert
        assert len(res3.data) == 1
        assert res3.data[0]['branch'] == product_analytics_env.branch_a1.id
        assert res3.data[0]['name'] == "Product A1"

        # 4. Invalid branch
        # Act
        res4 = sut_client.get(f"{sut_url}?branch=9999")
        # Assert
        assert len(res4.data) == 0

        # 5. Invalid product
        # Act
        res5 = sut_client.get(f"{sut_url}?product_id=8888")
        # Assert
        assert len(res5.data) == 0

    # ───────────────────────── Performance Report ───────────────────────────
    def test_product_performance_report(self, api_client, product_analytics_env):
        """Verify performance report structure and global totals."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/performance/report/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        assert sut_res.status_code == 200
        assert 'summary' in sut_res.data
        assert 'branch' in sut_res.data
        assert sut_res.data['summary']['total_quantity_sold'] == 20

    def test_product_performance_report_filter(self, api_client, product_analytics_env):
        """Filter performance report with branch, date, product combinations."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/performance/report/"

        # 1. Branch A1
        # Act
        res1 = sut_client.get(f"{sut_url}?branch={product_analytics_env.branch_a1.id}")
        # Assert
        assert res1.status_code == 200
        branch_qty = res1.data['branch'][0]['summary']['total_quantity_sold']
        assert branch_qty >= 13

        # 2. Date range
        # Act
        res2 = sut_client.get(
            f"{sut_url}?from_date_and_time=2024-03-01T00:00:00Z&to_date_and_time=2024-03-31T23:59:59Z"
        )
        # Assert
        assert res2.status_code in [200, 404]
        if res2.status_code == 200:
            assert res2.data['summary']['total_quantity_sold'] > 0

        # 3. Product A2 only
        # Act
        res3 = sut_client.get(f"{sut_url}?product_id={product_analytics_env.product_a2.id}")
        # Assert
        assert res3.data['summary']['total_quantity_sold'] == 7

        # 4. Invalid branch
        # Act
        res4 = sut_client.get(f"{sut_url}?branch=9999")
        # Assert
        assert res4.status_code == 200
        assert res4.data['branch'] == []

        # 5. Branch A2 + Product A2
        # Act
        res5 = sut_client.get(f"{sut_url}?branch={product_analytics_env.branch_a2.id}&product_id={product_analytics_env.product_a2.id}")
        # Assert
        assert res5.data['branch'][0]['summary']['total_quantity_sold'] == 6

    # ───────────────────────── Category Performance ─────────────────────────
    def test_category_performance(self, api_client, product_analytics_env):
        """Verify category performance fields."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/category/performance/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        assert sut_res.status_code == 200
        for f in ["category_id", "category_name", "total_revenue", "total_profit", "total_quantity_sold", "product_count"]:
            assert f in sut_res.data[0]

    def test_category_performance_filter(self, api_client, product_analytics_env):
        """Filter category performance."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=product_analytics_env.owner_a)
        sut_url = "/analytics/product/category/performance/"

        # 1. Branch A1
        # Act
        res1 = sut_client.get(f"{sut_url}?branch={product_analytics_env.branch_a1.id}")
        # Assert
        assert res1.status_code in [200, 404]

        # 2. Date within range
        # Act
        res2 = sut_client.get(
            f"{sut_url}?from_date_and_time=2023-12-01T00:00:00Z&to_date_and_time=2024-12-31T23:59:59Z"
        )
        # Assert
        assert res2.status_code == 200

        # 3. Invalid branch
        # Act
        res3 = sut_client.get(f"{sut_url}?branch=9999")
        # Assert
        assert res3.status_code == 404

        # 4. Branch A2 only
        # Act
        res4 = sut_client.get(f"{sut_url}?branch={product_analytics_env.branch_a2.id}")
        # Assert
        assert res4.status_code in [200, 404]

        # 5. Branch A1 + date
        # Act
        res5 = sut_client.get(
            f"{sut_url}?branch={product_analytics_env.branch_a1.id}&from_date_and_time=2024-03-01T00:00:00Z&to_date_and_time=2024-03-31T23:59:59Z"
        )
        # Assert
        assert res5.status_code in [200, 404]