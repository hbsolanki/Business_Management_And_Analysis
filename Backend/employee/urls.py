from employee import views
from django.urls import path

urlpatterns = [
    path("<str:eid>/",views.employeeInfo,name="employeeinfo"),
    path("<str:eid>/new/",views.new_employee,name="new_employee")

]

