from django.contrib import admin
from apps.cost_category.models import CostCategory,MonthlyCostCategory,MonthlyFinancialSummary,MonthlyProductPerformance

admin.site.register(CostCategory)
admin.site.register(MonthlyCostCategory)
admin.site.register(MonthlyFinancialSummary)
admin.site.register(MonthlyProductPerformance)