from rest_framework import routers
from apps.cost_category.views.cost_categoryviews import  CostCategoryViewSet
from apps.cost_category.views.monthly_cost_view import MonthlyCostCategoryViewSet

router = routers.DefaultRouter()

router.register("", MonthlyCostCategoryViewSet, basename="monthly_cost_category")
router.register("", CostCategoryViewSet, basename="cost_category")


urlpatterns =router.urls
