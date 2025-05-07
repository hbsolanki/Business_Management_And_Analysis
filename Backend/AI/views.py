from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
def turnover(request):
    data = request.data.get("turnover_data")

    if not data:
        return Response({"error": "Missing turnover_data"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        for key in data:
            data[key] = float(data[key])

        revenue = (
            data["manufacturing_cost"]
            + data["marketing_expenses"]
            + data["salary_expenses"]
            + data["other_expenses"]
            + data["tax"]
            + data["net_profit"]
        )

        net_profit_margin = round((data['net_profit'] / revenue) * 100, 2)

        insights = {
            "summary": f"The total revenue is ₹{revenue:,.0f}. Net profit margin is {net_profit_margin}%.",
            "positives": [],
            "improvements": [],
        }

        if data["net_profit"] > 0:
            insights["positives"].append("Net profit is positive, indicating profitable operations.")

        if (data["salary_expenses"] / revenue) < 0.05:
            insights["positives"].append("Salaries are well managed, under 5% of total revenue.")

        if (data["marketing_expenses"] / revenue) < 0.01:
            insights["improvements"].append("Marketing expenses are very low — consider increasing to boost visibility.")

        if (data["manufacturing_cost"] / revenue) > 0.6:
            insights["improvements"].append("Manufacturing costs are high — explore cost reduction strategies.")

        return Response({"insights": insights}, status=status.HTTP_200_OK)

    except (KeyError, TypeError, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def turnover_last_months(request):
    data = request.data.get("turnover_last_months", [])
    cleaned_data = [val for val in data if isinstance(val, (int, float)) and val > 0]

    if not cleaned_data:
        return Response({"error": "No valid data provided."}, status=status.HTTP_400_BAD_REQUEST)

    avg_turnover = sum(cleaned_data) / len(cleaned_data)
    min_turnover = min(cleaned_data)
    max_turnover = max(cleaned_data)
    trend = "increasing" if cleaned_data[-1] > cleaned_data[0] else "decreasing" if cleaned_data[-1] < cleaned_data[0] else "flat"

    response_data = {
        "cleaned_data": cleaned_data,
        "average": avg_turnover,
        "min": min_turnover,
        "max": max_turnover,
        "trend": trend,
        "insights": [
            f"Average monthly turnover: ₹{avg_turnover:,.0f}",
            f"Highest turnover: ₹{max_turnover:,.0f}",
            f"Lowest turnover: ₹{min_turnover:,.0f}",
            f"Overall trend is {trend}."
        ]
    }

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
def netprofit_last_months(request):
    data = request.data.get("netprofit_last_months", [])
    cleaned_data = [val for val in data if isinstance(val, (int, float))]

    if not cleaned_data:
        return Response({"error": "No valid net profit data provided."}, status=status.HTTP_400_BAD_REQUEST)

    avg_profit = sum(cleaned_data) / len(cleaned_data)
    min_profit = min(cleaned_data)
    max_profit = max(cleaned_data)

    trend = "increasing" if cleaned_data[-1] > cleaned_data[0] else "decreasing" if cleaned_data[-1] < cleaned_data[0] else "flat"

    response_data = {
        "cleaned_data": cleaned_data,
        "average": round(avg_profit, 2),
        "min": round(min_profit, 2),
        "max": round(max_profit, 2),
        "trend": trend,
        "insights": [
            f"Average monthly net profit: ₹{avg_profit:,.0f}",
            f"Highest net profit: ₹{max_profit:,.0f}",
            f"Lowest net profit: ₹{min_profit:,.0f}",
            f"Net profit trend is {trend}."
        ]
    }

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
def product_stats(request):
    data = request.data.get("products")

    if not data or not isinstance(data, list):
        return Response({"error": "Invalid or missing product data"}, status=400)

    try:
        insights = generate_product_stats_insights(data)
        return Response({"insights": insights}, status=200)
    except Exception as e:
        return Response({"error": f"Internal server error: {str(e)}"}, status=500)


def generate_product_stats_insights(data):
    highest_profit = max(data, key=lambda x: x["price"] - x["cogs"])
    lowest_profit = min(data, key=lambda x: x["price"] - x["cogs"])
    avg_profit_margin = sum([(item["price"] - item["cogs"]) / item["price"] * 100 for item in data]) / len(data)

    insights = {
        "summary": f"{len(data)} products analyzed. Avg. profit margin: {avg_profit_margin:.2f}%.",
        "positives": [
            f"💰 '{highest_profit['name']}' has the highest profit of ₹{highest_profit['price'] - highest_profit['cogs']:,}."
        ],
        "improvements": [
            f"📉 '{lowest_profit['name']}' has the lowest profit of ₹{lowest_profit['price'] - lowest_profit['cogs']:,}. Consider optimizing its cost or price."
        ],
    }
    return insights


@api_view(['POST'])
def product_inventory_last_month(request):
    data = request.data.get("inventory_data", {})

    if not data:
        return Response({"error": "No inventory data provided"}, status=400)

    insights = generate_inventory_insights(data)

    return Response({
        "inventory_data": data,
        "insights": insights
    })


def generate_inventory_insights(data):
    insights = {"summary": "", "highlights": []}
    total_production = 0
    underperformers = []

    for product, monthly_counts in data.items():
        total = sum(monthly_counts)
        total_production += total
        max_mf = max(monthly_counts)
        min_mf = min(monthly_counts)

        if min_mf < 50:
            underperformers.append(product)

        insights["highlights"].append(
            f"{product} had highest monthly production of {max_mf} units and lowest of {min_mf} units."
        )

    insights["summary"] = (
        f"Total units produced across all products: {total_production}. "
        f"{len(underperformers)} products had months with low production (< 50 units)."
    )

    return insights


@api_view(['POST'])
def product_stock(request):
    data = request.data.get("product_stock_data", {})

    if not data:
        return Response({"error": "No product stock data provided"}, status=400)

    total_stock = sum(data.values())
    product_count = len(data)

    insights = generate_ai_insights(data)

    return Response({
        "product_stock_data": data,
        "total_stock": total_stock,
        "product_count": product_count,
        "insights": insights,
    })


def generate_ai_insights(data):
    low_stock = [product for product, stock in data.items() if stock < 30]
    high_stock = [product for product, stock in data.items() if stock > 100]

    return {
        "summary": f"Total stock: {sum(data.values())}, {len(low_stock)} products are low on stock, and {len(high_stock)} have excess stock.",
        "positives": [
            f"{len(high_stock)} products have good stock levels."
        ],
        "improvements": [
            f"{len(low_stock)} products are understocked, consider restocking."
        ]
    }


@api_view(['POST'])
def product_sold_last_month(request):
    sales_data = request.data.get("sales_data", {})

    if not sales_data or not isinstance(sales_data, dict):
        return Response({"error": "No valid sales data provided"}, status=400)

    flat_data = [{"product": name, "sold": sold} for name, monthly_sales in sales_data.items() for sold in monthly_sales]

    total_sales = sum([item['sold'] for item in flat_data])
    product_count = len(sales_data)

    insights = generate_sales_insights(flat_data)

    return Response({
        "sales_data": flat_data,
        "total_sales": total_sales,
        "product_count": product_count,
        "insights": insights,
    })


def generate_sales_insights(data):
    high_sales = [p for p in data if p['sold'] > 100]
    low_sales = [p for p in data if p['sold'] < 30]

    return {
        "summary": f"Total sales: {sum([item['sold'] for item in data])}, "
                   f"{len(low_sales)} products with low sales, and "
                   f"{len(high_sales)} products with high sales.",
        "positives": [
            f"{len(high_sales)} products have excellent sales."
        ],
        "improvements": [
            f"{len(low_sales)} products have low sales, consider marketing or price adjustments."
        ]
    }
