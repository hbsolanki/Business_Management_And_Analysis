from rest_framework import serializers
from apps.business.models import BusinessGSTProfile, GSTRegistrationType
import re

class BusinessGSTProfileSerializer(serializers.ModelSerializer):
    registration_type_display = serializers.CharField(source='get_registration_type_display', read_only=True)
    
    class Meta:
        model = BusinessGSTProfile
        fields = [
            'id', 'gstin', 'state_code', 'registration_type', 
            'registration_type_display', 'is_active'
        ]
        read_only_fields = ['id', 'state_code']

    def validate_gstin(self, value):
        gstin_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_regex, value):
            raise serializers.ValidationError("Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5")
        return value

    def validate_state_code(self, value):
        if not (value.isdigit() and len(value) == 2):
            raise serializers.ValidationError("State code must be a 2-digit number (e.g., '27').")
        return value
