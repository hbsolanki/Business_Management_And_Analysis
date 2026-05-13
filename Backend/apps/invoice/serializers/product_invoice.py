from rest_framework import serializers
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from apps.product.models import Product
from apps.inventory.models import InventoryProduct, InventoryTransactionItem
from apps.invoice.models import ProductInvoice

class ProductMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "base_price"]

class ProductInvoiceSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True, source='product'
    )
    product = ProductMinimalSerializer(read_only=True)

    class Meta:
        model = ProductInvoice
        fields = ["id", "product_id", "product", "quantity", "base_price", "selling_price"]
        read_only_fields = ["id", "product", "base_price", "selling_price"]

    def validate_product_id(self, value):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or request.user is None:
            return value
        user = request.user
        if value.business != user.business or not value.is_active:
            raise ValidationError(f"Invalid product ID or product is inactive {value.id}")
        return value

    def validate(self, attrs):
        product = attrs.get('product')
        quantity = attrs.get('quantity')
        inventory = self.context.get('inventory')
        
        if not inventory:
            raise ValidationError({"detail": "Inventory context missing for this branch."})

        inventory_product = InventoryProduct.objects.filter(
            inventory=inventory, product=product
        ).first()
        
        if not inventory_product:
            raise ValidationError({"product_id": f"Product '{product.name}' is not registered in this branch's inventory."})
        
        if quantity > inventory_product.stock_quantity:
            raise ValidationError({"quantity": f"Insufficient stock for '{product.name}'. Available: {inventory_product.stock_quantity}"})

        return attrs

    def create(self, validated_data):
        from apps.base.utils.tax import TaxCalculator
        from apps.base.models import GST
        invoice = self.context.get('invoice')
        product = validated_data.pop('product')
        quantity = validated_data.get('quantity')
        
        # Price Calculations
        base_price = product.base_price
        total_tax_rate = product.output_gst_rate
        
        # Centralized calculation
        tax_data = TaxCalculator.calculate_gst(base_price * quantity, total_tax_rate)
        
        return ProductInvoice.objects.create(
            invoice=invoice,
            product=product,
            base_price=base_price,
            selling_price=tax_data["total_amount"] / quantity, # selling price per unit
            **validated_data
        )
