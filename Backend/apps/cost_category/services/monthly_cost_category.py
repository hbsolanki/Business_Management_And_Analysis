from datetime import datetime
from django.db import transaction
from apps.cost_category.models import MonthlyCostCategory, MonthlyFinancialSummary

@transaction.atomic
def monthly_cost_category_create(cost_category_items, user):
    today = datetime.today()

    monthly_financial_summary, _ = MonthlyFinancialSummary.objects.get_or_create(
        business=user.business,
        year=today.year,
        month=today.month,
        defaults={"created_by": user},
    )

    for item in cost_category_items:
        MonthlyCostCategory.objects.create(
            cost_category=item["cost_category"],
            cost=item["cost"],
            monthly_summary=monthly_financial_summary,
        )

    return True
