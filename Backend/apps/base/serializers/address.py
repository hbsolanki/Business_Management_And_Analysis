from rest_framework import serializers
from django.db import transaction
from apps.master.models import Country, State, City
from apps.base.serializers.base import BaseSerializer

class BaseAddressSerializer(BaseSerializer):
    city = serializers.CharField(write_only=True)
    state = serializers.CharField(write_only=True)
    country = serializers.CharField(write_only=True)

    city_name = serializers.CharField(source="city.name", read_only=True)
    state_name = serializers.CharField(source="city.state.name", read_only=True)
    country_name = serializers.CharField(source="city.state.country.name", read_only=True)

    class Meta:
        fields = [
            "id",
            "address_line_1",
            "address_line_2",
            "city",
            "city_name",
            "state",
            "state_name",
            "country",
            "country_name",
            "pin_code",
        ]
        read_only_fields = ["id", "city_name", "state_name", "country_name"]

    @transaction.atomic
    def _handle_location(self, validated_data):
        city_name = validated_data.pop("city").strip().title()
        state_name = validated_data.pop("state").strip().title()
        country_name = validated_data.pop("country").strip().title()

        country, _ = Country.objects.get_or_create(name=country_name)
        state, _ = State.objects.get_or_create(name=state_name, country=country)
        city, _ = City.objects.get_or_create(name=city_name, state=state)

        validated_data["city"] = city
        return validated_data

    @transaction.atomic
    def create(self, validated_data):
        validated_data = self._handle_location(validated_data)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        city_name = validated_data.get("city")
        state_name = validated_data.get("state")
        country_name = validated_data.get("country")

        if all([city_name, state_name, country_name]):
            validated_data = self._handle_location(validated_data)
        
        return super().update(instance, validated_data)
