from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from Auth.Auth import get_current_user
from bson import ObjectId

# Create your views here.

def productInfo(request,pid):
    Products=conn.Visionary.Products.find_one({"_id": ObjectId(pid)})
    Products["_id"]=str(Products["_id"])

    for i in range(len(Products["allProduct"])):
        Products["allProduct"][i]=conn.Visionary.Product.find_one({"_id": Products["allProduct"][i]})
        Products["allProduct"][i]["_id"]=str(Products["allProduct"][i]["_id"])

  
    return JsonResponse(Products)

def add_product(request,pid):
    auth_header = request.headers.get('Authorization')
    email=get_current_user(auth_header)

    import json
    Products=conn.Visionary.Products.find_one({"_id":ObjectId(pid)})
    data = json.loads(request.body)
    name = data.get('name')
    price=data.get('price')
    revenue=data.get('revenue')
    description=data.get('description',"")
    d={
            "name": name,
            "price": int(price),
            "revenue":int(revenue),
            "cogs":int(price)-int(revenue),
            "description": description,
        
        }
    product=conn.Visionary.Product.insert_one(d)
    Products["allProduct"].append(product.inserted_id)
    conn.Visionary.Products.update_one({"_id":ObjectId(pid)},{"$set":{"allProduct":Products["allProduct"]}})
    return JsonResponse({'status': 'success', 'message': 'Registration successful'})

def edit_product(request):
    pass