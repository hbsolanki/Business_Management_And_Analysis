from inventory import views
from django.urls import path


urlpatterns = [
    path("<str:iid>/",views.inventoryInfo,name="inventoryinfo")

]

