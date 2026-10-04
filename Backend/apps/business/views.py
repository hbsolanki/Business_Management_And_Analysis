from django.db import transaction
from django.core.cache import cache
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework import status
from rest_framework.decorators import action
from apps.base.permission.model_permissions import ModelPermissions
from apps.base.views.base_view import BaseViewSet
from apps.user.models import User
from apps.user.serializers.user import UserSerializer
from apps.business.models import Business, Branch, BusinessCustomer, BusinessGSTProfile
from apps.business.serializers.business import BusinessSerializer, BusinessBasicDetailsSerializer
from apps.business.serializers.gst_profile import BusinessGSTProfileSerializer
from apps.business.serializers.branch import BranchSerializer
from apps.business.serializers.customer import BusinessCustomerSerializer
from apps.employee.serializers.manager import ManagerSerializer
from apps.employee.serializers.employee import EmployeeSerializer
from apps.subscription.decorators.limits import limit_required
from apps.subscription.utils.usage import staff_usage_subscription
from apps.subscription.utils.entitlements import get_active_subscription, increment_usage
from apps.business.filters import BranchFilter, BusinessCustomerFilter, BusinessFilter


from apps.activity_log.mixins import ActivityLogMixin
from apps.activity_log.models import ActivityLog

class BusinessViewSet(ActivityLogMixin, BaseViewSet, ModelViewSet):
    activity_module = ActivityLog.Module.BUSINESS
    queryset = Business.objects.all()
    filterset_class = BusinessFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(id=self.request.user.business_id)

    def get_object(self):
        obj = super().get_object()

        if obj.id != self.request.user.business_id:
            raise NotFound("Business not found")

        return obj

    def get_permissions(self):
        if self.action in ["manager", "employee"]:
            return [p() for p in self.permission_classes if p != ModelPermissions]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "manager":
            return ManagerSerializer

        if self.action == "employee":
            return EmployeeSerializer

        if self.action== "list":
            return BusinessBasicDetailsSerializer

        return BusinessSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            instance = super().perform_create(serializer)
            
            # Run Business-specific logic if the instance is a Business
            if isinstance(instance, Business):
                request = self.request
                user = request.user
                from apps.employee.models import UserBusinessRole, UserRole
                # Instead of get_or_create, fetch the owner role (which currently has no business attached)
                owner_role = UserBusinessRole.objects.filter(user=user, role=UserRole.OWNER, business__isnull=True).first()
                if owner_role:
                    owner_role.business = instance
                    owner_role.save(update_fields=["business"])
                else:
                    UserBusinessRole.objects.create(
                        user=user, 
                        business=instance, 
                        role=UserRole.OWNER
                    )
                cache.delete(f"user:{user.id}")
            return instance

    def perform_update(self, serializer):
        super().perform_update(serializer)
        # Invalidate only the current user's cache
        cache.delete(f"user:{self.request.user.id}")

    def perform_destroy(self, instance):
        # Invalidate only the current user's cache
        cache.delete(f"user:{self.request.user.id}")
        super().perform_destroy(instance)


    @action(detail=False, methods=["POST"], url_path="manager")
    @limit_required("max_staff", resource_model=User)
    @transaction.atomic
    def manager(self, request):
        if not request.user.has_perm('employee.can_create_manager'):
            return Response(
                {"error": "You do not have permission to create a manager."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            self.activity_module = ActivityLog.Module.USER
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = self.perform_create(serializer)
            staff_usage_subscription(business=request.user.business)
            output_serializer = UserSerializer(user, context=self.get_serializer_context())
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["POST"], url_path="employee")
    @limit_required("max_staff", resource_model=User)
    @transaction.atomic
    def employee(self, request):
        if not request.user.has_perm('employee.can_create_employee'):
            return Response(
                {"error": "You do not have permission to create an employee."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            self.activity_module = ActivityLog.Module.USER
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = self.perform_create(serializer)
            staff_usage_subscription(business=request.user.business)
            output_serializer = UserSerializer(user, context=self.get_serializer_context())
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BranchViewSet(BaseViewSet, ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    filterset_class = BranchFilter

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Branch.objects.all().order_by("-is_active", "-is_default", "created_at")
        # BaseViewSet handles business + branch isolation, we only add ordering
        return super().get_queryset().order_by("-is_active", "-is_default", "created_at")

    def list(self, request, *args, **kwargs):
        business_id = request.user.business_id
        
        # If there are query parameters (filters), skip cache
        if request.query_params:
            return super().list(request, *args, **kwargs)

        cache_key = f"business:{business_id}:branches"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=3600)
        return Response(response.data, status=status.HTTP_200_OK)

    @limit_required("max_branches", resource_model=Branch)
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        subscription = get_active_subscription(request.user.business)
        if subscription:
            increment_usage(subscription, "branches_created")
            cache.delete(f"subscription:usage:{subscription.id}")
        cache.delete(f"business:{request.user.business_id}:branches")
        return response

    def perform_update(self, serializer):
        super().perform_update(serializer)
        cache.delete(f"business:{self.request.user.business_id}:branches")
        cache.delete(f"user:{self.request.user.id}")

    def perform_destroy(self, instance):
        cache.delete(f"business:{self.request.user.business_id}:branches")
        cache.delete(f"user:{self.request.user.id}")
        super().perform_destroy(instance)


class BusinessCustomerViewSet(BaseViewSet, ModelViewSet):
    serializer_class = BusinessCustomerSerializer
    filterset_class = BusinessCustomerFilter
    queryset = BusinessCustomer.objects.all()

    def get_queryset(self):
        # BaseViewSet.apply_business_filter handles business isolation
        return super().get_queryset()

class BusinessGSTProfileViewSet(BaseViewSet, ModelViewSet):
    """
    Dedicated API for Business GST Compliance and Profile Management.
    """
    queryset = BusinessGSTProfile.objects.all()
    serializer_class = BusinessGSTProfileSerializer
    pagination_class = None

    def get_queryset(self):
        # BaseViewSet.apply_business_filter handles business isolation
        return super().get_queryset()

    def perform_create(self, serializer):
        super().perform_create(serializer)
        cache.delete(f"user:{self.request.user.id}")

    def perform_update(self, serializer):
        super().perform_update(serializer)
        cache.delete(f"user:{self.request.user.id}")
