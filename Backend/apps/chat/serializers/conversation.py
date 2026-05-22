from apps.master.serializers.user import UserBasicDetailsSerializer
from rest_framework import serializers
from apps.user.models import User
from apps.chat.models import Conversation


class ConversationGetOrCreateSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'user_id']
        read_only_fields = ['id']

    def validate_user_id(self, value):
        request = self.context["request"]
        user = request.user

        if value == user.id:
            raise serializers.ValidationError("Cannot chat with yourself")

        try:
            other_user = User.objects.get(id=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found or User is Inactive")

        from apps.employee.models import UserRole, WorkType
        
        # 1. Internal Check (Same Business)
        if other_user.business_roles.filter(business=user.business).exists():
            self.other_user = other_user
            return value

        # 2. Permission Check for current user
        roles = user.business_roles.filter(business=user.business).values_list('role', flat=True)
        is_owner_or_manager = any(r in [UserRole.OWNER, UserRole.MANAGER] for r in roles)
        works = user.branch_works.values_list('work_type', flat=True)
        has_supplier_work = WorkType.SUPPLIER in works
        has_invoice_work = WorkType.INVOICE in works

        # 3. Supplier Check
        is_supplier_owner = other_user.business_roles.filter(
            role=UserRole.OWNER,
            business__supplier_business__business=user.business,
            business__supplier_business__same_platform=True
        ).exists()

        if is_supplier_owner:
            if is_owner_or_manager or has_supplier_work:
                self.other_user = other_user
                return value
            raise serializers.ValidationError("You do not have permission to chat with suppliers.")

        # 4. Customer Check
        is_customer_owner = other_user.business_roles.filter(
            role=UserRole.OWNER,
            business__customer_link__business=user.business,
            business__customer_link__same_platform=True
        ).exists()

        if is_customer_owner:
            if is_owner_or_manager or has_invoice_work or has_supplier_work:
                self.other_user = other_user
                return value
            raise serializers.ValidationError("You do not have permission to chat with customers.")

        raise serializers.ValidationError("You do not have permission to chat with this user.")

    def create(self, validated_data):
        request = self.context["request"]
        user1, user2 = request.user, self.other_user

        if user1.id > user2.id:
            user1, user2 = user2, user1

        conversation, created = Conversation.objects.get_or_create(
            user1=user1,
            user2=user2
        )

        return conversation


class ConversationReadSerializer(serializers.ModelSerializer):
    user1 = UserBasicDetailsSerializer(read_only=True)
    user2 = UserBasicDetailsSerializer(read_only=True)
    other_user_context = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'created_at', 'user1', 'user2', 'other_user_context']

    def get_other_user_context(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return None
        
        other_user = obj.user2 if obj.user1 == request.user else obj.user1
        other_biz_id = getattr(other_user, 'business_id', None)
        
        # 1. Use pre-fetched data from context (highly efficient for lists)
        rel_map = self.context.get('rel_map')
        if rel_map is not None:
            return rel_map.get(other_biz_id, {"type": "INTERNAL", "name": None})

        # 2. Fallback for individual lookups (retrieve/create)
        if not other_biz_id or not hasattr(request.user, 'business'):
            return {"type": "INTERNAL", "name": None}

        from apps.supplier.models import Supplier
        supplier = Supplier.objects.filter(
            business=request.user.business, 
            supplier_business_id=other_biz_id
        ).select_related('supplier_business').first()
        if supplier:
            return {
                "type": "SUPPLIER", 
                "name": supplier.name,
                "business_name": supplier.supplier_business.name if supplier.supplier_business else None
            }
             
        from apps.business.models import BusinessCustomer
        customer = BusinessCustomer.objects.filter(
            business=request.user.business, 
            customer_business_id=other_biz_id
        ).select_related('customer_business').first()
        if customer:
            return {
                "type": "CUSTOMER", 
                "name": customer.name,
                "business_name": customer.customer_business.name if customer.customer_business else None
            }
             
        return {"type": "INTERNAL", "name": None}
