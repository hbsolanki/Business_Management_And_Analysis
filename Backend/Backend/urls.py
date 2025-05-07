from django.contrib import admin
from django.urls import path, include
from django.middleware.csrf import get_token
from django.http import JsonResponse,HttpResponse
def home(request):
    return HttpResponse("Welcome to the home page!")

urlpatterns = [
    path('', home, name='home'),
    path("admin/", admin.site.urls),
    path("API/owner/", include("owner.urls")),
    path("API/owner/business/", include("business.urls")), 
    path("API/product/", include("product.urls")), 
    path("API/sale/", include("sale.urls")),
    path("API/employee/", include("employee.urls")), 
    path("API/inventory/", include("inventory.urls")), 
    path("API/ai/", include("AI.urls")), 
    path("API/analysis/<str:bid>/", include("analysis.urls")), 
]


