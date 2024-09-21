from analysis import views
from django.urls import path

urlpatterns = [
    path("turnover/",views.turnover,name="turnover"),
    path("turnover/tenmonth",views.turnover_tenmonth,name="turnover_tenmonth"),
    path("netprofit/tenmonth",views.netprofit_tenmonth,name="netprofit_tenmonth"),
    path("product/stock/",views.product_stock,name="product_stock"),
    path("product/details",views.product_stock,name="product_stock"),

]

