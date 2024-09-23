from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from bson import ObjectId
import json
from datetime import datetime
import pytz

# Get the IST timezone
ist = pytz.timezone('Asia/Kolkata')


# Create your views here.

def inventoryInfo(request,iid):
    Inventorys=conn.Visionary.Inventorys.find_one({"_id": ObjectId(iid)})
    Inventorys["_id"]=str(Inventorys["_id"])
    Inventorys["productsid"]=str(Inventorys["productsid"])
    print(Inventorys)
  
    for i in range(len(Inventorys["stock"])):
        Inventorys["stock"][i]=conn.Visionary.Inventory.find_one({"_id": Inventorys["stock"][i]})
        Inventorys["stock"][i]["_id"]=str(Inventorys["stock"][i]["_id"])

    print(Inventorys)
    
    return JsonResponse(Inventorys)

def new_inventory(request,iid):
    Inventorys=conn.Visionary.Inventorys.find_one({"_id": ObjectId(iid)})
    body_unicode = request.body.decode('utf-8')
    body_data = json.loads(body_unicode)
    body_data["date"]=datetime.now(ist)
    Inventory = conn.Visionary.Inventory.insert_one(
        body_data, 
    )
    Inventorys["stock"].append(Inventory.inserted_id)
    conn.Visionary.Inventorys.find_one_and_update({"_id": ObjectId(iid)},{"$set":{"stock":Inventorys["stock"]}})

    return JsonResponse({'status': 'success', 'message': 'Registration successful'})
