from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from apps.base.serializers.base import BaseSerializer
from apps.base.serializers.gst import GSTSerializer
from apps.base.models import GST
from apps.business.models import Branch
from apps.cost.models import MonthlyCostCategory, CostCategory, MonthlyFinancialSummary
from apps.cost.serializers.cost_category import CostCategorySerializer


class MonthlyCostCategorySerializer(BaseSerializer):
    cost_category_id = serializers.PrimaryKeyRelatedField(
        queryset=CostCategory.objects.all(),
        source="cost_category",
        write_only=True
    )
    cost_category = CostCategorySerializer(read_only=True)
    gst_details = GSTSerializer(source="gst", read_only=True)
    
    # Flattened fields for frontend
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    gst_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    month = serializers.IntegerField(source="monthly_summary.month", read_only=True)
    year = serializers.IntegerField(source="monthly_summary.year", read_only=True)
    branch = serializers.IntegerField(source="monthly_summary.branch.id", read_only=True)

    class Meta:
        model = MonthlyCostCategory
        fields = [
            "id", "cost_category_id", "cost_category", "cost", 
            "gst_rate", "gst_amount", "total_cost", "gst_details",
            "month", "year", "branch"
        ]

    def validate_cost_category_id(self, value):
        request = self.context["request"]
        user = request.user
        if value.business_id != user.business_id:
            raise serializers.ValidationError("Cost category must belong to your business.")
        return value

    def validate(self, attrs):
        from apps.base.utils.tax import TaxCalculator
        cost = attrs.get("cost")
        cost_category = attrs.get("cost_category")
        
        gst_rate = attrs.get("gst_rate")
        if gst_rate is None and cost_category:
            gst_rate = cost_category.gst_rate
            attrs["gst_rate"] = gst_rate
            
        tax_data = TaxCalculator.calculate_gst(cost, gst_rate)
        attrs["tax_data"] = tax_data
        
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        today = timezone.now()

        month = self.context.get('month') or today.month
        year = self.context.get('year') or today.year
        branch = self.context.get('branch')

        summary, _ = MonthlyFinancialSummary.objects.get_or_create(
            business=user.business,
            branch=branch,
            year=year,
            month=month,
        )

        cost_category = validated_data['cost_category']
        tax_data = validated_data.pop("tax_data")
        gst_rate = validated_data.pop("gst_rate", 0)

        gst_obj = GST.objects.create(
            gst_rate=gst_rate,
            gst_amount=tax_data["tax_amount"],
            cgst_amount=tax_data["cgst_amount"],
            sgst_amount=tax_data["sgst_amount"],
            igst_amount=tax_data["igst_amount"],
            total_amount=tax_data["total_amount"]
        )

        existing_obj = MonthlyCostCategory.objects.filter(
            monthly_summary=summary,
            cost_category=cost_category,
            is_deleted=False
        ).first()

        if existing_obj:
            return self.update(existing_obj, {**validated_data, "gst": gst_obj})

        return MonthlyCostCategory.objects.create(
            monthly_summary=summary,
            created_by=user,
            updated_by=user,
            gst=gst_obj,
            **validated_data
        )

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        tax_data = validated_data.pop("tax_data", None)
        gst_rate = validated_data.pop("gst_rate", None)
        gst_obj = validated_data.pop("gst", None)

        if gst_obj:
            instance.gst = gst_obj
        elif tax_data and gst_rate is not None:
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

        if "cost" in validated_data and instance.cost != validated_data["cost"]:
            instance.cost = validated_data["cost"]
            instance.updated_by = user
            
        instance.save()
        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.gst:
            ret["gst_rate"] = instance.gst.gst_rate
            ret["gst_amount"] = instance.gst.gst_amount
            ret["total_cost"] = instance.gst.total_amount
        return ret


class MonthlyCostCategorySummarySerializer(serializers.Serializer):
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class MonthlyCostCategoryBulkSerializer(BaseSerializer):
    cost_category_items = MonthlyCostCategorySerializer(many=True, write_only=True)
    month = serializers.IntegerField(write_only=True, required=False)
    year = serializers.IntegerField(write_only=True, required=False)
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        write_only=True,
        required=False
    )

    class Meta:
        model = MonthlyCostCategory
        fields = ['cost_category_items', 'month', 'year', 'branch_id']

    def validate_cost_category_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one cost category item is required.")
        
        # Deduplicate by category id, last one wins
        return list({item["cost_category"].id: item for item in value}.values())

    def create(self, validated_data):
        items_data = validated_data.pop('cost_category_items')
        today = timezone.now()
        
        self.context['month'] = validated_data.get('month', today.month)
        self.context['year'] = validated_data.get('year', today.year)
        self.context['branch'] = validated_data.get('branch_id')

        with transaction.atomic():
            self.fields['cost_category_items'].create(items_data)

        return {"details": f"{len(items_data)} cost category items processed successfully."}
