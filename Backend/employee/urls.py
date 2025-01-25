from employee import views
from django.urls import path

urlpatterns = [
    path("<str:eid>/",views.employeeInfo,name="employeeinfo"),
    path("<str:eid>/new/",views.new_employee,name="new_employee"),
    path("one/<str:eid>/",views.employee_one,name="employee_one"),
    path("<str:oeid>/edit/",views.employee_one_edit,name="employee_one_edit"),
    path("<str:eid>/<str:oeid>/delete/",views.employee_delete,name="employee_delete"),
    path("login/page/",views.login_employee,name="login_employee"),
    path("data/one/",views.employee_data,name="employee_data"),


]

