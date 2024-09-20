from django.contrib import admin
from django.urls import path, include
from django.middleware.csrf import get_token
from django.http import JsonResponse

urlpatterns = [
    path("admin/", admin.site.urls),
    path("API/owner/", include("owner.urls")),
    path("API/owner/business/", include("business.urls")), 
    path("API/product/", include("product.urls")), 
    path("API/sale/", include("sale.urls")),
    path("API/employee/", include("employee.urls")), 
    path("API/inventory/", include("inventory.urls")), 
]
