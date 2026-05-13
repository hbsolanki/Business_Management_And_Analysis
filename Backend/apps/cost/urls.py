from rest_framework import routers
from apps.cost.views import MonthlyCostCategoryViewSet, CostCategoryViewSet, CostMonthViewSet, ExpenseViewSet

router = routers.DefaultRouter()
router.register(r"category/month", MonthlyCostCategoryViewSet, basename="monthly-cost-category")
router.register(r"category", CostCategoryViewSet, basename="cost-category")
router.register(r"month", CostMonthViewSet, basename="cost")
router.register(r"expenses", ExpenseViewSet, basename="expense")

urlpatterns = router.urls