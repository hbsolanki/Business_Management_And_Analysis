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
  
    for i in range(len(Inventorys["stock"])):
        Inventorys["stock"][i]=conn.Visionary.Inventory.find_one({"_id": Inventorys["stock"][i]})
        Inventorys["stock"][i]["_id"]=str(Inventorys["stock"][i]["_id"])

    
    return JsonResponse(Inventorys)

def new_inventory(request, iid):
    # Fetch the current inventory using the ID
    inventory = conn.Visionary.Inventorys.find_one({"_id": ObjectId(iid)})
    
    if not inventory:
        return JsonResponse({'status': 'error', 'message': 'Inventory not found'}, status=404)

    body_unicode = request.body.decode('utf-8')
    body_data = json.loads(body_unicode)
    
    # Get the list of old products and their stock
    old_product_stock = inventory.get("productStock", [])
    
    # Iterate through each product and quantity in the body_data
    for product_name, quantity in body_data.items():
        # Ensure quantity is an integer
        try:
            quantity = int(quantity)
        except ValueError:
            return JsonResponse({'status': 'error', 'message': f'Invalid quantity for product {product_name}'}, status=400)

       
        # Check if the product already exists in the inventory stock
        product_exists = False
        for product in old_product_stock:
            if product.get("product") == product_name:
                product["quantity"] += quantity  # Update the quantity
                product_exists = True
                break

        # If the product doesn't exist, add it to the stock
        if not product_exists:
            old_product_stock.append({
                "product": product_name,
                "quantity": quantity
            })
    
    # Add the current date to the body data
    body_data["date"] = datetime.now()

    # Insert the new inventory record into the database
    new_inventory = conn.Visionary.Inventory.insert_one(body_data)

    # Add the new inventory ID to the stock list of the main inventory
    inventory["stock"].append(new_inventory.inserted_id)
    
    # Update the stock list in the main inventory document
    conn.Visionary.Inventorys.find_one_and_update(
        {"_id": ObjectId(iid)},
        {"$set": {"productStock": old_product_stock, "stock": inventory["stock"]}}
    )

    return JsonResponse({'status': 'success', 'message': 'Inventory updated successfully'})
