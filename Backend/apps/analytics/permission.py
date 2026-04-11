from rest_framework.permissions import BasePermission


class CanViewCustomerAnalytics(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("analytics.view_analytics_customer")

class CanViewMonthFinancialAnalytics(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("analytics.view_analytics_month_financial_summary")

class CanViewProductAnalytics(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("analytics.view_analytics_product")
