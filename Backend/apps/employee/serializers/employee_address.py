from apps.employee.models import EmployeeAddress
from apps.base.serializers.address import BaseAddressSerializer

class EmployeeAddressSerializer(BaseAddressSerializer):
    class Meta(BaseAddressSerializer.Meta):
        model = EmployeeAddress
