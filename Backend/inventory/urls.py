from inventory import views
from django.urls import path


urlpatterns = [
    path("<str:iid>/",views.inventoryInfo,name="inventoryinfo"),
    path("<str:iid>/new/",views.new_inventory,name="new_inventory")

]

