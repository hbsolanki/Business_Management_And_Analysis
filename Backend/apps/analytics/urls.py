from rest_framework.routers import DefaultRouter
from apps.analytics.views import product_view, month_financial_summary, customer, report
from django.urls import path, include


router = DefaultRouter()
router.register("product", product_view.AnalysisProductViewSet, basename="analysis")
router.register("month", month_financial_summary.MonthFinancialSummaryViewSet, basename="month_financial_summary")
router.register("customer", customer.CustomerViewSet, basename="customer")
router.register("report", report.ReportViewSet, basename="report")


# urlpatterns = router.urls

urlpatterns=[
    path("",include(router.urls)),
]