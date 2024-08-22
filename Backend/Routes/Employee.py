from fastapi import APIRouter,FastAPI,Request
from fastapi.responses import RedirectResponse

Employee=APIRouter()

@Employee.post("/{bid}/employee/registration")
def employee_registration(request:Request):
    pass

@Employee.post("/{bid}/employee/login")
def employee_login(request:Request):
    pass
