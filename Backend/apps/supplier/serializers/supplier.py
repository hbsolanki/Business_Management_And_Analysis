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

    def validate(self, attrs):
        request = self.context.get("request")
        business = request.user.business if request else None
        
        # 1. Base Logic for Platform Link
        same_platform = attrs.get("same_platform", self.instance.same_platform if self.instance else False)
        supplier_business = attrs.get("supplier_business", self.instance.supplier_business if self.instance else None)

        if same_platform and not supplier_business:
            raise serializers.ValidationError({"supplier_business_id": "Supplier business is required when same_platform is True."})
        if not same_platform and supplier_business:
            raise serializers.ValidationError({"supplier_business_id": "Supplier business must be None when same_platform is False."})

        # 2. Unique Constraints Validation (Per Business)
        if business:
            # Check Mobile Uniqueness
            mobile = attrs.get("mobile_number")
            if mobile:
                qs = Supplier.objects.filter(business=business, mobile_number=mobile)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"mobile_number": "A supplier with this mobile number already exists in your business."})

            # Check GST Uniqueness
            gst = attrs.get("gst_number")
            if gst:
                qs = Supplier.objects.filter(business=business, gst_number=gst)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"gst_number": "A supplier with this GST number already exists in your business."})

            # Check Platform Business Link Uniqueness
            if supplier_business:
                qs = Supplier.objects.filter(business=business, supplier_business=supplier_business)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"supplier_business_id": "This business is already linked as a supplier in your list."})

        return attrs

    def create(self, validated_data):
        validated_data["business"] = self.context["request"].user.business
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
