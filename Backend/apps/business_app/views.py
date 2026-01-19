from logging import raiseExceptions

from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.user.services.user_service import get_tokens_for_user, create_user
from apps.user.models import User
from apps.business_app.serializers import read, create
from apps.business_app.services.business_service import create_business
from apps.business_app.models import Business
from apps.permission.business import IsOwner
from django.db import  transaction
from apps.inventory.services.inventory_transaction_service import create_inventory


class BusinessViewSet(ModelViewSet):

    def get_serializer_class(self):
        if self.action == "create":
            return create.CreateBusinessSerializer
        if self.request.user.role==User.Role.OWNER:
            return read.OnwerBusinessReadSerializer
        return read.BusinessReadSerializer

    def get_queryset(self):
        return Business.objects.filter(id=self.request.user.business.id)

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]

        return [IsOwner()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            business = create_business(name=serializer.validated_data["name"],description=serializer.validated_data["description"])

            owner_user = create_user(
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                username=serializer.validated_data['username'],
                mobile_number=serializer.validated_data['mobile_number'],
                password=serializer.validated_data['password'],
                role=User.Role.OWNER,
                business=business
            )
            create_inventory(business)
            token = get_tokens_for_user(owner_user)
            return Response({
                "business_id": business.id,
                "user":{
                    "id": owner_user.id,
                    "username": owner_user.username,
                    "role":owner_user.role,
                }
               ,"access": token["access"],
                "refresh": token["refresh"],
            },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response({"error","something went wrong"}, status=status.HTTP_400_BAD_REQUEST)
