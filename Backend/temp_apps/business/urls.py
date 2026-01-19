from django.urls import path
from temp_apps.business import views

urlpatterns = [
    path("new/", views.business_registration, name="business_registration"),
    path("data/<str:id>/", views.business_data, name="business_data"),
    path("edit/<str:id>/", views.business_edit, name="business_edit"),
]
