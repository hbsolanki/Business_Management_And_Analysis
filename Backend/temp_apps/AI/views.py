import os
import ast
import re
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from groq import Groq

# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ---------- 🔹 UNIVERSAL HELPER FUNCTION ----------

def get_groq_insights(title: str, data: dict or list):
    """
    Send data to Groq LLM for AI-generated insights in dictionary format.
    """
    prompt = f"""
    You are an AI assistant that analyzes {title} data and gives insights in Indian Rupees (₹).
    Analyze the provided data and return insights in this exact Python dictionary format (no code block, no markdown):

    insights = {{
        "summary": "short summary text about the data",
        "positives": ["point 1", "point 2"],
        "improvements": ["point 1", "point 2"]
    }}

    Data:
    {data}
    """

    try:
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a professional data analyst for business_app insights."},
                {"role": "user", "content": prompt},
            ],
        )

        output = chat_completion.choices[0].message.content.strip()

        # Clean Groq output (remove ```python, etc.)
        output = re.sub(r"^```(?:python)?", "", output.strip(), flags=re.IGNORECASE | re.MULTILINE)
        output = re.sub(r"```$", "", output.strip(), flags=re.MULTILINE).strip()

        if output.startswith("insights ="):
            output = output.split("=", 1)[1].strip()

        # Safe dictionary parsing
        try:
            return ast.literal_eval(output)
        except Exception:
            return {"summary": output, "positives": [], "improvements": []}

    except Exception as e:
        return {"summary": f"Error while analyzing: {str(e)}", "positives": [], "improvements": []}


# ---------- 🔹 1. TURNOVER ----------

@api_view(['POST'])
def turnover(request):
    data = request.data.get("turnover_data")
    if not data:
        return Response({"error": "Missing turnover_data"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("turnover", data)
    return Response({"insights": insights}, status=status.HTTP_200_OK)


# ---------- 🔹 2. TURNOVER LAST MONTHS ----------

@api_view(['POST'])
def turnover_last_months(request):
    data = request.data.get("turnover_last_months", [])
    if not data:
        return Response({"error": "Missing turnover_last_months"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("monthly turnover trends", data)
    return Response({"insights": insights}, status=status.HTTP_200_OK)


# ---------- 🔹 3. NET PROFIT LAST MONTHS ----------

@api_view(['POST'])
def netprofit_last_months(request):
    data = request.data.get("netprofit_last_months", [])
    if not data:
        return Response({"error": "Missing netprofit_last_months"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("monthly net profit trends", data)
    return Response({"insights": insights}, status=status.HTTP_200_OK)


# ---------- 🔹 4. PRODUCT STATS ----------

@api_view(['POST'])
def product_stats(request):
    data = request.data.get("products")
    if not data or not isinstance(data, list):
        return Response({"error": "Invalid or missing product data"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("product profitability", data)
    return Response({"insights": insights}, status=status.HTTP_200_OK)


# ---------- 🔹 5. PRODUCT INVENTORY LAST MONTH ----------

@api_view(['POST'])
def product_inventory_last_month(request):
    data = request.data.get("inventory_data", {})
    if not data:
        return Response({"error": "No inventory data provided"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("product inventory trends", data)
    return Response({"inventory_data": data, "insights": insights}, status=status.HTTP_200_OK)


# ---------- 🔹 6. PRODUCT STOCK ----------

@api_view(['POST'])
def product_stock(request):
    data = request.data.get("product_stock_data", {})
    if not data:
        return Response({"error": "No product stock data provided"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("product stock levels", data)
    return Response({"product_stock_data": data, "insights": insights}, status=status.HTTP_200_OK)


# ---------- 🔹 7. PRODUCT SOLD LAST MONTH ----------

@api_view(['POST'])
def product_sold_last_month(request):
    sales_data = request.data.get("sales_data", {})
    if not sales_data:
        return Response({"error": "No valid sales data provided"}, status=status.HTTP_400_BAD_REQUEST)
    insights = get_groq_insights("product sales performance", sales_data)
    return Response({"sales_data": sales_data, "insights": insights}, status=status.HTTP_200_OK)
