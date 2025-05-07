from . import views
from django.urls import path

urlpatterns=[
    path("turnover/",views.turnover,name="turnover"),
    path("turnover_last_months/",views.turnover_last_months,name="turnover_last_months"),
    path("netprofit_last_months/",views.netprofit_last_months,name="netprofit_last_months"),
    path("product_stats/",views.product_stats,name="product_stats"),
    path("product_inventory_last_month/",views.product_inventory_last_month,name="product_inventory_last_month"),
    path("product_sold_last_month/",views.product_sold_last_month,name="product_sold_last_month"),
    path("product_stock/",views.product_stock,name="product_stock"),
]