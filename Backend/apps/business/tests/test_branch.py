from django.urls import reverse
from rest_framework import status
from apps.business.models import Business, Branch

from apps.base.tests import BaseTestCase

class BranchViewSetTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.business, self.plan, self.sub = self.setup_business_with_plan(business_name="Test Biz")
        self.user = self.create_owner(business=self.business)
        self.branch_list_url = reverse('branch-list')

    def test_create_branch_success(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "name": "Downtown Branch",
            "address": "123 Street",
            "contact_number": "0000000000"
        }
        response = self.client.post(self.branch_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Branch.objects.filter(business=self.business).count(), 1)

    def test_branch_multi_tenancy_isolation(self):
        # Business B
        biz_b = Business.objects.create(name="Business B")
        branch_b = Branch.objects.create(business=biz_b, name="Branch B")
        
        self.client.force_authenticate(user=self.user) # User is from Business A
        
        # Try to access Branch B detail
        url = reverse('branch-detail', args=[branch_b.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Try to list branches
        response = self.client.get(self.branch_list_url)
        # Should only see Business A's branches (0 so far in this test)
        self.assertEqual(len(response.data['results']), 0)

    def test_manager_cannot_create_update_delete_branch(self):
        manager = self.create_manager(business=self.business)
        self.client.force_authenticate(user=manager)
        
        # Create
        response = self.client.post(self.branch_list_url, {"name": "Manager Branch", "address": "Addr", "contact_number": "123"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Setup a branch to test Update/Delete
        branch = Branch.objects.create(business=self.business, name="A Branch")
        detail_url = reverse('branch-detail', args=[branch.id])
        
        # Update
        response = self.client.patch(detail_url, {"name": "Updated"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_create_update_delete_branch(self):
        employee = self.create_employee(business=self.business)
        self.client.force_authenticate(user=employee)
        
        # Create
        response = self.client.post(self.branch_list_url, {"name": "Employee Branch", "address": "Addr", "contact_number": "123"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Setup a branch to test Update/Delete
        branch = Branch.objects.create(business=self.business, name="A Branch")
        detail_url = reverse('branch-detail', args=[branch.id])
        
        # Update
        response = self.client.patch(detail_url, {"name": "Updated"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_branch_filtering(self):
        """Test branch filters."""
        self.client.force_authenticate(user=self.user)
        # Seed
        Branch.objects.create(business=self.business, name="Main Branch", is_default=True)
        Branch.objects.create(business=self.business, name="Second Branch", is_default=False)
        
        # 1. Name contains (match)
        response = self.client.get(f"{self.branch_list_url}?name=Main")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Main Branch")
        
        # 2. Name contains (icontains)
        response = self.client.get(f"{self.branch_list_url}?name=main")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Main Branch")
        
        # 3. Is default
        response = self.client.get(f"{self.branch_list_url}?is_default=true")
        self.assertTrue(len(response.data["results"]) >= 1)
        self.assertEqual(response.data["results"][0]["name"], "Main Branch")
        self.assertTrue(response.data["results"][0]["is_default"])

        # 4. Name AND is_default (Success)
        response = self.client.get(f"{self.branch_list_url}?name=Main&is_default=true")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Main Branch")

        # 5. Name AND is_default (Mismatch)
        response = self.client.get(f"{self.branch_list_url}?name=Main&is_default=false")
        self.assertEqual(len(response.data["results"]), 0)

        # 6. Name AND is_default (Mismatch 2)
        response = self.client.get(f"{self.branch_list_url}?name=Second&is_default=true")
        self.assertEqual(len(response.data["results"]), 0)

        # 7. Name AND is_default (Success 2)
        response = self.client.get(f"{self.branch_list_url}?name=Second&is_default=false")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Second Branch")
        self.assertFalse(response.data["results"][0]["is_default"])
        

    def test_branch_pagination(self):
        """Test branch pagination."""
        self.client.force_authenticate(user=self.user)
        # Seed 7 branches (total 7+?)
        for i in range(7):
            Branch.objects.create(business=self.business, name=f"Branch {i}")
            
        # Page 1 (size 6)
        response = self.client.get(self.branch_list_url)
        self.assertEqual(len(response.data["results"]), 6)
        
        # Page 2
        response = self.client.get(response.data["next"])
        self.assertTrue(len(response.data["results"]) >= 1)
