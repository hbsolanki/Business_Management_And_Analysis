from Database.db import conn
from django.http import JsonResponse
from bson.objectid import ObjectId
from datetime import datetime
import json
import pytz
from pytz import timezone

# Get the IST timezone
ist = pytz.timezone('Asia/Kolkata')


def saleInfo(request, sid):
    Sales = conn.Visionary.Sales.find_one({"_id":ObjectId(sid)})
    Sales["_id"] = str(Sales["_id"])
    Sales["productsid"] = str(Sales["productsid"])
    Sales["employeesid"]=str(Sales["employeesid"])
    Sales["inventorysid"]=str(Sales["inventorysid"])
    for i in range(len(Sales["saleInfo"])):
        Sales["saleInfo"][i]=conn.Visionary.Sale.find_one({"_id": Sales["saleInfo"][i]})
        
        Sales["saleInfo"][i]["_id"]=str(Sales["saleInfo"][i]["_id"])
    
    return JsonResponse(Sales)

def taxrate_calculation(income):
    if income <= 250000:
            tax = 0
    elif income <= 500000:
        tax = (income - 250000) * 0.05
    elif income <= 750000:
        tax = (500000 - 250000) * 0.05 + (income - 500000) * 0.10
    elif income <= 1000000:
        tax = (500000 - 250000) * 0.05 + (750000 - 500000) * 0.10 + (income - 750000) * 0.15
    elif income <= 1250000:
        tax = (500000 - 250000) * 0.05 + (750000 - 500000) * 0.10 + (1000000 - 750000) * 0.15 + (income - 1000000) * 0.20
    elif income <= 1500000:
        tax = (500000 - 250000) * 0.05 + (750000 - 500000) * 0.10 + (1000000 - 750000) * 0.15 + (1250000 - 1000000) * 0.20 + (income - 1250000) * 0.25
    else:
            tax = (500000 - 250000) * 0.05 + (750000 - 500000) * 0.10 + (1000000 - 750000) * 0.15 + (1250000 - 1000000) * 0.20 + (1500000 - 1250000) * 0.25 + (income - 1500000) * 0.30

    return tax

def new_sale(request, sid):
    # Load sale data
    Sales = conn.Visionary.Sales.find_one({"_id": ObjectId(sid)})
    if not Sales:
        return JsonResponse({"error": "Sale not found"}, status=404)
    
    Products = conn.Visionary.Products.find_one({"_id": Sales["productsid"]})
    if not Products:
        return JsonResponse({"error": "Products not found"}, status=404)
    
    Inventorys = conn.Visionary.Inventorys.find_one({"_id": Sales["inventorysid"]})
    if not Inventorys:
        return JsonResponse({"error": "Inventory not found"}, status=404)

    ProductsStocks = Inventorys.get("productStock", [])
    data = json.loads(request.body)
    
    totalRevenueFromProduct = 0
    totalCostFromProduct = 0
    allProductSale = []

    # Calculate cost and revenue for each product
    for product_id in Products["allProduct"]:
        product = conn.Visionary.Product.find_one({"_id": ObjectId(product_id)})
        if not product:
            return JsonResponse({"error": f"Product {product_id} not found"}, status=404)

        # Ensure the product name exists in the data and quantity is provided
        product["_id"] = str(product["_id"])
        quantity = int(data.get(product["name"], 0))

        # Update the product stock quantities
        for i in range(len(ProductsStocks)):
            if ProductsStocks[i]["product"] == product["name"]:
                ProductsStocks[i]["quantity"] -= quantity

        revenue = quantity * int(product["revenue"])
        cost = quantity * (int(product["price"]) - int(product["revenue"]))
        totalCostFromProduct += cost
        totalRevenueFromProduct += revenue
        
        allProductSale.append({
            product["name"]: quantity,
            "cost": cost,
            "revenue": revenue
        })

    # Update the inventory stock after the sale
    conn.Visionary.Inventorys.find_one_and_update(
        {"_id": Sales["inventorysid"]},
        {"$set": {"productStock": ProductsStocks}}
    )

    # Additional sale info
    marketing = int(data.get('marketing', 0))
    othercost = int(data.get('othercost', 0))
    employess_salary = total_employee_salary(Sales["employeesid"])
    grossprofit = totalRevenueFromProduct - marketing - othercost - employess_salary
    
    tax_amount = taxrate_calculation(grossprofit)
    net_profit = grossprofit - tax_amount
    
    # Prepare sale document
    sale = {
        "allProductSale": allProductSale,
        "totalRevenueFromProduct": totalRevenueFromProduct,
        "COGS": totalCostFromProduct,
        "marketing": marketing,
        "othercost": othercost,
        "taxes": tax_amount,
        "turnover": totalCostFromProduct + totalRevenueFromProduct,
        "employess_salary": employess_salary,
        "grossprofit": grossprofit,
        "netprofit": net_profit,
        "date": datetime.now(timezone('Asia/Kolkata')),
    }
    
    # Insert the sale record into the database
    Sale = conn.Visionary.Sale.insert_one(sale)
    
    # Add the sale ID to the Sales document's saleInfo array
    Sales["saleInfo"].append(Sale.inserted_id)
    conn.Visionary.Sales.find_one_and_update(
        {"_id": ObjectId(sid)},
        {"$set": {"saleInfo": Sales["saleInfo"]}}
    )
    
    return JsonResponse({"message": "Sale stored successfully"}, safe=False)



def total_employee_salary(eid):
    totalSalary=0
    Employees=conn.Visionary.Employees.find_one({"_id":eid})

    
    for oeid in Employees["allEmployee"]:
        employee=conn.Visionary.Employee.find_one({"_id":oeid})
        totalSalary+=int(employee["salary"])

    return totalSalary
