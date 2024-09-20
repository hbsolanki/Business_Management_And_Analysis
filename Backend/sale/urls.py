from owner import views
from django.urls import path
from sale import views

urlpatterns = [
    path("<str:sid>/",views.saleInfo,name="saleinfo")
]

