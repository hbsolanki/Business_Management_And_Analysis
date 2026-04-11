from apps.business.models import BranchAddress
from apps.base.serializers.address import BaseAddressSerializer

class BranchAddressSerializer(BaseAddressSerializer):
    class Meta(BaseAddressSerializer.Meta):
        model = BranchAddress
