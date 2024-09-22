from analysis import views
from django.urls import path

urlpatterns = [
    path("turnover/",views.turnover,name="turnover"),
    path("turnover/tenmonth/",views.turnover_tenmonth,name="turnover_tenmonth"),
    path("netprofit/tenmonth/",views.netprofit_tenmonth,name="netprofit_tenmonth"),
    path("product/stock/",views.product_stock,name="product_stock"),
    path("product/details/",views.product_details,name="product_details"),
    path("product/Manufacturing/per/month/",views.Product_Manufacturing_Per_Month,name="Product_Manufacturing_Per_Month"),
    path("product/sold/per/month/",views.Product_Sold_Per_Month,name="Product_Sold_Per_Month"),

]

