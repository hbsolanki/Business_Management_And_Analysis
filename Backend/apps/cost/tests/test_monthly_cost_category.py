import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.cost.models import MonthlyCostCategory, MonthlyFinancialSummary, CostCategory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.list_url = reverse('monthly-cost-category-list')
    tc.monthly_cat_a, _ = MonthlyCostCategory.objects.update_or_create(
        monthly_summary=tc.summary_global_a,
        cost_category=tc.cost_category_a,
        defaults={"cost": 5000.00}
    )
    return tc


@pytest.mark.django_db
class TestMonthlyCostCategory:

    def test_monthly_cost_category_crud_by_owner(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        sut_list_url = env.list_url
        create_payload = {
            "cost_category_items": [{"cost_category_id": env.cost_category_a.id, "cost": 1200.00}],
            "branch_id": env.branch_a1.id,
            "year": 2024,
            "month": 3
        }

        # Act - 1. Create
        sut_create_res = api_client.post(sut_list_url, create_payload, format='json')

        # Assert - 1. Create
        assert sut_create_res.status_code == status.HTTP_201_CREATED

        # Act - 2. Read
        sut_get_res = api_client.get(sut_list_url)

        # Assert - 2. Read
        assert sut_get_res.status_code == status.HTTP_200_OK
        assert len(sut_get_res.data) > 0

        # Arrange - 3. Update
        sut_detail_url = reverse('monthly-cost-category-detail', args=[env.monthly_cat_a.id])
        update_payload = {"cost": 5500.00}

        # Act - 3. Update
        sut_patch_res = api_client.patch(sut_detail_url, update_payload)

        # Assert - 3. Update
        assert sut_patch_res.status_code == status.HTTP_200_OK
        assert MonthlyCostCategory.objects.get(id=env.monthly_cat_a.id).cost == 5500.00

        # Act - 4. Delete
        sut_delete_res = api_client.delete(sut_detail_url)

        # Assert - 4. Delete
        assert sut_delete_res.status_code == status.HTTP_204_NO_CONTENT

    def test_monthly_cost_category_crud_by_manager_assigned_branch(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.manager_a1)
        sut_list_url = env.list_url
        create_payload = {
            "cost_category_items": [{"cost_category_id": env.cost_category_a.id, "cost": 100.00}],
            "branch_id": env.branch_a1.id,
            "year": 2024,
            "month": 3
        }

        # Act - 1. Create
        sut_create_res = api_client.post(sut_list_url, create_payload, format='json')

        # Assert - 1. Create
        assert sut_create_res.status_code == status.HTTP_201_CREATED

        # Act - 2. Read
        sut_get_res = api_client.get(sut_list_url, {"branch": env.branch_a1.id})

        # Assert - 2. Read
        assert sut_get_res.status_code == status.HTTP_200_OK

    def test_monthly_cost_category_crud_by_manager_unassigned_branch(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.manager_a1)
        monthly_category_2, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=env.summary_branch_a2,
            cost_category=env.cost_category_a,
            defaults={"cost": 200.0}
        )
        sut_detail_url = reverse('monthly-cost-category-detail', args=[monthly_category_2.id])

        # Act
        sut_get_res = api_client.get(sut_detail_url)

        # Assert
        assert sut_get_res.status_code == status.HTTP_404_NOT_FOUND

    def test_monthly_cost_category_crud_by_employee_assigned_branch(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.employee_a1)
        monthly_category_1, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=env.summary_branch_a1,
            cost_category=env.cost_category_a,
            defaults={"cost": 300.0}
        )
        sut_detail_url = reverse('monthly-cost-category-detail', args=[monthly_category_1.id])

        # Act
        sut_get_res = api_client.get(sut_detail_url)

        # Assert
        assert sut_get_res.status_code == status.HTTP_403_FORBIDDEN

    def test_monthly_cost_category_crud_by_employee_unassigned_branch(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.employee_a1)
        monthly_category_2, _ = MonthlyCostCategory.objects.update_or_create(
            monthly_summary=env.summary_branch_a2,
            cost_category=env.cost_category_a,
            defaults={"cost": 400.0}
        )
        sut_detail_url = reverse('monthly-cost-category-detail', args=[monthly_category_2.id])

        # Act
        sut_get_res = api_client.get(sut_detail_url)

        # Assert
        assert sut_get_res.status_code == status.HTTP_403_FORBIDDEN

    def test_monthly_cost_category_crud_by_owner_other_business(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_b)
        sut_list_url = env.list_url
        sut_detail_url = reverse('monthly-cost-category-detail', args=[env.monthly_cat_a.id])
        create_payload = {
            "cost_category_items": [{"cost_category_id": env.cost_category_a.id, "cost": 1000.00}],
            "branch_id": env.branch_a1.id,
            "year": 2024,
            "month": 3
        }

        # Act & Assert - 1. Create for Business A (fails validation of business ownership)
        sut_post_res = api_client.post(sut_list_url, create_payload, format='json')
        assert sut_post_res.status_code == status.HTTP_400_BAD_REQUEST

        # Act & Assert - 2. Read
        sut_get_res = api_client.get(sut_detail_url)
        assert sut_get_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 3. Update
        sut_patch_res = api_client.patch(sut_detail_url, {"cost": 9999.99})
        assert sut_patch_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 4. Delete
        sut_del_res = api_client.delete(sut_detail_url)
        assert sut_del_res.status_code == status.HTTP_404_NOT_FOUND

    def test_monthly_cost_category_crud_by_manager_other_business(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.manager_b1)
        sut_list_url = env.list_url
        sut_detail_url = reverse('monthly-cost-category-detail', args=[env.monthly_cat_a.id])
        create_payload = {
            "cost_category_items": [{"cost_category_id": env.cost_category_a.id, "cost": 1000.00}],
            "branch_id": env.branch_a1.id,
            "year": 2024,
            "month": 3
        }

        # Act & Assert - 1. Create
        sut_post_res = api_client.post(sut_list_url, create_payload, format='json')
        assert sut_post_res.status_code == status.HTTP_400_BAD_REQUEST

        # Act & Assert - 2. Read
        sut_get_res = api_client.get(sut_detail_url)
        assert sut_get_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 3. Update
        sut_patch_res = api_client.patch(sut_detail_url, {"cost": 9999.99})
        assert sut_patch_res.status_code == status.HTTP_404_NOT_FOUND

        # Act & Assert - 4. Delete
        sut_del_res = api_client.delete(sut_detail_url)
        assert sut_del_res.status_code == status.HTTP_404_NOT_FOUND

    def test_monthly_cost_category_crud_by_employee_other_business(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.employee_b1)
        sut_list_url = env.list_url
        sut_detail_url = reverse('monthly-cost-category-detail', args=[env.monthly_cat_a.id])
        create_payload = {
            "cost_category_items": [{"cost_category_id": env.cost_category_a.id, "cost": 1000.00}],
            "branch_id": env.branch_a1.id,
            "year": 2024,
            "month": 3
        }

        # Act & Assert - 1. Create
        sut_post_res = api_client.post(sut_list_url, create_payload, format='json')
        assert sut_post_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 2. Read
        sut_get_res = api_client.get(sut_detail_url)
        assert sut_get_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 3. Update
        sut_patch_res = api_client.patch(sut_detail_url, {"cost": 9999.99})
        assert sut_patch_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - 4. Delete
        sut_del_res = api_client.delete(sut_detail_url)
        assert sut_del_res.status_code == status.HTTP_403_FORBIDDEN

    def test_monthly_cost_category_filtering_combinations(self, api_client, env):
        # Arrange
        bus_f, plan_f, sub_f = env.setup_business_with_plan(business_name="Filter Business")
        owner_f = env.create_owner(username="owner_f", business=bus_f)
        branch_f = env.create_branch(business=bus_f, name="Filter Branch")
        api_client.force_authenticate(user=owner_f)
        sut_list_url = env.list_url

        cc1 = CostCategory.objects.create(business=bus_f, name="Cat 1")
        cc2 = CostCategory.objects.create(business=bus_f, name="Cat 2")

        sum_25_12 = MonthlyFinancialSummary.objects.create(business=bus_f, branch=branch_f, year=2025, month=12)
        MonthlyCostCategory.objects.create(monthly_summary=sum_25_12, cost_category=cc1, cost=100.0)

        sum_25_11 = MonthlyFinancialSummary.objects.create(business=bus_f, branch=branch_f, year=2025, month=11)
        MonthlyCostCategory.objects.create(monthly_summary=sum_25_11, cost_category=cc2, cost=200.0)

        # Act & Assert - 1. Month filter (raw list)
        sut_res1 = api_client.get(f"{sut_list_url}?month=12")
        assert len(sut_res1.data) == 1
        assert sut_res1.data[0]["cost_category"]["name"] == "Cat 1"
        assert sut_res1.data[0]["month"] == 12

        # Act & Assert - 2. Year filter (raw list)
        sut_res2 = api_client.get(f"{sut_list_url}?year=2025")
        assert len(sut_res2.data) == 2
        assert sut_res2.data[0]["year"] == 2025
        assert sut_res2.data[1]["year"] == 2025

        # Act & Assert - 3. Branch filter (paginated dict)
        sut_res3 = api_client.get(f"{sut_list_url}?branch={branch_f.id}")
        assert len(sut_res3.data["results"]) == 2
        assert sut_res3.data["results"][0]["branch"] == branch_f.id
        assert sut_res3.data["results"][1]["branch"] == branch_f.id

        # Act & Assert - 4. Month + Year (raw list)
        sut_res4 = api_client.get(f"{sut_list_url}?month=12&year=2025")
        assert len(sut_res4.data) == 1
        assert sut_res4.data[0]["month"] == 12
        assert sut_res4.data[0]["year"] == 2025

        # Act & Assert - 5. Month + Branch (paginated dict)
        sut_res5 = api_client.get(f"{sut_list_url}?month=12&branch={branch_f.id}")
        assert len(sut_res5.data["results"]) == 1
        assert sut_res5.data["results"][0]["month"] == 12
        assert sut_res5.data["results"][0]["branch"] == branch_f.id

        # Act & Assert - 6. Year + Branch (paginated dict)
        sut_res6 = api_client.get(f"{sut_list_url}?year=2025&branch={branch_f.id}")
        assert len(sut_res6.data["results"]) == 2
        assert sut_res6.data["results"][0]["year"] == 2025
        assert sut_res6.data["results"][0]["branch"] == branch_f.id
        assert sut_res6.data["results"][1]["year"] == 2025
        assert sut_res6.data["results"][1]["branch"] == branch_f.id

        # Act & Assert - 7. All filters (paginated dict)
        sut_res7 = api_client.get(f"{sut_list_url}?month=11&year=2025&branch={branch_f.id}")
        assert len(sut_res7.data["results"]) == 1
        assert sut_res7.data["results"][0]["cost_category"]["name"] == "Cat 2"
        assert sut_res7.data["results"][0]["month"] == 11
        assert sut_res7.data["results"][0]["year"] == 2025
        assert sut_res7.data["results"][0]["branch"] == branch_f.id

        # Act & Assert - 8. Non-existent month
        sut_res8 = api_client.get(f"{sut_list_url}?month=1")
        assert len(sut_res8.data) == 0

        # Act & Assert - 9. Non-existent year
        sut_res9 = api_client.get(f"{sut_list_url}?year=2022")
        assert len(sut_res9.data) == 0

        # Act & Assert - 10. Non-existent branch
        sut_res10 = api_client.get(f"{sut_list_url}?branch=99999")
        assert sut_res10.status_code == 200
        assert len(sut_res10.data["results"]) == 0

        # Arrange - 11. Multi-category same month
        MonthlyCostCategory.objects.create(monthly_summary=sum_25_12, cost_category=cc2, cost=150.0)

        # Act & Assert - 11. Multi-category same month
        sut_res11 = api_client.get(f"{sut_list_url}?month=12&year=2025")
        assert len(sut_res11.data) == 2
        assert sut_res11.data[0]["month"] == 12
        assert sut_res11.data[0]["year"] == 2025
        assert sut_res11.data[1]["month"] == 12
        assert sut_res11.data[1]["year"] == 2025

        # Act & Assert - 12. Valid Month + Invalid Year
        sut_res12 = api_client.get(f"{sut_list_url}?month=12&year=1999")
        assert len(sut_res12.data) == 0

        # Act & Assert - 13. Valid Year + Invalid Month
        sut_res13 = api_client.get(f"{sut_list_url}?year=2025&month=5")
        assert len(sut_res13.data) == 0

        # Act & Assert - 14. Valid Branch + Invalid Year
        sut_res14 = api_client.get(f"{sut_list_url}?branch={branch_f.id}&year=1999")
        assert len(sut_res14.data["results"]) == 0

        # Act & Assert - 15. Valid Month/Year + Invalid Branch
        sut_res15 = api_client.get(f"{sut_list_url}?month=12&year=2025&branch=99999")
        assert len(sut_res15.data["results"]) == 0

        # Act & Assert - 16. Valid Branch + Invalid Month
        sut_res16 = api_client.get(f"{sut_list_url}?branch={branch_f.id}&month=5")
        assert len(sut_res16.data["results"]) == 0

    def test_monthly_cost_category_pagination(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        for i in range(10):
            cc = CostCategory.objects.create(business=env.business_a, name=f"Extra {i}")
            MonthlyCostCategory.objects.create(
                monthly_summary=env.summary_branch_a1,
                cost_category=cc,
                cost=100.0
            )

        sut_paginated_url = f"{env.list_url}?branch={env.branch_a1.id}"

        # Act - 1. Page 1 (size 6)
        sut_page1_res = api_client.get(sut_paginated_url)

        # Assert - 1. Page 1
        assert sut_page1_res.status_code == 200
        assert len(sut_page1_res.data["results"]) == 6
        assert sut_page1_res.data["next"] is not None

        # Arrange - 2. Page 2
        sut_page2_url = sut_page1_res.data["next"]

        # Act - 2. Page 2
        sut_page2_res = api_client.get(sut_page2_url)

        # Assert - 2. Page 2
        assert len(sut_page2_res.data["results"]) == 5
        assert sut_page2_res.data["next"] is None