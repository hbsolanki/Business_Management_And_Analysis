import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.business.models import Business, Branch
from apps.base.tests import BaseTestCase


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def branch_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.business, tc.plan, tc.sub = tc.setup_business_with_plan(business_name="Test Biz")
    tc.user = tc.create_owner(business=tc.business)
    tc.branch_list_url = reverse('branch-list')
    return tc


@pytest.mark.django_db
class TestBranch:

    def test_create_branch_success(self, api_client, branch_env):
        # Arrange
        sut_url = branch_env.branch_list_url
        api_client.force_authenticate(user=branch_env.user)
        payload = {
            "name": "Downtown Branch",
            "address": "123 Street",
            "contact_number": "0000000000"
        }

        # Act
        sut_response = api_client.post(sut_url, payload)

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert Branch.objects.filter(business=branch_env.business).count() == 1

    def test_branch_multi_tenancy_isolation(self, api_client, branch_env):
        # Arrange
        biz_b = Business.objects.create(name="Business B")
        branch_b = Branch.objects.create(business=biz_b, name="Branch B")
        api_client.force_authenticate(user=branch_env.user)
        sut_detail_url_b = reverse('branch-detail', args=[branch_b.id])
        sut_list_url = branch_env.branch_list_url

        # Act - Try to access Branch B detail
        sut_response_detail = api_client.get(sut_detail_url_b)

        # Assert
        assert sut_response_detail.status_code == status.HTTP_404_NOT_FOUND

        # Act - Try to list branches
        sut_response_list = api_client.get(sut_list_url)

        # Assert - Should only see Business A's branches
        assert len(sut_response_list.data['results']) == 0

    def test_manager_cannot_create_update_delete_branch(self, api_client, branch_env):
        # Arrange
        manager = branch_env.create_manager(business=branch_env.business)
        api_client.force_authenticate(user=manager)
        sut_list_url = branch_env.branch_list_url
        create_payload = {"name": "Manager Branch", "address": "Addr", "contact_number": "123"}

        # Act & Assert - Create
        sut_create_res = api_client.post(sut_list_url, create_payload)
        assert sut_create_res.status_code == status.HTTP_403_FORBIDDEN

        # Arrange - Setup branch to test Update/Delete
        branch = Branch.objects.create(business=branch_env.business, name="A Branch")
        sut_detail_url = reverse('branch-detail', args=[branch.id])

        # Act & Assert - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"name": "Updated"})
        assert sut_patch_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - Delete
        sut_del_res = api_client.delete(sut_detail_url)
        assert sut_del_res.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_cannot_create_update_delete_branch(self, api_client, branch_env):
        # Arrange
        employee = branch_env.create_employee(business=branch_env.business)
        api_client.force_authenticate(user=employee)
        sut_list_url = branch_env.branch_list_url
        create_payload = {"name": "Employee Branch", "address": "Addr", "contact_number": "123"}

        # Act & Assert - Create
        sut_create_res = api_client.post(sut_list_url, create_payload)
        assert sut_create_res.status_code == status.HTTP_403_FORBIDDEN

        # Arrange - Setup branch to test Update/Delete
        branch = Branch.objects.create(business=branch_env.business, name="A Branch")
        sut_detail_url = reverse('branch-detail', args=[branch.id])

        # Act & Assert - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"name": "Updated"})
        assert sut_patch_res.status_code == status.HTTP_403_FORBIDDEN

        # Act & Assert - Delete
        sut_del_res = api_client.delete(sut_detail_url)
        assert sut_del_res.status_code == status.HTTP_403_FORBIDDEN

    def test_branch_filtering(self, api_client, branch_env):
        # Arrange
        api_client.force_authenticate(user=branch_env.user)
        Branch.objects.create(business=branch_env.business, name="Main Branch", is_default=True)
        Branch.objects.create(business=branch_env.business, name="Second Branch", is_default=False)
        sut_list_url = branch_env.branch_list_url

        # Act & Assert - 1. Name contains (match)
        sut_res1 = api_client.get(f"{sut_list_url}?name=Main")
        assert len(sut_res1.data["results"]) == 1
        assert sut_res1.data["results"][0]["name"] == "Main Branch"

        # Act & Assert - 2. Name contains (icontains)
        sut_res2 = api_client.get(f"{sut_list_url}?name=main")
        assert len(sut_res2.data["results"]) == 1
        assert sut_res2.data["results"][0]["name"] == "Main Branch"

        # Act & Assert - 3. Is default
        sut_res3 = api_client.get(f"{sut_list_url}?is_default=true")
        assert len(sut_res3.data["results"]) >= 1
        assert sut_res3.data["results"][0]["name"] == "Main Branch"
        assert sut_res3.data["results"][0]["is_default"] is True

        # Act & Assert - 4. Name AND is_default (Success)
        sut_res4 = api_client.get(f"{sut_list_url}?name=Main&is_default=true")
        assert len(sut_res4.data["results"]) == 1
        assert sut_res4.data["results"][0]["name"] == "Main Branch"

        # Act & Assert - 5. Name AND is_default (Mismatch)
        sut_res5 = api_client.get(f"{sut_list_url}?name=Main&is_default=false")
        assert len(sut_res5.data["results"]) == 0

        # Act & Assert - 6. Name AND is_default (Mismatch 2)
        sut_res6 = api_client.get(f"{sut_list_url}?name=Second&is_default=true")
        assert len(sut_res6.data["results"]) == 0

        # Act & Assert - 7. Name AND is_default (Success 2)
        sut_res7 = api_client.get(f"{sut_list_url}?name=Second&is_default=false")
        assert len(sut_res7.data["results"]) == 1
        assert sut_res7.data["results"][0]["name"] == "Second Branch"
        assert sut_res7.data["results"][0]["is_default"] is False

    def test_branch_pagination(self, api_client, branch_env):
        # Arrange
        api_client.force_authenticate(user=branch_env.user)
        for i in range(7):
            Branch.objects.create(business=branch_env.business, name=f"Branch {i}")
        sut_list_url = branch_env.branch_list_url

        # Act - Page 1 (size 6)
        sut_page1_res = api_client.get(sut_list_url)

        # Assert - Page 1
        assert len(sut_page1_res.data["results"]) == 6

        # Act - Page 2
        sut_page2_res = api_client.get(sut_page1_res.data["next"])

        # Assert - Page 2
        assert len(sut_page2_res.data["results"]) >= 1

    def test_branch_with_nested_address_lifecycle(self, api_client, branch_env):
        # Arrange
        api_client.force_authenticate(user=branch_env.user)
        payload = {
            "name": "Branch With Address",
            "contact_number": "1234567890",
            "is_default": False,
            "address": {
                "address_line_1": "100 MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India",
                "pin_code": "560001",
            }
        }

        # Act 1 - Create with nested address
        res_create = api_client.post(branch_env.branch_list_url, payload, format="json")
        assert res_create.status_code == status.HTTP_201_CREATED
        branch_id = res_create.data["id"]
        assert res_create.data["address"]["city_name"] == "Bengaluru"
        assert res_create.data["address"]["state_name"] == "Karnataka"

        # Act 2 - Update existing nested address
        detail_url = reverse("branch-detail", args=[branch_id])
        update_payload = {
            "name": "Branch With Address",
            "address": {
                "address_line_1": "200 Residency Road",
                "city": "Mysuru",
                "state": "Karnataka",
                "country": "India",
            }
        }
        res_update = api_client.patch(detail_url, update_payload, format="json")
        assert res_update.status_code == status.HTTP_200_OK
        assert res_update.data["address"]["address_line_1"] == "200 Residency Road"
        assert res_update.data["address"]["city_name"] == "Mysuru"

        # Act 3 - Update address with only non-location fields (partial)
        from apps.base.serializers.address import AddressSerializer
        from apps.base.models import Address
        addr = Address.objects.get(id=res_update.data["address"]["id"])
        addr_ser = AddressSerializer(addr, data={"address_line_1": "300 Brigade Road"}, partial=True)
        assert addr_ser.is_valid(), addr_ser.errors
        saved_addr = addr_ser.save()
        assert saved_addr.address_line_1 == "300 Brigade Road"

    def test_branch_without_initial_address_updates_address(self, api_client, branch_env):
        # Arrange
        api_client.force_authenticate(user=branch_env.user)
        branch = Branch.objects.create(business=branch_env.business, name="No Address Branch")
        detail_url = reverse("branch-detail", args=[branch.id])

        # Act
        payload = {
            "address": {
                "address_line_1": "New House",
                "city": "Pune",
                "state": "Maharashtra",
                "country": "India",
                "pin_code": "411001",
            }
        }
        res = api_client.patch(detail_url, payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["address"]["city_name"] == "Pune"

    def test_branch_validations(self, api_client, branch_env):
        # Arrange
        api_client.force_authenticate(user=branch_env.user)
        b1 = Branch.objects.create(business=branch_env.business, name="Alpha Branch", is_default=True)
        b2 = Branch.objects.create(business=branch_env.business, name="Beta Branch", is_default=False)

        # 1. Duplicate name on create
        res_dup = api_client.post(branch_env.branch_list_url, {"name": "Alpha Branch"})
        assert res_dup.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in str(res_dup.data)

        # 2. Duplicate default on create
        res_def = api_client.post(branch_env.branch_list_url, {"name": "Gamma Branch", "is_default": True})
        assert res_def.status_code == status.HTTP_400_BAD_REQUEST
        assert "main branch" in str(res_def.data)

        # 3. Update self keeping same name and default status -> succeeds
        b1_url = reverse("branch-detail", args=[b1.id])
        res_self = api_client.patch(b1_url, {"name": "Alpha Branch", "is_default": True})
        assert res_self.status_code == status.HTTP_200_OK

        # 4. Update b2 to duplicate name of b1 -> fails
        b2_url = reverse("branch-detail", args=[b2.id])
        res_coll = api_client.patch(b2_url, {"name": "Alpha Branch"})
        assert res_coll.status_code == status.HTTP_400_BAD_REQUEST

        # 5. Update b2 to is_default=True when b1 is already default -> fails
        res_def_coll = api_client.patch(b2_url, {"is_default": True})
        assert res_def_coll.status_code == status.HTTP_400_BAD_REQUEST

