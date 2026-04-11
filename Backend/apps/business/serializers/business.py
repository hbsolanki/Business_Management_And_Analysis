from rest_framework import serializers

from apps.base.serializers.base import BaseSerializer
from apps.business.models import Business


class BusinessSerializer(BaseSerializer):

    class Meta(BaseSerializer.Meta):
        model = Business
        fields = BaseSerializer.Meta.fields + ["name", "gst_number", "description"]

class BusinessBasicDetailsSerializer(serializers.ModelSerializer):

    class Meta:
        model = Business
        fields=["id","name","description"]