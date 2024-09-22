from django.shortcuts import render
from Database.db import conn
from django.http import JsonResponse
from bson import ObjectId

# Create your views here.

def turnover(request,bid):
    try:
        # Fetch the latest sale document
        Business=conn.Visionary.Business.find_one({"_id":ObjectId(bid)})
      
        sid=Business["sale"]
        Sales = conn.Visionary.Sales.find_one({"_id": ObjectId(sid)})
        for i in range(len(Sales["saleInfo"])):
            Sales["saleInfo"][i]=conn.Visionary.Sale.find_one({"_id": Sales["saleInfo"][i]})
            
            Sales["saleInfo"][i]["_id"]=str(Sales["saleInfo"][i]["_id"])

        Sales["saleInfo"] = sorted(Sales["saleInfo"], key=lambda x: x["date"], reverse=True)
      
        latest_sale = Sales["saleInfo"][0]

        # Extract required fields
        manaufacturing_cost = latest_sale.get("COGS", 0)
        marketing_expenses = latest_sale.get("marketing", 0)
        salary_expenses = latest_sale.get("employess_salary", 0)
        other_expenses = latest_sale.get("othercost", 0)
        tax = latest_sale.get("taxes", 0)
        net_profit = latest_sale.get("netprofit", 0)  # Ensure net profit is being fetched correctly

        # Prepare the response dictionary
        d = {
            "manaufacturing_cost": manaufacturing_cost,
            "marketing_expenses": marketing_expenses,
            "salary_expenses": salary_expenses,
            "other_expenses": other_expenses,
            "tax": tax,
            "net_profit": net_profit
        }
        return JsonResponse(d)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve turnover data"}, status=500)

def turnover_tenmonth(request, bid):
    try:
        turnover = []
        business = conn.Visionary.Business.find_one({"_id": ObjectId(bid)})

        if not business:
            return JsonResponse({"error": "Business not found"}, status=404)

        sid = business["sale"]
        sales = conn.Visionary.Sales.find_one({"_id": ObjectId(sid)})
        length = len(sales["saleInfo"])

        # Ensure we do not go out of bounds with the index
        for i in range(-1, -min(10, length) - 1, -1):
            sale = conn.Visionary.Sale.find_one({"_id": sales["saleInfo"][i]})
            if sale:
                turnover.append(sale["turnover"])

        return JsonResponse(turnover, safe=False)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve turnover data"}, status=500)  

def netprofit_tenmonth(request,bid):
    try:
        turnover = []
        business = conn.Visionary.Business.find_one({"_id": ObjectId(bid)})

        if not business:
            return JsonResponse({"error": "Business not found"}, status=404)

        sid = business["sale"]
        sales = conn.Visionary.Sales.find_one({"_id": ObjectId(sid)})
        length = len(sales["saleInfo"])

        # Ensure we do not go out of bounds with the index
        for i in range(-1, -min(10, length) - 1, -1):
            sale = conn.Visionary.Sale.find_one({"_id": sales["saleInfo"][i]})
            if sale:
                turnover.append(sale["netprofit"])

        return JsonResponse(turnover, safe=False)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve turnover data"}, status=500) 
    

def product_stock(request,bid):
    try:
        Business=conn.Visionary.Business.find_one({"_id":ObjectId(bid)})
        iid=Business["inventory"]
        Inventorys=conn.Visionary.Inventorys.find_one({"_id":iid})

        latest_inventory = conn.Visionary.Inventory.find_one({"_id":Inventorys["stock"][-1]})
        
        product_quantities = {}

        # Loop through the inventory document and extract product data
        for key, value in latest_inventory.items():
            if key not in ["_id", "date"]:
                product_quantities[key] = int(value)  # Convert quantities to integers if stored as strings

        
        # Return the inventory data as a JsonResponse
        return JsonResponse(product_quantities)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve data"}, status=500)
    
def product_details(request,bid):
    try:
        Business=conn.Visionary.Business.find_one({"_id":ObjectId(bid)})
        pid=Business["product"]
        Products=conn.Visionary.Products.find_one({"_id":pid})
        latest_product_details=[]
        for opid in  Products["allProduct"]:
            product=conn.Visionary.Product.find_one({"_id":opid})
  
            latest_product_details.append({"name":product["name"],"revenue":product["revenue"],"price":product["price"],"cogs":product["cogs"]})
        
        return JsonResponse(latest_product_details,safe=False)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve data"}, status=500)
    


from django.http import JsonResponse
from bson import ObjectId
from datetime import datetime

def Product_Manufacturing_Per_Month(request, bid):
    # Get the business and inventory details
    Business = conn.Visionary.Business.find_one({"_id": ObjectId(bid)})
    iid = Business["inventory"]
    Inventorys = conn.Visionary.Inventorys.find_one({"_id": iid})

    product_quantities = {}  # To track product quantities over time

    # Retrieve the stock inventory length and ensure we only process the last 10 records
    stock_length = len(Inventorys["stock"])
    for i in range(-1, -min(10, stock_length) - 1, -1):
        Inventory = conn.Visionary.Inventory.find_one({"_id": Inventorys["stock"][i]})
        if Inventory:
            for key, value in Inventory.items():
                if key not in ["_id", "date"]:
                    # Update product quantities over time
                    if key not in product_quantities:
                        product_quantities[key] = []
                    product_quantities[key].append(int(value))

    for product, quantities in product_quantities.items():
        quantities.reverse()

    # Make sure each product has exactly 10 months of data, filling with 0 if necessary
    for product, quantities in product_quantities.items():
        if len(quantities) < 10:
            product_quantities[product] = [0] * (10 - len(quantities)) + quantities

    # Return the response as a JsonResponse
    return JsonResponse(product_quantities)


    

        

def Product_Sold_Per_Month(request,bid):
    # Get the business and inventory details
    Business = conn.Visionary.Business.find_one({"_id": ObjectId(bid)})
    sid = Business["sale"]
    Sales = conn.Visionary.Sales.find_one({"_id": sid})

    product_sales = {}  # To track product quantities over time

    # Retrieve the stock inventory length and ensure we only process the last 10 records
    sale_length = len(Sales["saleInfo"])
    for i in range(-1, -min(10, sale_length) - 1, -1):
        Sale = conn.Visionary.Sale.find_one({"_id": Sales["saleInfo"][i]})
        if Sale:
            allProduct=Sale["allProductSale"]

            for product in allProduct:
                    # Update product quantities over time
                for key,value in product.items():
                    if key not in ["cost","revenue"]:
                        if key not in product_sales:
                            product_sales[key] = []
                        product_sales[key].append(int(value))

    # Make sure each product has exactly 10 months of data, filling with 0 if necessary
    for product, quantities in product_sales.items():
        quantities.reverse()
    for product, quantities in product_sales.items():
        if len(quantities) < 10:
            product_sales[product] = [0] * (10 - len(quantities)) + quantities

    # Return the response as a JsonResponse
    return JsonResponse(product_sales)
