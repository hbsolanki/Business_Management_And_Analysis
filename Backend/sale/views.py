from Database.db import conn
from django.http import JsonResponse
from bson.objectid import ObjectId
from datetime import datetime
import json
import pytz

# Get the IST timezone
ist = pytz.timezone('Asia/Kolkata')


def saleInfo(request, sid):
    # print(sid)
    Sales = conn.Visionary.Sales.find_one({"_id": ObjectId(sid)})
    Sales["_id"] = str(Sales["_id"])
    Sales["productsid"] = str(Sales["productsid"])
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
    Products = conn.Visionary.Products.find_one({"_id": Sales["productsid"]})
    data = json.loads(request.body)
    
    totalRevenueFromProduct = 0
    totalCostFromProduct = 0
    allProductSale = []
    
    # Calculate cost and revenue for each product
    for i in range(len(Products["allProduct"])):
        product = conn.Visionary.Product.find_one({"_id": Products["allProduct"][i]})
        product["_id"] = str(product["_id"])
        quantity = int(data[product["name"]])
        revenue = quantity * int(product["revenue"])
        cost = quantity * (int(product["price"]) - int(product["revenue"]))
        totalCostFromProduct += cost
        totalRevenueFromProduct += revenue
        
        allProductSale.append({
            product["name"]: quantity,
            "cost": cost,
            "revenue": revenue
        })
    
    # Additional sale info
    marketing = int(data.get('marketing'))
    othercost = int(data.get('othercost'))
    employess_salary=total_employee_salary()
    grossprofit=totalRevenueFromProduct-marketing-othercost-employess_salary
    
    tax_amount =taxrate_calculation(grossprofit)
    net_profit = grossprofit - tax_amount
    
    
    # Create a sale document
    sale = {
        "allProductSale": allProductSale,
        "totalRevenueFromProduct": totalRevenueFromProduct,
        "COGS": totalCostFromProduct,
        "marketing": marketing,
        "othercost": othercost,
        "taxes":tax_amount,
        "turnover":totalCostFromProduct+totalRevenueFromProduct,
        "employess_salary":employess_salary,
        "grossprofit":grossprofit,
        "netprofit":net_profit,
        "date": datetime.now(ist),
    }
    
    # Insert sale into the Sale collection
    Sale = conn.Visionary.Sale.insert_one(sale)
    
    # Update saleInfo in the Sales document
    Sales["saleInfo"].append(Sale.inserted_id)
    conn.Visionary.Sales.find_one_and_update(
        {"_id": ObjectId(sid)},
        {"$set": {"saleInfo": Sales["saleInfo"]}}
    )
    
    # Return confirmation response
    return JsonResponse({"message": "Sale stored successfully"}, safe=False)


def total_employee_salary():
    totalSalary=0
    AllEmployee=conn.Visionary.Employee.find({})
    for employee in AllEmployee:
        totalSalary+=int(employee["salary"])

    return totalSalary
