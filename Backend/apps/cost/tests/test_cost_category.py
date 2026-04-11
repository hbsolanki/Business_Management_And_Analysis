from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.cost.models import CostCategory
from apps.activity_log.models import ActivityLog

class CostCategoryTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse('cost-category-list')

    def test_cost_category_create_without_name(self):
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.list_url, {"description": "No name"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_cost_category_create_without_description(self):
        self.client.force_authenticate(user=self.owner_a)
        # description is optional in model
        response = self.client.post(self.list_url, {"name": "Travel"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['description'])

    def test_cost_category_crud_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        response = self.client.post(self.list_url, {"name": "Travel", "description": "Business trips"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category_id = response.data['id']
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.COST)
        
        # Read
        detail_url = reverse('cost-category-detail', args=[category_id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Travel")
        
        # Update
        response = self.client.patch(detail_url, {"name": "Travel & Transport"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CostCategory.objects.get(id=category_id).name, "Travel & Transport")
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.COST)
        self.assertEqual(log.meta['name']['old'], "Travel")
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CostCategory.objects.filter(id=category_id).exists())
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.COST)

    def test_cost_category_crud_by_manager(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Create
        response = self.client.post(self.list_url, {"name": "Office Supplies"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category_id = response.data['id']
        
        # Update
        detail_url = reverse('cost-category-detail', args=[category_id])
        response = self.client.patch(detail_url, {"name": "Stationery"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cost_category_crud_by_employee(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # 1. Create
        response = self.client.post(self.list_url, {"name": "Lunch"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Read
        detail_url = reverse('cost-category-detail', args=[self.cost_category_a.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 3. Update
        response = self.client.patch(detail_url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cost_category_crud_by_owner_other_business(self):
        # Owner in Business B
        self.client.force_authenticate(user=self.owner_b)
        
        detail_url = reverse('cost-category-detail', args=[self.cost_category_a.id])
        
        # 1. Create (Should succeed for OWN business, but business is tied to user)
        response = self.client.post(self.list_url, {"name": "Biz B Category"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['business'], self.business_b.id)
        
        # 2. Read Biz A Category
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Update Biz A Category
        response = self.client.patch(detail_url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 4. Delete Biz A Category
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cost_category_crud_by_manager_other_business(self):
        self.client.force_authenticate(user=self.manager_b1)
        
        detail_url = reverse('cost-category-detail', args=[self.cost_category_a.id])
        
        # 1. Create
        response = self.client.post(self.list_url, {"name": "Biz B Manager Category"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 2. Read Biz A Category
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Update Biz A Category
        response = self.client.patch(detail_url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 4. Delete Biz A Category
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cost_category_crud_by_employee_other_business(self):
        self.client.force_authenticate(user=self.employee_b1)
        
        detail_url = reverse('cost-category-detail', args=[self.cost_category_a.id])
        
        # 1. Create
        response = self.client.post(self.list_url, {"name": "Biz B Employee Category"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Read
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 3. Update
        response = self.client.patch(detail_url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 4. Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)