from owner import views
from django.urls import path
from sale import views

urlpatterns = [
    path("<str:sid>/",views.saleInfo,name="saleinfo"),
    path("<str:sid>/new/",views.new_sale,name="new_sale")
]

