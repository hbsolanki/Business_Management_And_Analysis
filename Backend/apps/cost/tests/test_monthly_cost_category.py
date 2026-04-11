from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.cost.models import MonthlyCostCategory


class MonthlyCostCategoryTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('monthly-cost-category-list')
        
        self.monthly_cat_a, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=self.summary_global_a,
            cost_category=self.cost_category_a,
            defaults={"cost": 5000.00}
        )

    def test_monthly_cost_category_crud_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Create
        data = {
            "cost_category_items": [{"cost_category_id": self.cost_category_a.id, "cost": 1200.00}],
            "branch_id": self.branch_a1.id,
            "year": 2024,
            "month": 3
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 2. Read
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Summary response
        self.assertTrue(len(response.data) > 0)
        
        # 3. Update
        detail_url = reverse('monthly-cost-category-detail', args=[self.monthly_cat_a.id])
        response = self.client.patch(detail_url, {"cost": 5500.00})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(MonthlyCostCategory.objects.get(id=self.monthly_cat_a.id).cost, 5500.00)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_monthly_cost_category_crud_by_manager_assigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # 1. Create
        data = {
            "cost_category_items": [{"cost_category_id": self.cost_category_a.id, "cost": 100.00}],
            "branch_id": self.branch_a1.id,
            "year": 2024,
            "month": 3
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 2. Read
        response = self.client.get(self.list_url, {"branch": self.branch_a1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_monthly_cost_category_crud_by_manager_unassigned_branch(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Monthly CAT for Branch A2 (unassigned)
        monthly_category_2, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=self.summary_branch_a2,
            cost_category=self.cost_category_a,
            defaults={"cost": 200.0}
        )
        
        # 2. Read
        detail_url = reverse('monthly-cost-category-detail', args=[monthly_category_2.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_monthly_cost_category_crud_by_employee_assigned_branch(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # Monthly CAT for Branch A1 (assigned)
        monthly_category_1, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=self.summary_branch_a1,
            cost_category=self.cost_category_a,
            defaults={"cost": 300.0}
        )
        
        # 2. Read
        detail_url = reverse('monthly-cost-category-detail', args=[monthly_category_1.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_monthly_cost_category_crud_by_employee_unassigned_branch(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # Monthly CAT for Branch A2 (unassigned)
        monthly_category_2, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=self.summary_branch_a2,
            cost_category=self.cost_category_a,
            defaults={"cost": 400.0}
        )
        
        # 2. Read
        detail_url = reverse('monthly-cost-category-detail', args=[monthly_category_2.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_monthly_cost_category_crud_by_owner_other_business(self):
        self.client.force_authenticate(user=self.owner_b)
        
        detail_url = reverse('monthly-cost-category-detail', args=[self.monthly_cat_a.id])
        
        # 1. Create for Business A (should fail validation of business ownership)
        data = {
            "cost_category_items": [{"cost_category_id": self.cost_category_a.id, "cost": 1000.00}],
            "branch_id": self.branch_a1.id,
            "year": 2024,
            "month": 3
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Read
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Update
        response = self.client.patch(detail_url, {"cost": 9999.99})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_monthly_cost_category_crud_by_manager_other_business(self):
        self.client.force_authenticate(user=self.manager_b1)
        
        detail_url = reverse('monthly-cost-category-detail', args=[self.monthly_cat_a.id])
        
        # 1. Create
        data = {
            "cost_category_items": [{"cost_category_id": self.cost_category_a.id, "cost": 1000.00}],
            "branch_id": self.branch_a1.id,
            "year": 2024,
            "month": 3
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Read
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Update
        response = self.client.patch(detail_url, {"cost": 9999.99})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_monthly_cost_category_crud_by_employee_other_business(self):
        self.client.force_authenticate(user=self.employee_b1)
        
        detail_url = reverse('monthly-cost-category-detail', args=[self.monthly_cat_a.id])
        
        # 1. Create
        data = {
            "cost_category_items": [{"cost_category_id": self.cost_category_a.id, "cost": 1000.00}],
            "branch_id": self.branch_a1.id,
            "year": 2024,
            "month": 3
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Read
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 3. Update
        response = self.client.patch(detail_url, {"cost": 9999.99})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- FILTERING TESTS ---

    def test_monthly_cost_category_filtering_combinations(self):
        """Test category filtering."""
        # Use fresh business
        bus_f, plan_f, sub_f = self.setup_business_with_plan(business_name="Filter Business")
        owner_f = self.create_owner(username="owner_f", business=bus_f)
        branch_f = self.create_branch(business=bus_f, name="Filter Branch")
        self.client.force_authenticate(user=owner_f)
        
        from apps.cost.models import MonthlyFinancialSummary, CostCategory
        
        cc1 = CostCategory.objects.create(business=bus_f, name="Cat 1")
        cc2 = CostCategory.objects.create(business=bus_f, name="Cat 2")
        
        sum_25_12 = MonthlyFinancialSummary.objects.create(business=bus_f, branch=branch_f, year=2025, month=12)
        MonthlyCostCategory.objects.create(monthly_summary=sum_25_12, cost_category=cc1, cost=100.0)
        
        sum_25_11 = MonthlyFinancialSummary.objects.create(business=bus_f, branch=branch_f, year=2025, month=11)
        MonthlyCostCategory.objects.create(monthly_summary=sum_25_11, cost_category=cc2, cost=200.0)

        # 1. Month filter (raw list)
        response = self.client.get(f"{self.list_url}?month=12")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["cost_category"]["name"], "Cat 1")
        self.assertEqual(response.data[0]["month"], 12)
        

        # 2. Year filter (raw list)
        response = self.client.get(f"{self.list_url}?year=2025")
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["year"], 2025)
        self.assertEqual(response.data[1]["year"], 2025)

        # 3. Branch filter (paginated dict)
        response = self.client.get(f"{self.list_url}?branch={branch_f.id}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["branch"], branch_f.id)
        self.assertEqual(response.data["results"][1]["branch"], branch_f.id)

        # 4. Month + Year (raw list)
        response = self.client.get(f"{self.list_url}?month=12&year=2025")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["month"], 12)
        self.assertEqual(response.data[0]["year"], 2025)

        # 5. Month + Branch (paginated dict)
        response = self.client.get(f"{self.list_url}?month=12&branch={branch_f.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["month"], 12)
        self.assertEqual(response.data["results"][0]["branch"], branch_f.id)

        # 6. Year + Branch (paginated dict)
        response = self.client.get(f"{self.list_url}?year=2025&branch={branch_f.id}")
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["year"], 2025)
        self.assertEqual(response.data["results"][0]["branch"], branch_f.id)
        self.assertEqual(response.data["results"][1]["year"], 2025)
        self.assertEqual(response.data["results"][1]["branch"], branch_f.id)

        # 7. All filters (paginated dict)
        response = self.client.get(f"{self.list_url}?month=11&year=2025&branch={branch_f.id}")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["cost_category"]["name"], "Cat 2")
        self.assertEqual(response.data["results"][0]["month"], 11)
        self.assertEqual(response.data["results"][0]["year"], 2025)
        self.assertEqual(response.data["results"][0]["branch"], branch_f.id)

        # 8. Non-existent month
        response = self.client.get(f"{self.list_url}?month=1")
        self.assertEqual(len(response.data), 0)

        # 9. Non-existent year
        response = self.client.get(f"{self.list_url}?year=2022")
        self.assertEqual(len(response.data), 0)

        # 10. Non-existent branch
        response = self.client.get(f"{self.list_url}?branch=99999")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 0)

        # 11. Multi-category same month
        MonthlyCostCategory.objects.create(monthly_summary=sum_25_12, cost_category=cc2, cost=150.0)
        response = self.client.get(f"{self.list_url}?month=12&year=2025")
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["month"], 12)
        self.assertEqual(response.data[0]["year"], 2025)
        self.assertEqual(response.data[1]["month"], 12)
        self.assertEqual(response.data[1]["year"], 2025)

        # 12. Valid Month + Invalid Year
        response = self.client.get(f"{self.list_url}?month=12&year=1999")
        self.assertEqual(len(response.data), 0)

        # 13. Valid Year + Invalid Month
        response = self.client.get(f"{self.list_url}?year=2025&month=5")
        self.assertEqual(len(response.data), 0)

        # 14. Valid Branch + Invalid Year
        response = self.client.get(f"{self.list_url}?branch={branch_f.id}&year=1999")
        self.assertEqual(len(response.data["results"]), 0)

        # 15. Valid Month/Year + Invalid Branch
        response = self.client.get(f"{self.list_url}?month=12&year=2025&branch=99999")
        self.assertEqual(len(response.data["results"]), 0)

        # 16. Valid Branch + Invalid Month
        response = self.client.get(f"{self.list_url}?branch={branch_f.id}&month=5")
        self.assertEqual(len(response.data["results"]), 0)

    # --- PAGINATION ---

    def test_monthly_cost_category_pagination(self):
        """Test cost pagination."""
        self.client.force_authenticate(user=self.owner_a)
        
        # Seed 10 more records (total 3 initial + 1 from test + 10 = 14)
        from apps.cost.models import CostCategory, MonthlyCostCategory
        for i in range(10):
            cc = CostCategory.objects.create(business=self.business_a, name=f"Extra {i}")
            MonthlyCostCategory.objects.create(
                monthly_summary=self.summary_branch_a1,
                cost_category=cc,
                cost=100.0
            )
        
        # Passing branch=... ensures super().list() is called which uses pagination
        url = f"{self.list_url}?branch={self.branch_a1.id}"
        
        # 1. Page 1 (size 6)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])
        
        # 2. Page 2
        next_url = response.data["next"]
        response = self.client.get(next_url)
        self.assertEqual(len(response.data["results"]), 5) # 1 (initial) + 10 (extra) = 11 total for branch_a1
        self.assertIsNone(response.data["next"])