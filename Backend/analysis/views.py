from django.shortcuts import render
from Database.db import conn
from django.http import JsonResponse

# Create your views here.

def turnover(request,bid):
    try:
        # Fetch the latest sale document
        latest_sale = list(conn.Visionary.Sale.find().sort('date', -1).limit(1))[0]

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


def turnover_tenmonth(request):
    try:
        # Fetch the latest 10 sale documents
        latest_sales = list(conn.Visionary.Sale.find().sort('date', -1).limit(10))

        # Prepare the turnover data list
        turnover = []
        for latest_sale in latest_sales:
            print(latest_sale)
            turnover.append(latest_sale.get("turnover", 0))  # Ensure you're appending the correct field

        # Return the list as a JsonResponse with safe=False
        return JsonResponse(turnover, safe=False)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve turnover data"}, status=500)
    

def netprofit_tenmonth(request):
    try:
        # Fetch the latest 10 sale documents
        latest_sales = list(conn.Visionary.Sale.find().sort('date', -1).limit(10))

        # Prepare the turnover data list
        turnover = []
        for latest_sale in latest_sales:
            print(latest_sale)
            turnover.append(latest_sale.get("netprofit", 0))  # Ensure you're appending the correct field

        # Return the list as a JsonResponse with safe=False
        return JsonResponse(turnover, safe=False)

    except Exception as e:
        # Log the error for debugging purposes
        return JsonResponse({"error": "Unable to retrieve net profit data"}, status=500)
    

def product_stock(request,bid):
    try:
        # Fetch the latest 10 sale documents
        latest_inventory = list(conn.Visionary.Inventory.find().sort('date', -1).limit(1))[0]

        # Create a dictionary to hold product names and their quantities
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
    
def product_details(request):
    try:
        # Fetch the latest 10 sale documents
        latest_inventory = list(conn.Visionary.Inventory.find().sort('date', -1).limit(1))[0]
        # Products=conn.Visionary.Inventory
        # Create a dictionary to hold product names and their quantities
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