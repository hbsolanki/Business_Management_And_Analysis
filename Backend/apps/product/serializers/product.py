from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from apps.inventory.models import InventoryProduct
from django.db.models import Sum

from apps.base.serializers.base import BaseSerializer
from apps.inventory.models import Inventory
from apps.product.models import Product, ProductCategory
from apps.product.serializers.product_category import ProductCategorySerializer
from apps.employee.models import UserRole


class ProductSerializer(BaseSerializer):
    resource_limit_field = "max_products"
    product_category = ProductCategorySerializer(read_only=True)
    product_category_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.none(),
        write_only=True,
        required=False,
        allow_null=True,
        source="product_category",
    )
    stock_quantity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = BaseSerializer.Meta.fields + [
            "name",
            "base_price",
            "cost_price",
            "description",
            "product_category",
            "product_category_id",
            "sku",
            "input_gst_rate",
            "output_gst_rate",
            "stock_quantity",
            "net_profit",
            "low_stock_limit",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "stock_quantity",
            "net_profit",
        ]
        # validators scoped per-request in __init__

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and getattr(request, "user", None):
            self.fields[
                "product_category_id"
            ].queryset = ProductCategory.objects.filter(business=request.user.business)
            # add SKU uniqueness validator scoped to current business
            from rest_framework.validators import UniqueValidator

            sku_validators = [
                v
                for v in self.fields["sku"].validators
                if not isinstance(v, UniqueValidator)
            ]
            sku_validators.append(
                UniqueValidator(
                    queryset=Product.objects.filter(business=request.user.business),
                    message="Product SKU already exists in your business.",
                )
            )
            self.fields["sku"].validators = sku_validators

    def get_stock_quantity(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        user = request.user
        branch_id = request.query_params.get("branch")
        if request.user.role_name == UserRole.OWNER:
            if branch_id:
                inventories = Inventory.objects.filter(
                    business=request.user.business, branch_id=branch_id
                )
            else:
                inventories = Inventory.objects.filter(business=request.user.business)
        else:
            assigned_branches = request.user.branches
            if branch_id:
                if assigned_branches.filter(id=branch_id).exists():
                    inventories = Inventory.objects.filter(
                        business=request.user.business, branch_id=branch_id
                    )
                else:
                    return 0
            else:
                inventories = Inventory.objects.filter(
                    business=request.user.business, branch__in=assigned_branches
                )
        total_stock = (
            InventoryProduct.objects.filter(
                inventory__in=inventories, product=obj
            ).aggregate(total=Sum("stock_quantity"))["total"]
            or 0
        )
        return total_stock

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["business"] = request.user.business
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
