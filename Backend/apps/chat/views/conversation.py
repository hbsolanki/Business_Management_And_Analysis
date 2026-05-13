from django.db import transaction
from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet

from apps.base.views.base_view import BaseViewSet
from apps.chat.models import Conversation
from apps.chat.serializers.conversation import (ConversationGetOrCreateSerializer,
                                                ConversationReadSerializer)
from django.db.models import Q
from apps.chat.pagination import ChatCursorPagination
from rest_framework.decorators import action
from django.core.cache import cache
from apps.master.utils.cache import make_cache_key, invalidate_cache
from apps.base.permission.model_permissions import ModelPermissions
from apps.subscription.permissions import ChatFeaturePermission
from apps.base.serializers.base import BulkIdSerializer


class ConversationViewSet(BaseViewSet,ModelViewSet):
    permission_classes = [ModelPermissions,ChatFeaturePermission]
    pagination_class = ChatCursorPagination

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects
            .filter(Q(user1=user) | Q(user2=user))
            .select_related("user1", "user2")
        )


    def get_serializer_class(self):
        if self.action=="create":
            return ConversationGetOrCreateSerializer
        elif self.action=="bulk_delete":
            return BulkIdSerializer

        return ConversationReadSerializer

    def list(self, request, *args, **kwargs):
        cache_key = make_cache_key(request, "chat", "conversation_list", request.user)

        if cached := cache.get(cache_key):
            return Response(cached, status=status.HTTP_200_OK)

        queryset = self.filter_queryset(self.get_queryset().order_by("-updated_at", "-id"))
        page = self.paginate_queryset(queryset)
        conversations = page if page is not None else queryset

        # Bulk fetch Supplier/Customer context to avoid N+1 queries in serializer
        from apps.supplier.models import Supplier
        from apps.business.models import BusinessCustomer
        
        user_biz_id = request.user.business_id
        other_biz_ids = set()
        
        # Collect relevant business IDs from the current page
        for conv in conversations:
            # We use .business_id property which we should ideally prefetch roles for
            u1_biz_id = conv.user1.business_id
            u2_biz_id = conv.user2.business_id
            if u1_biz_id and u1_biz_id != user_biz_id:
                other_biz_ids.add(u1_biz_id)
            if u2_biz_id and u2_biz_id != user_biz_id:
                other_biz_ids.add(u2_biz_id)

        rel_map = {}
        if other_biz_ids:
            suppliers = Supplier.objects.filter(
                business_id=user_biz_id, 
                supplier_business_id__in=other_biz_ids
            ).values('supplier_business_id', 'name', 'supplier_business__name')
            
            customers = BusinessCustomer.objects.filter(
                business_id=user_biz_id, 
                customer_business_id__in=other_biz_ids
            ).values('customer_business_id', 'name', 'customer_business__name')

            for s in suppliers:
                rel_map[s['supplier_business_id']] = {
                    "type": "SUPPLIER", 
                    "name": s['name'],
                    "business_name": s['supplier_business__name']
                }
            for c in customers:
                rel_map[c['customer_business_id']] = {
                    "type": "CUSTOMER", 
                    "name": c['name'],
                    "business_name": c['customer_business__name']
                }

        serializer_context = self.get_serializer_context()
        serializer_context['rel_map'] = rel_map

        serializer = self.get_serializer(conversations, many=True, context=serializer_context)
        response = self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data, status=status.HTTP_200_OK)

        cache.set(cache_key, response.data, 20)
        return response

    @action(detail=False, methods=["post"],url_path="bulk-delete",url_name="bulk-delete")
    @transaction.atomic
    def bulk_delete(self,request):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]

        # Only delete if user is part of the conversation
        Conversation.objects.filter(
            id__in=ids
        ).filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).delete()

        invalidate_cache("chat", "conversation_list", self.request.user)

        return Response(
            {"detail": "Conversations deleted successfully", "ids": ids},
            status=status.HTTP_200_OK
        )
    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        query = request.query_params.get("search", "")
        if not query:
            return Response([])

        user = request.user
        results = []

        from apps.user.models import User
        from apps.employee.models import UserBusinessRole, UserRole, WorkType
        from django.db.models import Value, CharField, F
        from django.db.models.functions import Concat

        # 1. Permission checks
        roles = UserBusinessRole.objects.filter(user=user, business=user.business).values_list('role', flat=True)
        is_owner_or_manager = any(r in [UserRole.OWNER, UserRole.MANAGER] for r in roles)
        works = user.branch_works.values_list('work_type', flat=True)
        has_supplier_work = WorkType.SUPPLIER in works
        has_invoice_work = WorkType.INVOICE in works

        # 2. Internal Users Query
        q_internal = User.objects.filter(
            business_roles__business=user.business,
            is_active=True
        ).filter(
            Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(username__icontains=query)
        ).exclude(id=user.id).annotate(
            display_name=Concat('first_name', Value(' '), 'last_name'),
            type=Value('INTERNAL', output_field=CharField())
        ).values('id', 'display_name', 'username', 'type', 'profile_picture')

        # 3. Supplier Owners Query
        q_suppliers = User.objects.none()
        if is_owner_or_manager or has_supplier_work:
            q_suppliers = User.objects.filter(
                is_active=True,
                business_roles__role=UserRole.OWNER,
                business_roles__business__supplier_business__business=user.business,
                business_roles__business__supplier_business__same_platform=True,
                business_roles__business__supplier_business__name__icontains=query
            ).annotate(
                display_name=F('business_roles__business__supplier_business__name'),
                type=Value('SUPPLIER', output_field=CharField())
            ).values('id', 'display_name', 'username', 'type', 'profile_picture')

        # 4. Customer Owners Query
        q_customers = User.objects.none()
        if is_owner_or_manager or has_invoice_work or has_supplier_work:
            q_customers = User.objects.filter(
                is_active=True,
                business_roles__role=UserRole.OWNER,
                business_roles__business__customer_link__business=user.business,
                business_roles__business__customer_link__same_platform=True,
                business_roles__business__customer_link__name__icontains=query
            ).annotate(
                display_name=F('business_roles__business__customer_link__name'),
                type=Value('CUSTOMER', output_field=CharField())
            ).values('id', 'display_name', 'username', 'type', 'profile_picture')

        # 5. Combine and Return
        results = q_internal.union(q_suppliers, q_customers)[:20]
        return Response(results)
