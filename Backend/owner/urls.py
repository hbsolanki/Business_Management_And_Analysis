from owner import views
from django.urls import path

urlpatterns = [
    path("registration/",views.owner_registration ,name='registration'),
    path("login/",views.owner_login ,name='login'),
    path("home/",views.owner_home ,name='owner_home'),
    path("edit/",views.owner_edit ,name='owner_edit'),
    # path("forgot-password/",views.forgot_password ,name='forgot_password')

    
]

