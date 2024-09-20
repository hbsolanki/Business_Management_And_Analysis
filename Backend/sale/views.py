from Database.db import conn
from django.http import JsonResponse
from bson.objectid import ObjectId

def saleInfo(request, sid):
    # Dummy response for testing
    Sales=conn.Visionary.Sales.find_one({"_id": ObjectId(sid)})
    Sales["_id"]=str(Sales["_id"])
    Sales["productsid"]=str(Sales["productsid"])

    return JsonResponse(Sales)
