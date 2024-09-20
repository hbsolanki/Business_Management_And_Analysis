from product import views
from django.urls import path


urlpatterns = [
    path("<str:pid>/",views.productInfo,name="saleinfo"),
    path("<str:pid>/new/",views.add_product,name="add_product"),
    path("<str:pid>/edit/",views.edit_product,name="edit_product")

]

