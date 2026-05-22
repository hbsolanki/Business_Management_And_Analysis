from rest_framework import serializers
from apps.master.models import Country, State, City


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ["id", "name"]


class StateSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(write_only=True)
    country = CountrySerializer(read_only=True)

    class Meta:
        model = State
        fields = ["id", "name", "country", "country_name"]

    def create(self, validated_data):
        country_name = validated_data.pop("country_name").strip().title()
        country, _ = Country.objects.get_or_create(name=country_name)
        state_name = validated_data.get("name").strip().title()
        state, _ = State.objects.get_or_create(name=state_name, country=country)
        return state


class CitySerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(write_only=True)
    country_name = serializers.CharField(write_only=True)
    state = StateSerializer(read_only=True)

    class Meta:
        model = City
        fields = ["id", "name", "state", "state_name", "country_name"]

    def create(self, validated_data):
        country_name = validated_data.pop("country_name").strip().title()
        state_name = validated_data.pop("state_name").strip().title()
        city_name = validated_data.get("name").strip().title()

        country, _ = Country.objects.get_or_create(name=country_name)
        state, _ = State.objects.get_or_create(name=state_name, country=country)
        city, _ = City.objects.get_or_create(name=city_name, state=state)
        return city
