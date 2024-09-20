from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from bson import ObjectId
from Auth.Auth import get_current_user
# Create your views here.


def employeeInfo(request,eid):
    Employees=conn.Visionary.Employees.find_one({"_id": ObjectId(eid)})
    Employees["_id"]=str(Employees["_id"])

    for i in range(len(Employees["allEmployee"])):
        Employees["allEmployee"][i]=conn.Visionary.Employee.find_one({"_id": Employees["allEmployee"][i]})
        Employees["allEmployee"][i]["_id"]=str(Employees["allEmployee"][i]["_id"])

  

    return JsonResponse(Employees)


def new_employee(request,eid):
    auth_header = request.headers.get('Authorization')
    email=get_current_user(auth_header)

    import json
    Employees=conn.Visionary.Employees.find_one({"_id":ObjectId(eid)})
    data = json.loads(request.body)
    name = data.get('name')
    email=data.get('email')
    salary=data.get('salary')
    address=data.get('address')
    mobile=data.get('mobile',0)
    description=data.get('description',"")
    d={
            "name": name,
            "email": email,
            "salary": salary,
            "address": address,
            "mobile": mobile,
            "description": description ,
        }
    employee=conn.Visionary.Employee.insert_one(d)
    Employees["allEmployee"].append(employee.inserted_id)
    conn.Visionary.Employees.update_one({"_id":ObjectId(eid)},{"$set":{"allEmployee":Employees["allEmployee"]}})
    return JsonResponse({'status': 'success', 'message': 'Registration successful'})