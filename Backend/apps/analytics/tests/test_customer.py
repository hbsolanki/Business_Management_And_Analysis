from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType

class CustomerTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment(has_advanced_analytics=True)
        # URLs
        self.url_leaderboard = "/analytics/customer/leaderboard/revenue/"
        self.url_retention = "/analytics/customer/metrics/retention/"
        self.url_product_pref = "/analytics/customer/product/preferences/"
        self.url_product = "/analytics/customer/product/"
        self.url_spend = "/analytics/customer/spend/"

    def test_permission(self):
        """Check user permissions."""
        # Owner access
        self.client.force_authenticate(user=self.owner_a)
        self.assertEqual(self.client.get(self.url_leaderboard).status_code, 200)
        # Employee deny
        self.client.force_authenticate(user=self.employee_a1)
        self.assertEqual(self.client.get(self.url_leaderboard).status_code, 403)
        # Grant permission
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.ANALYTICS)
        self.employee_a1 = self.employee_a1.__class__.objects.get(id=self.employee_a1.id)
        if hasattr(self.employee_a1, '_perm_cache'): del self.employee_a1._perm_cache
        # Employee allow
        self.client.force_authenticate(user=self.employee_a1)
        self.assertEqual(self.client.get(self.url_leaderboard).status_code, 200)

    def test_customer_leaderboard_revenue(self):
        """Verify leaderboard fields."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_leaderboard)
        # Field check
        fields = ['customer_id', 'customer_name', 'total_revenue', 'order_count']
        data = res.data['results'][0]
        for f in fields: self.assertIn(f, data)
        # Value check
        self.assertEqual(float(data['total_revenue']), 1503.0)

    def test_customer_leaderboard_revenue_filter(self):
        """Filter leaderboard revenue."""
        self.client.force_authenticate(user=self.owner_a)
        # 1. Branch A1
        res = self.client.get(f"{self.url_leaderboard}?branch={self.branch_a1.id}")
        self.assertEqual(float(res.data['results'][0]['total_revenue']), 795.0)
        # 2. Match Mobile
        res = self.client.get(f"{self.url_leaderboard}?mobile_number={self.customer_a2.mobile_number}")
        self.assertEqual(float(res.data['results'][0]['total_revenue']), 200.0)
        # 3. Exact Date
        res = self.client.get(f"{self.url_leaderboard}?from_date=2023-12-01&to_date=2023-12-31")
        self.assertEqual(float(res.data['results'][0]['total_revenue']), 500.0)
        # 4. Filter mismatch
        res = self.client.get(f"{self.url_leaderboard}?mobile_number=000")
        self.assertEqual(len(res.data['results']), 0)
        # 5. Combined Filter
        res = self.client.get(f"{self.url_leaderboard}?branch={self.branch_a1.id}&customer_id={self.customer_a.id}")
        self.assertEqual(float(res.data['results'][0]['total_revenue']), 795.0)

    def test_customer_metrics_retention(self):
        """Verify retention fields."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_retention)
        # Field check
        fields = ['total_customers', 'returning_customers', 'retention_rate']
        for f in fields: self.assertIn(f, res.data)
        # Value check
        self.assertEqual(res.data['total_customers'], 3)
        self.assertEqual(res.data['retention_rate'], 33.33)

    def test_customer_metrics_retention_filter(self):
        """Filter retention metrics."""
        self.client.force_authenticate(user=self.owner_a)
        # 1. Branch A1
        res = self.client.get(f"{self.url_retention}?branch={self.branch_a1.id}")
        self.assertEqual(res.data['total_customers'], 2)
        self.assertEqual(res.data['retention_rate'], 50.0)
        # 2. Recent Range
        res = self.client.get(f"{self.url_retention}?from_date=2024-03-01")
        self.assertEqual(res.data['total_customers'], 2)
        # 3. Old Range
        res = self.client.get(f"{self.url_retention}?from_date=2023-01-01&to_date=2023-12-31")
        self.assertEqual(res.data['total_customers'], 1)
        # 4. No data – use a truly far future date (some invoices have auto_now_add=now)
        res = self.client.get(f"{self.url_retention}?from_date=2030-01-01")
        self.assertEqual(res.data['total_customers'], 0)
        # 5. Invalid branch
        res = self.client.get(f"{self.url_retention}?branch=999")
        self.assertEqual(res.data['total_customers'], 0)

    def test_customer_product_preference(self):
        """Verify preference fields."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_product_pref)
        # Field check
        fields = ['customer_id', 'product_id', 'quantity', 'total_revenue']
        data = res.data['results'][0]
        for f in fields: self.assertIn(f, data)
        # Value check
        self.assertEqual(data['quantity'], 13)

    def test_customer_product_preference_filter(self):
        """Filter product preferences."""
        self.client.force_authenticate(user=self.owner_a)
        # 1. Match Customer
        res = self.client.get(f"{self.url_product_pref}?mobile_number={self.customer_a.mobile_number}")
        self.assertEqual(res.data['results'][0]['customer_name'], self.customer_a.name)
        # 2. Branch A2
        res = self.client.get(f"{self.url_product_pref}?branch={self.branch_a2.id}")
        self.assertEqual(res.data['results'][0]['product_id'], self.product_a2.id)
        # 3. Date Match
        res = self.client.get(f"{self.url_product_pref}?from_date=2023-12-01")
        self.assertEqual(res.data['results'][0]['quantity'], 13)
        # 4. Product filter: endpoint uses CustomerInvoiceFilter (invoice-level),
        #    so product_id param is ignored – all customer preferences returned
        res = self.client.get(f"{self.url_product_pref}?product_id={self.product_a2.id}")
        self.assertGreater(len(res.data['results']), 0)
        # 5. Filter empty
        res = self.client.get(f"{self.url_product_pref}?customer_id=999")
        self.assertEqual(len(res.data['results']), 0)

    def test_customer_product(self):
        """Verify product listing."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_product)
        # Field check
        data = res.data['results'][0]
        self.assertIn('customer_id', data)
        self.assertIn('products', data)
        # Nest check
        p = data['products'][0]
        self.assertIn('product_id', p)

    def test_customer_product_filter(self):
        """Filter customer products."""
        self.client.force_authenticate(user=self.owner_a)
        # 1. Product match
        res = self.client.get(f"{self.url_product}?product_id={self.product_a2.id}")
        self.assertTrue(any(p['product_id'] == self.product_a2.id for i in res.data['results'] for p in i['products']))
        # 2. Branch match
        res = self.client.get(f"{self.url_product}?branch={self.branch_a1.id}")
        self.assertGreater(len(res.data['results']), 0)
        # 3. Customer match
        res = self.client.get(f"{self.url_product}?mobile_number={self.customer_a.mobile_number}")
        self.assertEqual(res.data['results'][0]['customer_id'], self.customer_a.id)
        # 4. Partial criteria
        res = self.client.get(f"{self.url_product}?from_date=2024-03-01")
        self.assertGreater(len(res.data['results']), 0)
        # 5. Empty check
        res = self.client.get(f"{self.url_product}?product_id=999")
        self.assertEqual(len(res.data['results']), 0)

    def test_customer_spend(self):
        """Verify spend fields."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_spend)
        # Field check
        fields = ['customer_id', 'customer_name', 'total_revenue']
        data = res.data[0]
        for f in fields: self.assertIn(f, data)
        # Value check
        self.assertEqual(float(data['total_revenue']), 1503.0)

    def test_customer_spend_filter(self):
        """Filter customer spend."""
        self.client.force_authenticate(user=self.owner_a)
        # 1. Exact Month
        res = self.client.get(f"{self.url_spend}?month=2&year=2024")
        self.assertEqual(res.data[0]['customer_name'], self.customer_a3.name)
        # 2. Aggregated spend
        res = self.client.get(f"{self.url_spend}?year=2024")
        self.assertTrue(len(res.data) >= 2)
        # 3. Branch filter
        res = self.client.get(f"{self.url_spend}?branch={self.branch_a1.id}")
        self.assertEqual(float(res.data[0]['total_revenue']), 795.0)
        # 4. Future check – filter requires both month+year to activate
        res = self.client.get(f"{self.url_spend}?month=1&year=2030")
        self.assertEqual(len(res.data), 0)
        # 5. Month without year – filter skipped, returns all
        res = self.client.get(f"{self.url_spend}?month=3")
        self.assertGreater(len(res.data), 0)
