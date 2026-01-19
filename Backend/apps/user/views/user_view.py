from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from apps.permission.business import IsOwner,IsOwnerOrManager,CanModifyUser,CanDeleteUser
from rest_framework.permissions import IsAuthenticated
from apps.user.services.user_service import  create_user,create_manager_employee
from apps.user.serializers import  create,read,update
from apps.user.models import User
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
import random


class UserViewSet(ModelViewSet):

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            return [CanModifyUser()]
        if self.action in ["destroy", "delete"]:
            return [CanDeleteUser()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create_manager':
            return create.ManagerCreateSerializer
        elif self.action == 'create_employee':
            return  create.EmployeeCreateSerializer
        elif self.action == 'partial_update':
            if self.request.user.role == User.Role.OWNER:
                return update.OwnerUpdateSerializer
            return update.UserUpdateSerializer
        if self.request.user.role == User.Role.OWNER:
            return read.OwnerUserReadSerializer
        return read.UserReadSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role in {User.Role.OWNER, User.Role.MANAGER}:
            return User.objects.filter(business=user.business)

        return User.objects.filter(id=user.id)

    def retrieve(self, request,pk):
        cache_key=f"user:{pk}"
        user=cache.get(cache_key)
        try:
            if not user:
                user=self.get_serializer(User.objects.get(pk=pk)).data
                cache.set(cache_key,user,timeout=80+int(random.random()*30))
            return Response(user, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error":"user not found"},status=status.HTTP_404_NOT_FOUND)


    @action(detail=False, methods=['post'],url_path="manager/create",permission_classes=[IsOwner])
    def create_manager(self,request):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        manager = create_manager_employee(
            **data,
            business=request.user.business,
            user=request.user,
            role=User.Role.MANAGER
        )

        return Response({
            "message":"manager create successfully",
            "manager":{
                "id":manager.id,
                "username":manager.username,
            }
        })

    @action(detail=False, methods=['post'],url_path="employee/create",permission_classes=[IsOwnerOrManager])
    def create_employee(self,request):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data=serializer.validated_data
        employee = create_manager_employee(
            **data,
            business=request.user.business,
            user=request.user,
            role=User.Role.EMPLOYEE
        )

        return Response({
            "message":"employee create successfully",
            "employee":{
                "id":employee.id,
                "username":employee.username,
            }
        })

    @action(detail=False, methods=["GET"], url_path="manager", permission_classes=[IsOwner])
    def manager_list(self, request):
        manager = User.objects.filter(business=request.user.business, role=User.Role.MANAGER)
        serializer = read.UserReadSerializer(manager, many=True)

        return Response(serializer.data)

    @action(detail=False, methods=["GET"], url_path="employee", permission_classes=[IsOwner])
    def employee_list(self, request):
        employees = User.objects.filter(business=request.user.business, role=User.Role.EMPLOYEE)
        serializer = read.UserReadSerializer(employees, many=True)

        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
