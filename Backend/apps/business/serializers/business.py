from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.business.models import Business
from apps.business.serializers.gst_profile import BusinessGSTProfileSerializer


class BusinessSerializer(BaseSerializer):
    gst_profile = BusinessGSTProfileSerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = Business
        fields = BaseSerializer.Meta.fields + ["name", "description", "gst_profile"]

class BusinessBasicDetailsSerializer(serializers.ModelSerializer):

    class Meta:
        model = Business
        fields=["id","name","description"]