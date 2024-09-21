from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from Auth.Auth import get_current_user
from bson import ObjectId
import json
from rest_framework.decorators import api_view

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

def product_one(request,pid):
    Product=conn.Visionary.Product.find_one({"_id":ObjectId(pid)})
    Product["_id"]=str(Product["_id"])
    return JsonResponse(Product)



def product_one_edit(request, pid):
    # Parse the request body (assuming JSON data)
    body_unicode = request.body.decode('utf-8')
    body_data = json.loads(body_unicode)

    # Perform the update operation
    updated_product = conn.Visionary.Product.find_one_and_update(
        {"_id": ObjectId(pid)},
        {"$set": body_data},
        return_document=True  # Ensures the updated document is returned
    )

    # Convert the ObjectId to a string for JSON response
    if updated_product:
        updated_product["_id"] = str(updated_product["_id"])

    return JsonResponse(updated_product)


@api_view(['DELETE'])
def delete_product(request, pid,opid):
    
    Products=conn.Visionary.Products.find_one({"_id":ObjectId(pid)})
   
    Products["allProduct"].remove(ObjectId(opid))
    conn.Visionary.Products.find_one_and_update({"_id":ObjectId(pid)},{"$set":{"allProduct":Products["allProduct"]}})
    result = conn.Visionary.Product.find_one_and_delete({"_id": ObjectId(opid)})
    if result:
        return JsonResponse({'status': 'success', 'message': 'Delete successful'})
    else:
        return JsonResponse({'status': 'error', 'message': 'Product not found'}, status=404)
