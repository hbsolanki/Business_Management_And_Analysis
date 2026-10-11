import pytest
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def customer_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment(has_advanced_analytics=True)
    return tc


def get_results(data):
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


@pytest.mark.django_db
class TestCustomerPytest:

    def test_permission(self, api_client, customer_env):
        """Check user permissions."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/leaderboard/revenue/"

        # Act
        sut_res_owner = sut_client.get(sut_url)

        # Assert
        assert sut_res_owner.status_code == 200

        # Arrange (Employee deny)
        sut_client.force_authenticate(user=customer_env.employee_a1)

        # Act
        sut_res_emp_deny = sut_client.get(sut_url)

        # Assert
        assert sut_res_emp_deny.status_code == 403

        # Arrange (Grant permission)
        customer_env.assign_work_to_user(customer_env.employee_a1, customer_env.branch_a1, WorkType.ANALYTICS)
        customer_env.employee_a1 = customer_env.employee_a1.__class__.objects.get(id=customer_env.employee_a1.id)
        if hasattr(customer_env.employee_a1, '_perm_cache'):
            del customer_env.employee_a1._perm_cache
        sut_client.force_authenticate(user=customer_env.employee_a1)

        # Act
        sut_res_emp_allow = sut_client.get(sut_url)

        # Assert
        assert sut_res_emp_allow.status_code == 200

    def test_customer_leaderboard_revenue(self, api_client, customer_env):
        """Verify leaderboard fields."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/leaderboard/revenue/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        fields = ['customer_id', 'customer_name', 'total_revenue', 'order_count']
        results = get_results(sut_res.data)
        data = results[0]
        for f in fields:
            assert f in data
        assert float(data['total_revenue']) == 1503.0

    def test_customer_leaderboard_revenue_filter(self, api_client, customer_env):
        """Filter leaderboard revenue."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/leaderboard/revenue/"

        # 1. Branch A1
        # Act
        res1 = sut_client.get(f"{sut_url}?branch={customer_env.branch_a1.id}")
        # Assert
        assert float(get_results(res1.data)[0]['total_revenue']) == 795.0

        # 2. Match Mobile
        # Act
        res2 = sut_client.get(f"{sut_url}?mobile_number={customer_env.customer_a2.mobile_number}")
        # Assert
        assert float(get_results(res2.data)[0]['total_revenue']) == 200.0

        # 3. Exact Date
        # Act
        res3 = sut_client.get(f"{sut_url}?from_date=2023-12-01&to_date=2023-12-31")
        # Assert
        assert float(get_results(res3.data)[0]['total_revenue']) == 500.0

        # 4. Filter mismatch
        # Act
        res4 = sut_client.get(f"{sut_url}?mobile_number=000")
        # Assert
        assert len(get_results(res4.data)) == 0

        # 5. Combined Filter
        # Act
        res5 = sut_client.get(f"{sut_url}?branch={customer_env.branch_a1.id}&customer_id={customer_env.customer_a.id}")
        # Assert
        assert float(get_results(res5.data)[0]['total_revenue']) == 795.0

    def test_customer_metrics_retention(self, api_client, customer_env):
        """Verify retention fields."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/metrics/retention/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        fields = ['total_customers', 'returning_customers', 'retention_rate']
        for f in fields:
            assert f in sut_res.data
        assert sut_res.data['total_customers'] == 3
        assert sut_res.data['retention_rate'] == 33.33

    def test_customer_metrics_retention_filter(self, api_client, customer_env):
        """Filter retention metrics."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/metrics/retention/"

        # 1. Branch A1
        # Act
        res1 = sut_client.get(f"{sut_url}?branch={customer_env.branch_a1.id}")
        # Assert
        assert res1.data['total_customers'] == 2
        assert res1.data['retention_rate'] == 50.0

        # 2. Recent Range
        # Act
        res2 = sut_client.get(f"{sut_url}?from_date=2024-03-01")
        # Assert
        assert res2.data['total_customers'] == 2

        # 3. Old Range
        # Act
        res3 = sut_client.get(f"{sut_url}?from_date=2023-01-01&to_date=2023-12-31")
        # Assert
        assert res3.data['total_customers'] == 1

        # 4. No data
        # Act
        res4 = sut_client.get(f"{sut_url}?from_date=2030-01-01")
        # Assert
        assert res4.data['total_customers'] == 0

        # 5. Invalid branch
        # Act
        res5 = sut_client.get(f"{sut_url}?branch=999")
        # Assert
        assert res5.data['total_customers'] == 0

    def test_customer_product_preference(self, api_client, customer_env):
        """Verify preference fields."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/product/preferences/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        fields = ['customer_id', 'product_id', 'quantity', 'total_revenue']
        results = get_results(sut_res.data)
        data = results[0]
        for f in fields:
            assert f in data
        assert data['quantity'] == 13

    def test_customer_product_preference_filter(self, api_client, customer_env):
        """Filter product preferences."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/product/preferences/"

        # 1. Match Customer
        # Act
        res1 = sut_client.get(f"{sut_url}?mobile_number={customer_env.customer_a.mobile_number}")
        # Assert
        assert get_results(res1.data)[0]['customer_name'] == customer_env.customer_a.name

        # 2. Branch A2
        # Act
        res2 = sut_client.get(f"{sut_url}?branch={customer_env.branch_a2.id}")
        # Assert
        assert get_results(res2.data)[0]['product_id'] == customer_env.product_a2.id

        # 3. Date Match
        # Act
        res3 = sut_client.get(f"{sut_url}?from_date=2023-12-01")
        # Assert
        assert get_results(res3.data)[0]['quantity'] == 13

        # 4. Product filter
        # Act
        res4 = sut_client.get(f"{sut_url}?product_id={customer_env.product_a2.id}")
        # Assert
        assert len(get_results(res4.data)) > 0

        # 5. Filter empty
        # Act
        res5 = sut_client.get(f"{sut_url}?customer_id=999")
        # Assert
        assert len(get_results(res5.data)) == 0

    def test_customer_product(self, api_client, customer_env):
        """Verify product listing."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/product/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        results = get_results(sut_res.data)
        data = results[0]
        assert 'customer_id' in data
        assert 'products' in data
        p = data['products'][0]
        assert 'product_id' in p

    def test_customer_product_filter(self, api_client, customer_env):
        """Filter customer products."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/product/"

        # 1. Product match
        # Act
        res1 = sut_client.get(f"{sut_url}?product_id={customer_env.product_a2.id}")
        # Assert
        assert any(p['product_id'] == customer_env.product_a2.id for i in get_results(res1.data) for p in i['products'])

        # 2. Branch match
        # Act
        res2 = sut_client.get(f"{sut_url}?branch={customer_env.branch_a1.id}")
        # Assert
        assert len(get_results(res2.data)) > 0

        # 3. Customer match
        # Act
        res3 = sut_client.get(f"{sut_url}?mobile_number={customer_env.customer_a.mobile_number}")
        # Assert
        assert get_results(res3.data)[0]['customer_id'] == customer_env.customer_a.id

        # 4. Partial criteria
        # Act
        res4 = sut_client.get(f"{sut_url}?from_date=2024-03-01")
        # Assert
        assert len(get_results(res4.data)) > 0

        # 5. Empty check
        # Act
        res5 = sut_client.get(f"{sut_url}?product_id=999")
        # Assert
        assert len(get_results(res5.data)) == 0

    def test_customer_spend(self, api_client, customer_env):
        """Verify spend fields."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/spend/"

        # Act
        sut_res = sut_client.get(sut_url)

        # Assert
        fields = ['customer_id', 'customer_name', 'total_revenue']
        results = get_results(sut_res.data)
        data = results[0]
        for f in fields:
            assert f in data
        assert float(data['total_revenue']) == 1503.0

    def test_customer_spend_filter(self, api_client, customer_env):
        """Filter customer spend."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=customer_env.owner_a)
        sut_url = "/analytics/customer/spend/"

        # 1. Exact Month
        # Act
        res1 = sut_client.get(f"{sut_url}?month=2&year=2024")
        # Assert
        assert get_results(res1.data)[0]['customer_name'] == customer_env.customer_a3.name

        # 2. Aggregated spend
        # Act
        res2 = sut_client.get(f"{sut_url}?year=2024")
        # Assert
        assert len(get_results(res2.data)) >= 2

        # 3. Branch filter
        # Act
        res3 = sut_client.get(f"{sut_url}?branch={customer_env.branch_a1.id}")
        # Assert
        assert float(get_results(res3.data)[0]['total_revenue']) == 795.0

        # 4. Future check
        # Act
        res4 = sut_client.get(f"{sut_url}?month=1&year=2030")
        # Assert
        assert len(get_results(res4.data)) == 0

        # 5. Month without year
        # Act
        res5 = sut_client.get(f"{sut_url}?month=3")
        # Assert
        assert len(get_results(res5.data)) > 0
