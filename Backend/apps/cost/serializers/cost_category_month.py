from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from apps.base.serializers.base import BaseSerializer
from apps.business.models import Branch
from apps.cost.models import MonthlyCostCategory, CostCategory, MonthlyFinancialSummary
from apps.cost.serializers.cost_category import CostCategorySerializer


class MonthlyCostCategorySummarySerializer(serializers.Serializer):
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class MonthlyCostCategorySerializer(BaseSerializer):
    cost_category_id = serializers.PrimaryKeyRelatedField(
        queryset=CostCategory.objects.all(),
        source="cost_category",
        write_only=True
    )
    cost_category = CostCategorySerializer(read_only=True)
    month = serializers.IntegerField(source="monthly_summary.month", read_only=True)
    year = serializers.IntegerField(source="monthly_summary.year", read_only=True)
    branch = serializers.IntegerField(source="monthly_summary.branch.id", read_only=True)

    class Meta:
        model = MonthlyCostCategory
        fields = ["id", "cost_category_id", "cost_category", "cost", "month", "year", "branch"]


    def validate_cost_category_id(self, value):
        user = self.context["request"].user
        if value.business_id != user.business.id:
            raise serializers.ValidationError("Cost category must belong to your business.")
        return value

    def validate_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost cannot be negative.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
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
        
        existing_obj = MonthlyCostCategory.objects.filter(
            monthly_summary=summary,
            cost_category=cost_category,
            is_deleted=False
        ).first()

        if existing_obj:
            return self.update(existing_obj, validated_data)

        return MonthlyCostCategory.objects.create(
            monthly_summary=summary,
            created_by=user,
            updated_by=user,
            **validated_data
        )

    def update(self, instance, validated_data):
        user = self.context["request"].user
        
        if instance.cost != validated_data["cost"]:
            instance.cost = validated_data["cost"]
            instance.updated_by = user
            instance.save()
            
        return instance


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

    def validate_branch_id(self, value):
        user = self.context["request"].user
        if value.business_id != user.business.id:
            raise serializers.ValidationError("Branch must belong to your business.")
        return value

    def validate_cost_category_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one cost category item is required.")
        
        unique_items = {item["cost_category"].id: item for item in value}
        return list(unique_items.values())

    def create(self, validated_data):
        items_data = validated_data.pop('cost_category_items')
        today = timezone.now()
        
        # Update shared context so child serializers can use it natively during creation
        self.context['month'] = validated_data.get('month', today.month)
        self.context['year'] = validated_data.get('year', today.year)
        self.context['branch'] = validated_data.get('branch_id')

        with transaction.atomic():
            self.fields['cost_category_items'].create(items_data)

        return {"details": f"{len(items_data)} cost category items processed successfully."}
