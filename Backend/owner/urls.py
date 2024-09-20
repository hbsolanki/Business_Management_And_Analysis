from owner import views
from django.urls import path

urlpatterns = [
    path("registration/",views.owner_registration ,name='registration'),
    path("login/",views.owner_login ,name='login'),
    path("home/",views.owner_home ,name='owner_home')

]

