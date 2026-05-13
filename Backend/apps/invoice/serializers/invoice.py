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
            "business", "branch", "branch_id", "customer", "sales_order", "invoice_items",
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
        
        # Check for duplicate products in invoice items
        items_data = attrs.get("invoice_items", [])
        product_ids = [item["product"].id for item in items_data if "product" in item]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError({"invoice_items": "Duplicate products found in the invoice items. Please consolidate quantities."})

        attrs["branch"] = branch
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user
        items_data = validated_data.pop('invoice_items')
        customer_data = validated_data.pop('customer')
        branch = validated_data.pop("branch")
        inventory = self.context.get('inventory') or Inventory.objects.filter(branch=branch).first()
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
        total_tax = Decimal("0.00")
        cgst_total = Decimal("0.00")
        sgst_total = Decimal("0.00")
        igst_total = Decimal("0.00")
        
        item_serializer = ProductInvoiceSerializer(
            many=True,
            context={**self.context, 'invoice': invoice, 'inventory': inventory}
        )
        items = item_serializer.create(items_data)

        for item in items:
            sub_total += item.base_price * item.quantity
            total_amount += item.selling_price * item.quantity
            total_tax += item.tax_amount
            cgst_total += item.cgst_amount
            sgst_total += item.sgst_amount
            igst_total += item.igst_amount

        # Finalize Invoice
        invoice.sub_total = sub_total
        invoice.total_amount = total_amount
        
        # Calculate Average GST Rate
        avg_gst_rate = (total_tax / sub_total * 100) if sub_total > 0 else 0

        # Create/Update GST for the entire invoice
        from apps.base.models import GST
        if invoice.gst:
            invoice.gst.gst_rate = avg_gst_rate
            invoice.gst.gst_amount = total_tax
            invoice.gst.cgst_amount = cgst_total
            invoice.gst.sgst_amount = sgst_total
            invoice.gst.igst_amount = igst_total
            invoice.gst.total_amount = total_amount
            invoice.gst.save()
        else:
            invoice.gst = GST.objects.create(
                gst_rate=avg_gst_rate,
                gst_amount=total_tax,
                cgst_amount=cgst_total,
                sgst_amount=sgst_total,
                igst_amount=igst_total,
                total_amount=total_amount
            )
        
        invoice.save()
        
        # Explicitly update GST Summary after invoice is fully saved via task
        try:
            from apps.gst_management.tasks import update_gst_summary_task
            now = timezone.now()
            update_gst_summary_task.delay(
                business_id=invoice.business.id,
                month=now.month,
                year=now.year
            )
        except Exception as e:
            # Log error but don't fail invoice creation
            pass
        
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user
        items_data = validated_data.pop('invoice_items', None)
        customer_data = validated_data.pop('customer', None)
        
        branch = validated_data.get("branch", instance.branch)
        inventory = self.context.get('inventory') or Inventory.objects.filter(branch=branch).first()

        # 1. Reverse old stock if items are being updated
        if items_data is not None:
            old_items = instance.invoice_items.all()
            inventory_items_reverse = [
                {"product_id": item.product.id, "quantity": item.quantity}
                for item in old_items if item.product
            ]
            
            if inventory_items_reverse:
                transaction_data_reverse = {
                    "action": "IN",
                    "branch_id": branch.id,
                    "description": f"REV: Invoice #{instance.id} Update | {instance.customer.name}",
                    "items": inventory_items_reverse
                }
                inv_serializer_rev = InventoryTransactionSerializer(
                    data=transaction_data_reverse, 
                    context={**self.context, 'inventory': inventory}
                )
                inv_serializer_rev.is_valid(raise_exception=True)
                inv_serializer_rev.save()

        # 2. Update Customer
        if customer_data:
            customer_serializer = BusinessCustomerSerializer(instance=instance.customer, data=customer_data, context={'request': request})
            customer_serializer.is_valid(raise_exception=True)
            customer_serializer.save()

        # 3. Update Invoice basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 4. Update Items and Apply New Stock
        if items_data is not None:
            # Delete old items
            instance.invoice_items.all().delete()
            
            # Create new items
            item_serializer = ProductInvoiceSerializer(
                many=True,
                context={**self.context, 'invoice': instance, 'inventory': inventory}
            )
            items = item_serializer.create(items_data)

            # Deduct new stock
            inventory_items_new = [
                {"product_id": item['product'].id, "quantity": item['quantity']}
                for item in items_data
            ]
            transaction_data_new = {
                "action": "OUT",
                "branch_id": branch.id,
                "description": f"Invoice #{instance.id} Update | {instance.customer.name}",
                "items": inventory_items_new
            }
            inv_serializer_new = InventoryTransactionSerializer(
                data=transaction_data_new, 
                context={**self.context, 'inventory': inventory}
            )
            inv_serializer_new.is_valid(raise_exception=True)
            inv_serializer_new.save()

            # Recalculate totals
            sub_total = Decimal("0.00")
            total_amount = Decimal("0.00")
            total_tax = Decimal("0.00")
            cgst_total = Decimal("0.00")
            sgst_total = Decimal("0.00")
            igst_total = Decimal("0.00")
            
            for item in items:
                sub_total += item.base_price * item.quantity
                total_amount += item.selling_price * item.quantity
                total_tax += item.tax_amount
                cgst_total += item.cgst_amount
                sgst_total += item.sgst_amount
                igst_total += item.igst_amount

            instance.sub_total = sub_total
            instance.total_amount = total_amount
            
            # Calculate and Update Average GST Rate
            avg_gst_rate = (total_tax / sub_total * 100) if sub_total > 0 else 0
            if instance.gst:
                instance.gst.gst_rate = avg_gst_rate
                instance.gst.gst_amount = total_tax
                instance.gst.cgst_amount = cgst_total
                instance.gst.sgst_amount = sgst_total
                instance.gst.igst_amount = igst_total
                instance.gst.total_amount = total_amount
                instance.gst.save()

            instance.save()

        # 5. Trigger GST summary update
        try:
            from apps.gst_management.tasks import update_gst_summary_task
            now = timezone.now()
            update_gst_summary_task.delay(
                business_id=instance.business.id,
                month=instance.created_at.month,
                year=instance.created_at.year
            )
        except Exception as e:
            pass

        return instance
