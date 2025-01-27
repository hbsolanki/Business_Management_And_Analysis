from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from bson import ObjectId
import json
from Auth.Auth import ACCESS_TOKEN_EXPIRE_MINUTES,create_access_token,get_current_user
from datetime import timedelta
from rest_framework import status
from rest_framework.decorators import api_view

import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import os
from dotenv import load_dotenv
load_dotenv()

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("CLOUD_API_KEY"),
    api_secret=os.getenv("CLOUD_API_SECRET")
)


# Create your views here.


def employeeInfo(request,eid):
    Employees=conn.Visionary.Employees.find_one({"_id": ObjectId(eid)})
    Employees["_id"]=str(Employees["_id"])
    Employees["pid"]=str(Employees["pid"])
    Employees["sid"]=str(Employees["sid"])
    Employees["iid"]=str(Employees["iid"])

    for i in range(len(Employees["allEmployee"])):
        Employees["allEmployee"][i]=conn.Visionary.Employee.find_one({"_id": Employees["allEmployee"][i]})
        Employees["allEmployee"][i]["_id"]=str(Employees["allEmployee"][i]["_id"])


    return JsonResponse(Employees)


def new_employee(request,eid):
    # auth_header = request.headers.get('Authorization')
    # email=get_current_user(auth_header)

    import json
    Employees=conn.Visionary.Employees.find_one({"_id":ObjectId(eid)})
    data = json.loads(request.body)
    name = data.get('name')
    email=data.get('email')
    salary=data.get('salary')
    address=data.get('address')
    mobile=data.get('mobile',0)
    workpage=data.get("workpage","")
    password=data.get("password","")
    description=data.get('description',"")
    image_url="https://res.cloudinary.com/ddm8umfu7/image/upload/v1726760053/Profile_picture_q4tcgj.webp"
    
    if not image_url :
        image_url=""
    d={
            "name": name,
            "email": email,
            "salary": salary,
            "address": address,
            "mobile": mobile,
            "description": description ,
            "workpage":workpage,
            "password":password,
            "image_url":image_url

        }
    
    employee=conn.Visionary.Employee.insert_one(d)
    Employees["allEmployee"].append(employee.inserted_id)
    conn.Visionary.Employees.update_one({"_id":ObjectId(eid)},{"$set":{"allEmployee":Employees["allEmployee"]}})
    return JsonResponse({'status': 'success', 'message': 'Registration successful'})


def login_employee(request):

    data = json.loads(request.body)
    email = data.get('email')
    password = data.get('password')
    Employee=conn.Visionary.Employee.find_one({"email":email,"password":password})
   
    if Employee is not None:
        access_token_expires=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": email,"type":"emp"},
            expires_delta=access_token_expires
        )
        return JsonResponse({'token': access_token,"oeid":str(Employee["_id"])}, status=status.HTTP_200_OK)
    else:
        return JsonResponse({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    

def employee_one(request,eid):
    Employee=conn.Visionary.Employee.find_one({"_id":ObjectId(eid)})

    Employee["_id"]=str(Employee["_id"])
    return JsonResponse(Employee)


def employee_one_edit(request, oeid):
    if request.method == 'POST':
        body_data = {}
        image_url = None

        body_data.update(request.POST.dict())

        if 'image' in request.FILES:
            image = request.FILES['image']  
            print(image)
   
            try:
                upload_result = cloudinary.uploader.upload(image)
                image_url = upload_result.get("secure_url")
                print(image_url)
            except Exception as e:
                return JsonResponse({'error': 'Image upload failed', 'details': str(e)}, status=500)

        if image_url:
            body_data['image_url'] = image_url

        try:
            updated_employee = conn.Visionary.Employee.find_one_and_update(
                {"_id": ObjectId(oeid)},
                {"$set": body_data},
                return_document=True  
            )

            if updated_employee:
                updated_employee["_id"] = str(updated_employee["_id"])
                return JsonResponse(updated_employee, status=200)
            else:
                return JsonResponse({'error': 'Employee not found'}, status=404)

        except Exception as e:
            return JsonResponse({'error': 'Update failed', 'details': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)


@api_view(['DELETE'])
def employee_delete(request,eid,oeid):
    Employees=conn.Visionary.Employees.find_one({"_id":ObjectId(eid)})
   
    if ObjectId(oeid) in Employees["allEmployee"]:
        Employees["allEmployee"].remove(ObjectId(oeid))
    else:
        return JsonResponse({"error": "Employee ID not found in the list"}, status=404)
    conn.Visionary.Employees.find_one_and_update({"_id":ObjectId(eid)},{"$set":{"allEmployee":Employees["allEmployee"]}})
    result = conn.Visionary.Employee.find_one_and_delete({"_id": ObjectId(oeid)})
    if result:
        return JsonResponse({'status': 'success', 'message': 'Delete successful'})
    else:
        return JsonResponse({'status': 'error', 'message': 'Product not found'}, status=404)
    

def employee_data(request):
    auth_header = request.headers.get('Authorization')
    email = get_current_user(auth_header)

    if email:
        Employee = conn.Visionary.Employee.find_one({"email": email})
        if Employee:
            Employee['_id'] = str(Employee['_id'])
            
            return JsonResponse(Employee)
    return JsonResponse({"error": "Owner not found"}, status=404)