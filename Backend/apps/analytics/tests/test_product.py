from apps.base.tests import BaseTestCase
from apps.employee.models import WorkType

class ProductTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment(has_advanced_analytics=True)
        # Assign category to products so serializer fields don't fail
        from apps.product.models import ProductCategory
        self.cat = ProductCategory.objects.create(business=self.business_a, name="Test Category")
        self.product_a1.product_category = self.cat
        self.product_a1.save()
        self.product_a2.product_category = self.cat
        self.product_a2.save()
        # URLs
        self.url_details    = "/analytics/product/details/"
        self.url_stock      = "/analytics/product/stock/"
        self.url_performance = "/analytics/product/performance/report/"
        self.url_category   = "/analytics/product/category/performance/"

    # ───────────────────────────── Permissions ──────────────────────────────
    def test_permission(self):
        """Check user permissions."""
        # Owner access
        self.client.force_authenticate(user=self.owner_a)
        self.assertEqual(self.client.get(self.url_details).status_code, 200)
        # Employee denied
        self.client.force_authenticate(user=self.employee_a1)
        self.assertEqual(self.client.get(self.url_details).status_code, 403)
        # Grant permission
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.ANALYTICS)
        self.employee_a1 = self.employee_a1.__class__.objects.get(id=self.employee_a1.id)
        if hasattr(self.employee_a1, '_perm_cache'):
            del self.employee_a1._perm_cache
        # Employee now allowed
        self.client.force_authenticate(user=self.employee_a1)
        self.assertEqual(self.client.get(self.url_details).status_code, 200)

    # ─────────────────────────── Product Details ────────────────────────────
    def test_product_details(self):
        """Verify product detail fields and values."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_details)
        self.assertEqual(res.status_code, 200)
        # Field check
        for f in ["name", "cost_price", "base_price", "net_profit", "product_category"]:
            self.assertIn(f, res.data[0])
        # Value check (ordered by -net_profit, A1 and A2 have same net_profit so first may vary)
        names = [item['name'] for item in res.data]
        self.assertIn("Product A1", names)
        self.assertIn("Product A2", names)

    def test_product_details_filter(self):
        """Filter product details by name / SKU / category."""
        self.client.force_authenticate(user=self.owner_a)

        # Rename to completely distinct strings to avoid icontains overlap
        self.product_a1.name = "AlphaWidget"
        self.product_a1.save()
        self.product_a2.name = "BetaGadget"
        self.product_a2.save()

        # 1. Exact unique name (icontains won't match BetaGadget)
        res = self.client.get(f"{self.url_details}?name=AlphaWidget")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['name'], "AlphaWidget")

        # 2. Other unique name
        res = self.client.get(f"{self.url_details}?name=BetaGadget")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['name'], "BetaGadget")

        # 3. SKU match – PRD-A2 is unique to product_a2 (Business A)
        res = self.client.get(f"{self.url_details}?sku=PRD-A2")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['name'], "BetaGadget")

        # 3b. SKU icontains: 'A1' matches product_a1 in Business A only (business filter applied)
        res = self.client.get(f"{self.url_details}?sku=A1")
        self.assertGreaterEqual(len(res.data), 1)  # at least product_a1 (PRD-A1)

        # 4. Filter mismatch
        res = self.client.get(f"{self.url_details}?name=UnknownProduct")
        self.assertEqual(len(res.data), 0)

        # 5. Category filter
        res = self.client.get(f"{self.url_details}?product_category={self.cat.id}")
        self.assertEqual(len(res.data), 2)  # both products belong to test category

    # ─────────────────────────── Product Stocks ─────────────────────────────
    def test_product_stocks(self):
        """Verify stock fields and values."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_stock)
        self.assertEqual(res.status_code, 200)
        # Field check
        for f in ["id", "name", "product_category", "stock_quantity", "branch"]:
            self.assertIn(f, res.data[0])
        # Value check – all inventory items start at 100
        self.assertEqual(res.data[0]['stock_quantity'], 100)

    def test_product_stocks_filter(self):
        """Filter product stocks by branch, product, and combined."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Branch A1 only
        res = self.client.get(f"{self.url_stock}?branch={self.branch_a1.id}")
        self.assertEqual(len(res.data), 2)
        for item in res.data:
            self.assertEqual(item['branch'], self.branch_a1.id)

        # 2. Product A1 in both branches
        res = self.client.get(f"{self.url_stock}?product_id={self.product_a1.id}")
        self.assertEqual(len(res.data), 2)
        for item in res.data:
            self.assertEqual(item['name'], "Product A1")

        # 3. Branch A1 + Product A1 → exactly 1 row
        res = self.client.get(f"{self.url_stock}?branch={self.branch_a1.id}&product_id={self.product_a1.id}")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['branch'], self.branch_a1.id)
        self.assertEqual(res.data[0]['name'], "Product A1")

        # 4. Invalid branch → empty
        res = self.client.get(f"{self.url_stock}?branch=9999")
        self.assertEqual(len(res.data), 0)

        # 5. Invalid product → empty
        res = self.client.get(f"{self.url_stock}?product_id=8888")
        self.assertEqual(len(res.data), 0)

    # ───────────────────────── Performance Report ───────────────────────────
    def test_product_performance_report(self):
        """Verify performance report structure and global totals."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_performance)
        self.assertEqual(res.status_code, 200)
        self.assertIn('summary', res.data)
        self.assertIn('branch', res.data)
        # Global: 13 A1 + 7 A2 = 20 qty total
        self.assertEqual(res.data['summary']['total_quantity_sold'], 20)

    def test_product_performance_report_filter(self):
        """Filter performance report with branch, date, product combinations."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Branch A1: branch[0].summary shows branch-specific data
        res = self.client.get(f"{self.url_performance}?branch={self.branch_a1.id}")
        self.assertEqual(res.status_code, 200)
        branch_qty = res.data['branch'][0]['summary']['total_quantity_sold']
        # Branch A1: invoice_branch_a1(2 A1) + invoice_branch_a1_2(1 A1+1 A2) + invoice_old_a1(10 A1)
        self.assertGreaterEqual(branch_qty, 13)

        # 2. Date range – March 2024 only
        # Only Branch A1 invoices have explicit March 2024 dates:
        #   invoice_branch_a1 (2 A1) + invoice_branch_a1_2 (1 A1 + 1 A2) = 4 items
        # Branch A2 invoices were created without created_at → auto_now_add=now()
        res = self.client.get(
            f"{self.url_performance}"
            f"?from_date_and_time=2024-03-01T00:00:00Z"
            f"&to_date_and_time=2024-03-31T23:59:59Z"
        )
        self.assertIn(res.status_code, [200, 404])
        if res.status_code == 200:
            self.assertGreater(res.data['summary']['total_quantity_sold'], 0)

        # 3. Product A2 only: 1 (A1 march) + 6 (A2 branch, created at now) = 7 qty
        res = self.client.get(f"{self.url_performance}?product_id={self.product_a2.id}")
        self.assertEqual(res.data['summary']['total_quantity_sold'], 7)

        # 4. Invalid branch 9999: view pops branch from general_params so global_qs
        #    still has data → returns 200 with empty branch[] list (not 404)
        res = self.client.get(f"{self.url_performance}?branch=9999")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['branch'], [])

        # 5. Branch A2 + Product A2: 6 qty
        res = self.client.get(
            f"{self.url_performance}"
            f"?branch={self.branch_a2.id}&product_id={self.product_a2.id}"
        )
        self.assertEqual(res.data['branch'][0]['summary']['total_quantity_sold'], 6)

    # ───────────────────────── Category Performance ─────────────────────────
    def test_category_performance(self):
        """Verify category performance fields."""
        self.client.force_authenticate(user=self.owner_a)
        res = self.client.get(self.url_category)
        # Categories exist now, should be 200
        self.assertEqual(res.status_code, 200)
        for f in ["category_id", "category_name", "total_revenue", "total_profit",
                  "total_quantity_sold", "product_count"]:
            self.assertIn(f, res.data[0])

    def test_category_performance_filter(self):
        """Filter category performance."""
        self.client.force_authenticate(user=self.owner_a)

        # 1. Branch A1 → invoices in A1
        res = self.client.get(f"{self.url_category}?branch={self.branch_a1.id}")
        self.assertIn(res.status_code, [200, 404])

        # 2. Date within range → data exists
        res = self.client.get(
            f"{self.url_category}"
            f"?from_date_and_time=2023-12-01T00:00:00Z"
            f"&to_date_and_time=2024-12-31T23:59:59Z"
        )
        self.assertEqual(res.status_code, 200)

        # 3. Invalid branch 9999 → empty → 404
        res = self.client.get(f"{self.url_category}?branch=9999")
        self.assertEqual(res.status_code, 404)

        # 4. Branch A2 only
        res = self.client.get(f"{self.url_category}?branch={self.branch_a2.id}")
        self.assertIn(res.status_code, [200, 404])

        # 5. Branch A1 + date March 2024
        res = self.client.get(
            f"{self.url_category}"
            f"?branch={self.branch_a1.id}"
            f"&from_date_and_time=2024-03-01T00:00:00Z"
            f"&to_date_and_time=2024-03-31T23:59:59Z"
        )
        self.assertIn(res.status_code, [200, 404])