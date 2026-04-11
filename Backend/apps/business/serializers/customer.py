from rest_framework import serializers
from apps.business.models import BusinessCustomer
from apps.base.serializers.base import BaseSerializer


class BusinessCustomerSerializer(BaseSerializer):
    customer_business_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    class Meta(BaseSerializer.Meta):
        model = BusinessCustomer
        fields = BaseSerializer.Meta.fields + [
            "name", "mobile_number", "gender", "age", "email","same_platform",
            "customer_business", "customer_business_id"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["customer_business"]

    def validate(self, attrs):
        customer_business_id = attrs.get("customer_business_id")
        if customer_business_id:
            from apps.business.models import Business
            try:
                attrs["customer_business"] = Business.objects.get(id=customer_business_id)
            except Business.DoesNotExist:
                raise serializers.ValidationError({"customer_business_id": "Business does not exist."})

        same_platform = attrs.get("same_platform")
        customer_business = attrs.get("customer_business")

        if self.instance:
            if "same_platform" not in attrs:
                same_platform = self.instance.same_platform
            if "customer_business" not in attrs:
                customer_business = self.instance.customer_business

        if same_platform and not customer_business:
            raise serializers.ValidationError({"customer_business_id": "Customer business is required when same_platform is True."})
        if not same_platform and customer_business:
            raise serializers.ValidationError({"customer_business_id": "Customer business must be None when same_platform is False."})

        return attrs


    def validate_gender(self, value):
        return value.upper() if value else value

    def create(self, validated_data):
        business = self.context.get('request').user.business
        mobile_number = validated_data.get('mobile_number')
        
        validated_data.pop("customer_business_id", None)
        customer, created = BusinessCustomer.objects.get_or_create(
            mobile_number=mobile_number,
            business=business,
            defaults={**validated_data}
        )

        if not created:
            updated_fields = []
            for field, value in validated_data.items():
                if value is not None and getattr(customer, field) != value:
                    setattr(customer, field, value)
                    updated_fields.append(field)
            
            if updated_fields:
                customer.save(update_fields=updated_fields)
        
        return customer
