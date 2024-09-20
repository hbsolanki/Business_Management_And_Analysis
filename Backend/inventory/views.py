from django.shortcuts import render
from django.http import JsonResponse
from Database.db import conn
from bson import ObjectId

# Create your views here.

def inventoryInfo(request,iid):
    Inventorys=conn.Visionary.Inventorys.find_one({"_id": ObjectId(iid)})
    Inventorys["_id"]=str(Inventorys["_id"])
    Inventorys["productid"]=str(Inventorys["productid"])
  
    return JsonResponse(Inventorys)