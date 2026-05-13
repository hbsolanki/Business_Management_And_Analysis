from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.supplier.models import Supplier
from apps.activity_log.models import ActivityLog
from apps.employee.models import WorkType


class SupplierTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.url = reverse('supplier-list')
        self.supplier_data = {
            "name": "Supplier New",
            "mobile_number": "9999999999",
            "email": "new@example.com",
            "contact_person": "Contact New",
            "gst_number": "27AAAAA0000A1Z5",
            "address": "456 Avenue",
            "same_platform": False
        }

    def verify_supplier_data(self, response_data, expected_data):
        for key, value in expected_data.items():
            self.assertEqual(response_data[key], value)

    def test_supplier_crud_by_owner(self):
        self.client.force_authenticate(user=self.owner_a)
        
        # Create
        response = self.client.post(self.url, self.supplier_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_supplier_data(response.data, self.supplier_data)
        supplier_id = response.data['id']
        self._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.SUPPLIER)
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 2 existing + 1 new
        self.assertEqual(len(response.data['results']), Supplier.objects.filter(business=self.owner_a.business).count())

        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': supplier_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verify_supplier_data(response.data, self.supplier_data)

        # Update
        update_data = {"name": "Updated"}
        response = self.client.patch(detail_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        log = self._verify_log(ActivityLog.Action.UPDATE, ActivityLog.Module.SUPPLIER)
        self.assertEqual(log.meta['name']['old'], self.supplier_data["name"])

        # Read
        response = self.client.get(detail_url)
        self.assertEqual(response.data['name'], update_data["name"])

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.SUPPLIER)

    def test_supplier_crud_by_manager(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # Create
        response = self.client.post(self.url, self.supplier_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_supplier_data(response.data, self.supplier_data)
        supplier_id = response.data['id']
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': supplier_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verify_supplier_data(response.data, self.supplier_data)

        # Update
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Read
        response = self.client.get(detail_url)
        self.assertEqual(response.data['name'], "Updated")

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_supplier_crud_by_employee_without_permission(self):
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        response = self.client.post(self.url, self.supplier_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Update
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supplier_crud_by_employee_with_permission(self):
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.SUPPLIER)
        self.client.force_authenticate(user=self.employee_a1)
        
        # Create
        response = self.client.post(self.url, self.supplier_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_supplier_data(response.data, self.supplier_data)
        supplier_id = response.data['id']
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': supplier_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verify_supplier_data(response.data, self.supplier_data)

        # Update
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Read
        response = self.client.get(detail_url)
        self.assertEqual(response.data['name'], "Updated")

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_supplier_crud_by_owner_other_business(self):
        self.client.force_authenticate(user=self.owner_b)
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Update
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_supplier_crud_by_manager_other_business(self):
        self.client.force_authenticate(user=self.manager_a1)
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_b1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Update
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_supplier_crud_by_employee_without_permission_other_business(self):
        self.client.force_authenticate(user=self.employee_b1)
        
        # Create
        response = self.client.post(self.url, self.supplier_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Update
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supplier_crud_by_employee_with_permission_other_business(self):
        self.assign_work_to_user(self.employee_a1, self.branch_a1, WorkType.SUPPLIER)
        self.client.force_authenticate(user=self.employee_a1)
        
        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Read
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_b1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Update
        response = self.client.patch(detail_url, {"name": "Updated"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_supplier_validation_error_same_platform(self):
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        
        # Create
        payload = self.supplier_data.copy()
        payload['same_platform'] = True
        payload['supplier_business_id'] = None
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Update
        response = self.client.patch(detail_url, {"same_platform": True, "supplier_business_id": None}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_supplier_validation_error_different_platform(self):
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        
        # Create
        payload = self.supplier_data.copy()
        payload['same_platform'] = False
        payload['supplier_business_id'] = self.business_b.id
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Update
        response = self.client.patch(detail_url, {"same_platform": False, "supplier_business_id": self.business_b.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_supplier_validation_error_invalid_gst(self):
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        
        # Create
        payload = self.supplier_data.copy()
        payload['gst_number'] = "INVALID_GST"
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Update
        response = self.client.patch(detail_url, {"gst_number": "INVALID_GST"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_supplier_validation_error_invalid_mobile(self):
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        
        # Create
        payload = self.supplier_data.copy()
        payload['mobile_number'] = "98765"
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Update
        response = self.client.patch(detail_url, {"mobile_number": "98765"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_supplier_validation_error_invalid_email(self):
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse('supplier-detail', kwargs={'pk': self.supplier_a1.id})
        
        # Create
        payload = self.supplier_data.copy()
        payload['email'] = "invalid-email"
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Update
        response = self.client.patch(detail_url, {"email": "invalid-email"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- FILTERING TESTS ---

    def test_supplier_filtering_combinations(self):
        self.client.force_authenticate(user=self.owner_a)

        # 1. Name icontains
        search_name = "Supp"
        response = self.client.get(f"{self.url}?name={search_name}")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, name__icontains=search_name).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        names = [r["name"] for r in response.data["results"]]
        self.assertIn("Supplier A1", names)
        self.assertIn("Supplier A2", names)

        # 2. Name Case-Insensitive
        search_name = "supplier a1"
        response = self.client.get(f"{self.url}?name={search_name}")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, name__icontains=search_name).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["id"], self.supplier_a1.id)
        self.assertEqual(response.data["results"][0]["name"], "Supplier A1")

        # 3. Mobile icontains (partial)
        search_mobile = "0003"
        response = self.client.get(f"{self.url}?mobile_number={search_mobile}")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, mobile_number__icontains=search_mobile).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["id"], self.supplier_a2.id)
        self.assertEqual(response.data["results"][0]["mobile_number"], "9000000003")

        # 4. Mobile full match
        search_mobile = "9000000001"
        response = self.client.get(f"{self.url}?mobile_number={search_mobile}")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, mobile_number__icontains=search_mobile).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["id"], self.supplier_a1.id)
        self.assertEqual(response.data["results"][0]["mobile_number"], "9000000001")

        # 5. Name AND Mobile
        response = self.client.get(f"{self.url}?name=A1&mobile_number=0001")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, name__icontains="A1", mobile_number__icontains="0001").count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertEqual(response.data["results"][0]["name"], "Supplier A1")
        self.assertEqual(response.data["results"][0]["mobile_number"], "9000000001")

        # 6. Name AND Mobile (Mismatch)
        response = self.client.get(f"{self.url}?name=A1&mobile_number=3211")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, name__icontains="A1", mobile_number__icontains="3211").count()
        self.assertEqual(len(response.data["results"]), expected_count)

        # 7. Isolation check
        # Owner A: mobile 0001 -> only A1
        search_mobile = "9000000001"
        response = self.client.get(f"{self.url}?mobile_number={search_mobile}")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, mobile_number__icontains=search_mobile).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        self.assertNotEqual(response.data["results"][0]["id"], self.supplier_b1.id)

        # 8. Empty results
        response = self.client.get(f"{self.url}?name=NonExistent")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, name__icontains="NonExistent").count()
        self.assertEqual(len(response.data["results"]), expected_count)

        # 9. All filters combined
        response = self.client.get(f"{self.url}?name=Supplier&mobile_number=9000")
        expected_count = Supplier.objects.filter(business=self.owner_a.business, name__icontains="Supplier", mobile_number__icontains="9000").count()
        self.assertEqual(len(response.data["results"]), expected_count)
        
        results_map = {r["name"]: r["mobile_number"] for r in response.data["results"]}
        self.assertIn("Supplier A1", results_map)
        self.assertEqual(results_map["Supplier A1"], "9000000001")
        self.assertIn("Supplier A2", results_map)
        self.assertEqual(results_map["Supplier A2"], "9000000003")

        response = self.client.get(f"{self.url}?name=&mobile_number=")
        expected_count = Supplier.objects.filter(business=self.owner_a.business).count()
        self.assertEqual(len(response.data["results"]), expected_count)
        names = [r["name"] for r in response.data["results"]]
        self.assertIn("Supplier A1", names)
        self.assertIn("Supplier A2", names)

    # --- PAGINATION TESTS ---

    def test_supplier_pagination(self):
        self.client.force_authenticate(user=self.owner_a)
        # Seed 7 suppliers total (2 existing + 5 new)
        for i in range(5):
            Supplier.objects.create(
                business=self.business_a,
                name=f"Paginated Supplier {i}",
                mobile_number=f"700000000{i}"
            )
        
        # 1. Page 1
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        # Page size 6
        self.assertEqual(len(response.data["results"]), 6)
        self.assertIsNotNone(response.data["next"])
        
        # 2. Page 2
        next_url = response.data["next"]
        response = self.client.get(next_url)
        self.assertEqual(response.status_code, 200)
        # Remaining supplier
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])
        