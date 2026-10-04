from rest_framework.routers import DefaultRouter
from apps.subscription.views.subscription_plan import SubscriptionPlanViewSet

router = DefaultRouter()
router.register("", SubscriptionPlanViewSet, basename="subscription_plan")

urlpatterns = router.urls

