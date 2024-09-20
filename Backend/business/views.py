from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from Auth.Auth import get_current_user
from rest_framework.decorators import api_view
from bson import ObjectId

# Create your views here.
@api_view(["POST"])
def business_registration(request):
    auth_header = request.headers.get('Authorization')
    email=get_current_user(auth_header)
        
    try:
        import json
        # owner=conn.Visionary.Owner.find_one({"email":email})
        data = json.loads(request.body)
        name = data.get('name')
        debt=data.get('debt',{})
        haveEquity=data.get('haveEquity')
        profit=data.get('profit',0)
        assets=data.get('assets',0)
        description=data.get('description',"")

        debt["amount"]=data.get("amount",0)
        debt["totalEMI"]=data.get("totalEMI",0)
        debt["persentage"]=data.get("persentage",0)

        Employees=conn.Visionary.Employees.insert_one({
            "allEmployee": [], 
        })
        Products=conn.Visionary.Products.insert_one({
            "allProduct": [], 
        })
        Sales=conn.Visionary.Sales.insert_one({
            "saleInfo": [], 
            "productsid": Products.inserted_id ,
        })
        Inventorys=conn.Visionary.Inventorys.insert_one({
            "stock": [],
            "productsid": Products.inserted_id , 
        })

        business=conn.Visionary.Business.insert_one({
            "name": name,
            "debt": debt,
            "haveEquity": haveEquity,
            "profit": profit,
            "assets": assets,
            "product": Products.inserted_id ,
            "employee": Employees.inserted_id ,
            "inventory": Inventorys.inserted_id,
            "sale":Sales.inserted_id ,
            "description": description,
        })
        # Extract the ObjectId of the newly created business
        business_id = business.inserted_id

        # Update the Owner document by setting the businessid to the inserted ObjectId
        conn.Visionary.Owner.update_one({"email": email}, {"$set": {"businessid": business_id}})



        return JsonResponse({'status': 'success', 'message': 'Registration successful'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)


@api_view(["GET"])
def business_data(request, id):
    auth_header = request.headers.get('Authorization')
    email=get_current_user(auth_header)
        
    try:
    
        business=conn.Visionary.Business.find_one({"_id":ObjectId(id)})
        # print(business.get("product","A"))
        business["_id"]=str(business["_id"])
        if business["product"]:
            business["product"]=str(business["product"])

        if business["employee"]:
            business["employee"]=str(business["employee"])

        if business["inventory"]:
            business["inventory"]=str(business["inventory"])

        if business["sale"]:
            business["sale"]=str(business["sale"])

        
        return JsonResponse(business)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
    