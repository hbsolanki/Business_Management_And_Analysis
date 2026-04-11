from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from apps.base.serializers.base import BaseSerializer
from apps.invoice.models import Invoice
from apps.business.serializers.customer import BusinessCustomerSerializer
from apps.invoice.serializers.product_invoice import ProductInvoiceSerializer
from apps.inventory.serializers.inventory_transaction import InventoryTransactionSerializer
from apps.invoice.tasks import send_invoice_email
from apps.inventory.models import Inventory, InventoryTransaction
from apps.business.models import Branch


class InvoiceSerializer(BaseSerializer):
    customer = BusinessCustomerSerializer()
    invoice_items = ProductInvoiceSerializer(many=True, allow_empty=False, required=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    branch_id = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), write_only=True, required=True)

    class Meta:
        model = Invoice
        fields = BaseSerializer.Meta.fields + [
            "business", "branch", "branch_id", "customer", "invoice_items",
            "payment_mode", "total_amount", "sub_total", 
            "payment_date", "transaction_id", "created_by_name"
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "business", "branch", "total_amount", "sub_total", "created_by_name"
        ]


    def validate_branch_id(self, value):
        return super().validate_branch_id(value)

    def validate(self, attrs):
        user      = self.context["request"].user
        branch    = self._validated_branch
        inventory = Inventory.objects.filter(business=user.business, branch=branch).first()
        if not inventory:
            raise serializers.ValidationError({"branch_id": "Inventory not found for this branch."})
        attrs["branch"] = branch
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user
        items_data = validated_data.pop('invoice_items')
        customer_data = validated_data.pop('customer')
        branch = validated_data.pop("branch")
        inventory = self.context.get('inventory') 
        validated_data.pop("branch_id", None)

        # Save Customer
        customer_serializer = BusinessCustomerSerializer(data=customer_data, context={'request': request})
        customer_serializer.is_valid(raise_exception=True)
        customer = customer_serializer.save()

        # Save Invoice
        invoice = Invoice.objects.create(
            business=user.business,
            branch=branch,
            customer=customer,
            created_by=user,
            sub_total=Decimal("0.00"),
            total_amount=Decimal("0.00"),
            **validated_data
        )

        # Create Inventory Transaction via Serializer
        # This handles both the record and the actual stock deduction
        inventory_items = [
            {"product_id": item['product'].id, "quantity": item['quantity']}
            for item in items_data
        ]
        
        transaction_data = {
            "action": "OUT",
            "branch_id": branch.id,
            "description": f"Invoice #{invoice.id} | {customer.name}",
            "items": inventory_items
        }
        
        inventory_serializer = InventoryTransactionSerializer(
            data=transaction_data, 
            context={**self.context, 'inventory': inventory}
        )
        inventory_serializer.is_valid(raise_exception=True)
        inventory_serializer.save()

        # Save Invoice Items (ProductInvoice records)
        sub_total = Decimal("0.00")
        total_amount = Decimal("0.00")
        
        item_serializer = ProductInvoiceSerializer(
            many=True,
            context={**self.context, 'invoice': invoice, 'inventory': inventory}
        )
        items = item_serializer.create(items_data)

        for item in items:
            sub_total += item.base_price * item.quantity
            total_amount += item.selling_price * item.quantity

        # Finalize Invoice
        invoice.sub_total = sub_total
        invoice.total_amount = total_amount
        update_fields = ["sub_total", "total_amount"]
        
        if invoice.payment_mode == "CASH":
            invoice.payment_date = timezone.now()
            update_fields.append("payment_date")
            if invoice.customer.email:
                send_invoice_email.delay(to_email=invoice.customer.email, invoice_id=invoice.id)

        invoice.save(update_fields=update_fields)
        return invoice
