from rest_framework import serializers
from apps.business.models import BusinessCustomer
from apps.base.serializers.base import BaseSerializer
from apps.base.serializers.address import AddressSerializer


class BusinessCustomerSerializer(BaseSerializer):
    customer_business_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    address = AddressSerializer(required=False, allow_null=True)

    class Meta(BaseSerializer.Meta):
        model = BusinessCustomer
        fields = BaseSerializer.Meta.fields + [
            "name", "mobile_number", "gender", "age", "email","same_platform",
            "customer_business", "customer_business_id", "address"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["customer_business"]

    def validate(self, attrs):
        request = self.context.get("request")
        business = request.user.business if request else None

        customer_business_id = attrs.get("customer_business_id")
        if customer_business_id:
            from apps.business.models import Business
            try:
                attrs["customer_business"] = Business.objects.get(id=customer_business_id)
            except Business.DoesNotExist:
                raise serializers.ValidationError({"customer_business_id": "Business does not exist."})

        same_platform = attrs.get("same_platform", self.instance.same_platform if self.instance else False)
        customer_business = attrs.get("customer_business", self.instance.customer_business if self.instance else None)

        if same_platform and not customer_business:
            raise serializers.ValidationError({"customer_business_id": "Customer business is required when same_platform is True."})
        if not same_platform and customer_business:
            raise serializers.ValidationError({"customer_business_id": "Customer business must be None when same_platform is False."})

        # Check for duplicate platform business link
        if business and customer_business:
            # Look for an existing customer with the same mobile number to treat as instance
            existing_customer = BusinessCustomer.objects.filter(business=business, mobile_number=attrs.get("mobile_number")).first()
            effective_instance = self.instance or existing_customer

            qs = BusinessCustomer.objects.filter(business=business, customer_business=customer_business)
            if effective_instance:
                qs = qs.exclude(pk=effective_instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"customer_business_id": "This platform business is already added as a customer."})

        return attrs


    def validate_gender(self, value):
        return value.upper() if value else value

    def create(self, validated_data):
        request = self.context.get('request')
        business = request.user.business if request else None
        mobile_number = validated_data.get('mobile_number')
        
        validated_data.pop("customer_business_id", None)
        address_data = validated_data.pop("address", None)

        customer, created = BusinessCustomer.objects.get_or_create(
            mobile_number=mobile_number,
            business=business,
            defaults={**validated_data}
        )

        if address_data:
            if customer.address:
                address_serializer = AddressSerializer(customer.address, data=address_data, partial=True)
            else:
                address_serializer = AddressSerializer(data=address_data)
            address_serializer.is_valid(raise_exception=True)
            customer.address = address_serializer.save()
            customer.save(update_fields=["address"])

        if not created:
            updated_fields = []
            for field, value in validated_data.items():
                if value is not None and getattr(customer, field) != value:
                    setattr(customer, field, value)
                    updated_fields.append(field)
            
            if updated_fields:
                customer.save(update_fields=updated_fields)
        
        return customer
