from django.db import models


class AnalyticsPermission(models.Model):
    class Meta:
        managed = False  # no database table created
        default_permissions = ()
        permissions = [
            ("view_analytics_customer", "Can View Customer Analytics"),
            ("view_analytics_month_financial_summary", "Can View Month Financial Summary Analytics"),
            ("view_analytics_product", "Can View Product Analytics"),
        ]
