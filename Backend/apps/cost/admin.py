from django.contrib import admin
from apps.cost.models import MonthlyFinancialSummary, MonthlyProductPerformance,CostCategory,MonthlyCostCategory

admin.site.register(MonthlyFinancialSummary)
admin.site.register(MonthlyProductPerformance)
admin.site.register(CostCategory)
admin.site.register(MonthlyCostCategory)

