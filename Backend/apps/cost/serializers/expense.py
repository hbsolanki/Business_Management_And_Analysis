from rest_framework import serializers
from decimal import Decimal
from apps.base.serializers.base import BaseSerializer
from apps.base.serializers.gst import GSTSerializer
from apps.base.models import GST
from apps.cost.models import Expense, CostCategory
from apps.business.models import Branch

class ExpenseSerializer(BaseSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=CostCategory.objects.all(), source="category", required=False, allow_null=True
    )
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source="branch", required=False, allow_null=True
    )
    gst_details = GSTSerializer(source="gst", read_only=True)
    
    # Flattened fields for frontend
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    gst_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta(BaseSerializer.Meta):
        model = Expense
        fields = BaseSerializer.Meta.fields + [
            "branch_id", "category_id", "title", "description",
            "amount", "gst_rate", "gst_amount", "total_amount", "itc_type", "gst_details", "date", "receipt_image"
        ]

    def validate(self, attrs):
        from apps.base.utils.tax import TaxCalculator
        
        amount = attrs.get("amount", Decimal("0.00"))
        gst_rate = attrs.get("gst_rate", Decimal("0.00"))
        
        tax_data = TaxCalculator.calculate_gst(amount, gst_rate)
        attrs["tax_data"] = tax_data
        
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        tax_data = validated_data.pop("tax_data", None)
        gst_rate = validated_data.pop("gst_rate", 0)

        gst_obj = GST.objects.create(
            gst_rate=gst_rate,
            gst_amount=tax_data["tax_amount"],
            cgst_amount=tax_data["cgst_amount"],
            sgst_amount=tax_data["sgst_amount"],
            igst_amount=tax_data["igst_amount"],
            total_amount=tax_data["total_amount"]
        )

        if request and hasattr(request, "user"):
            validated_data["business"] = request.user.business
        
        validated_data["gst"] = gst_obj
        instance = super().create(validated_data)
        
        try:
            from apps.gst_management.tasks import update_gst_summary_task
            update_gst_summary_task.delay(
                business_id=instance.business.id,
                month=instance.date.month,
                year=instance.date.year
            )
        except Exception as e:
            print(f"Error queueing GST summary task for expense: {e}")
            
        return instance

    def update(self, instance, validated_data):
        old_date = instance.date
        tax_data = validated_data.pop("tax_data", None)
        gst_rate = validated_data.pop("gst_rate", None)

        if tax_data and gst_rate is not None:
            if instance.gst:
                instance.gst.gst_rate = gst_rate
                instance.gst.gst_amount = tax_data["tax_amount"]
                instance.gst.cgst_amount = tax_data["cgst_amount"]
                instance.gst.sgst_amount = tax_data["sgst_amount"]
                instance.gst.igst_amount = tax_data["igst_amount"]
                instance.gst.total_amount = tax_data["total_amount"]
                instance.gst.save()
            else:
                instance.gst = GST.objects.create(
                    gst_rate=gst_rate,
                    gst_amount=tax_data["tax_amount"],
                    cgst_amount=tax_data["cgst_amount"],
                    sgst_amount=tax_data["sgst_amount"],
                    igst_amount=tax_data["igst_amount"],
                    total_amount=tax_data["total_amount"]
                )

        instance = super().update(instance, validated_data)
        
        try:
            from apps.gst_management.tasks import update_gst_summary_task
            update_gst_summary_task.delay(
                business_id=instance.business.id,
                month=instance.date.month,
                year=instance.date.year
            )
            if old_date and (old_date.month != instance.date.month or old_date.year != instance.date.year):
                update_gst_summary_task.delay(
                    business_id=instance.business.id,
                    month=old_date.month,
                    year=old_date.year
                )
        except Exception as e:
            print(f"Error queueing GST summary task for expense update: {e}")
            
        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.gst:
            ret["gst_rate"] = instance.gst.gst_rate
            ret["gst_amount"] = instance.gst.gst_amount
            ret["total_amount"] = instance.gst.total_amount
        return ret
