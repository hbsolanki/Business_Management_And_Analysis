from product import views
from django.urls import path


urlpatterns = [
    path("<str:pid>/",views.productInfo,name="saleinfo"),
    path("<str:pid>/new/",views.add_product,name="add_product"),
    path("one/<str:pid>/",views.product_one,name="product_one"),
    path("one/<str:pid>/edit/",views.product_one_edit,name="product_one_edit"),
     path("<str:pid>/<str:opid>/delete/",views.delete_product,name="delete_product")

]

