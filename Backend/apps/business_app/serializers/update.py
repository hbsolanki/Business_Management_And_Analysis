from rest_framework import serializers
from apps.business_app.models import Business

class UpdateBusinessSerializer(serializers.ModelSerializer):

    class Meta:
        model = Business
        fields = ['name','assets','haveEquity','description']