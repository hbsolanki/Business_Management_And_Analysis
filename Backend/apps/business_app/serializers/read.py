from rest_framework.serializers import ModelSerializer
from apps.business_app.models import Business


class BusinessReadSerializer(ModelSerializer):

    class Meta:
        model = Business
        fields=['id','name','description']


class OnwerBusinessReadSerializer(ModelSerializer):

    class Meta:
        model = Business
        fields = ['id', 'name', 'haveEquity', 'assets', 'description']