from rest_framework import serializers
from django.db import transaction
from apps.business.models import Branch
from apps.base.serializers.base import BaseSerializer
from apps.business.serializers.address import BranchAddressSerializer


class BranchSerializer(BaseSerializer):
    address = BranchAddressSerializer(read_only=True)
    address_data = serializers.DictField(child=serializers.CharField(allow_blank=True, allow_null=True), write_only=True, required=False)

    class Meta(BaseSerializer.Meta):
        model = Branch
        fields = BaseSerializer.Meta.fields + [
            "name", "address", "address_data", "contact_number", "is_default", "is_active"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields

    def validate_name(self, value):
        request = self.context["request"]
        user = request.user
        qs = Branch.objects.filter(business=request.user.business, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise serializers.ValidationError(f"A branch with the name '{value}' already exists in your business.")
        return value

    def validate_is_default(self, value):
        if value:
            request = self.context["request"]
            user = request.user
            qs = Branch.objects.filter(business=user.business, is_default=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            
            if qs.exists():
                raise serializers.ValidationError("Only one branch can be set as the main branch for a business.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        address_data = validated_data.pop("address_data", None)

        if address_data:
            address_serializer = BranchAddressSerializer(data=address_data)
            address_serializer.is_valid(raise_exception=True)
            validated_data["address"] = address_serializer.save()

        validated_data["business"] = self.context["request"].user.business
        return Branch.objects.create(**validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        address_data = validated_data.pop("address_data", None)

        if address_data:
            if instance.address:
                address_serializer = BranchAddressSerializer(instance.address, data=address_data, partial=True)
            else:
                address_serializer = BranchAddressSerializer(data=address_data)
            address_serializer.is_valid(raise_exception=True)
            validated_data["address"] = address_serializer.save()

        return super().update(instance, validated_data)