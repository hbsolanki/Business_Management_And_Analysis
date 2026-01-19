from rest_framework.routers import DefaultRouter
from apps.analytics.views import product_view, business_view

router = DefaultRouter()
router.register("", product_view.AnalysisProductViewSet, basename="analysis")
router.register("", business_view.AnalysisBusinessViewSet, basename="business")


urlpatterns = router.urls
