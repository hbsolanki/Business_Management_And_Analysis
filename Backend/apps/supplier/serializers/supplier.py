from rest_framework import serializers
from apps.supplier.models import Supplier
from apps.business.models import Business
from apps.base.serializers.base import BaseSerializer


class SupplierSerializer(BaseSerializer):
    supplier_business_id = serializers.PrimaryKeyRelatedField(
        queryset=Business.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        source="supplier_business"
    )

    class Meta(BaseSerializer.Meta):
        model = Supplier
        fields = BaseSerializer.Meta.fields + [
            "name", "contact_person", "email", "mobile_number", "gst_number", "address","same_platform",
            "supplier_business", "supplier_business_id"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [ "supplier_business"]

    def _get_business(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return getattr(user, "business", None)

    def validate(self, attrs):
        same_platform = attrs.get("same_platform", self.instance.same_platform if self.instance else False)
        supplier_business = attrs.get("supplier_business", self.instance.supplier_business if self.instance else None)

        if same_platform and not supplier_business:
            raise serializers.ValidationError({"supplier_business_id": "Supplier business is required when same_platform is True."})
        if not same_platform and supplier_business:
            raise serializers.ValidationError({"supplier_business_id": "Supplier business must be None when same_platform is False."})

        return attrs

    def create(self, validated_data):
        validated_data["business"] = self._get_business()
        return super().create(validated_data)
