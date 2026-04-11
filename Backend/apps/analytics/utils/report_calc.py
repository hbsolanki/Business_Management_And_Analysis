from django.db.models import Sum, F, DecimalField, Value, Q
from django.db.models.functions import Coalesce
from apps.business.models import Branch
from apps.invoice.models import ProductInvoice
from apps.inventory.models import InventoryProduct
from apps.supplier.models import PurchaseOrder
from apps.cost.models import MonthlyFinancialSummary, MonthlyCostCategory
from apps.employee.models import UserRole

def calculate_report_data(user, filters):
    """
    Extracted logic to calculate analytics report data based on filters and user context.
    """
    report_types = filters.get("report_type", [])
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")
    branch_ids = filters.get("branch_ids")
    
    # Identify branches
    if user.role_name == UserRole.OWNER:
        if branch_ids:
            branches = Branch.objects.filter(id__in=branch_ids, business=user.business,is_active=True)
        else:
            branches = Branch.objects.filter(business=user.business,is_active=True)
    else:
        assigned_branches = user.branches
        if branch_ids:
            branches = assigned_branches.filter(id__in=branch_ids)
        else:
            branches = assigned_branches

    branch_data_list = []
    
    # Track global sums
    global_product_summary = {"total_quantity_sold": 0, "total_revenue": 0, "total_profit": 0, "total_cost": 0}
    global_inventory_summary = {"total_stock_value": 0, "total_quantity": 0}
    global_po_summary = {"total_po_amount": 0, "total_orders": 0}
    global_cost_summary = {
        "total_revenue": 0,
        "cost_of_goods_sold": 0,
        "total_expenses": 0,
        "net_profit_before_tax": 0
    }

    for branch in branches:
        branch_report = {
            "branch_id": branch.id,
            "branch_name": branch.name,
        }
        
        # --- 1. PRODUCT PERFORMANCE ---
        if "product" in report_types:
            prod_qs = ProductInvoice.objects.filter(
                invoice__branch=branch,
                invoice__created_at__date__range=[start_date, end_date]
            )
            if filters.get("product_ids"):
                prod_qs = prod_qs.filter(product_id__in=filters["product_ids"])
            
            prod_summary = prod_qs.aggregate(
                total_quantity_sold=Coalesce(Sum("quantity"), Value(0)),
                total_revenue=Coalesce(Sum(F("quantity") * F("selling_price")), Value(0, output_field=DecimalField())),
                total_profit=Coalesce(Sum(F("quantity") * F("product__net_profit")), Value(0, output_field=DecimalField())),
                total_cost=Coalesce(Sum(F("quantity") * F("product__cost_price")), Value(0, output_field=DecimalField())),
            )
            
            branch_products = list(
                prod_qs.values(
                    "product_id",
                    product_name=F("product__name"),
                    category_name=F("product__product_category__name"),
                ).annotate(
                    total_quantity_sold=Sum("quantity"),
                    total_revenue=Sum(F("quantity") * F("selling_price")),
                    total_profit=Sum(F("quantity") * F("product__net_profit")),
                    total_cost=Sum(F("quantity") * F("product__cost_price")),
                ).order_by("-total_revenue")
            )
            branch_report["product"] = {
                "summary": prod_summary,
                "products": branch_products
            }
            global_product_summary["total_quantity_sold"] += prod_summary["total_quantity_sold"]
            global_product_summary["total_revenue"] += prod_summary["total_revenue"]
            global_product_summary["total_profit"] += prod_summary["total_profit"]
            global_product_summary["total_cost"] += prod_summary["total_cost"]

        # --- 2. INVENTORY ---
        if "inventory" in report_types:
            inv_qs = InventoryProduct.objects.filter(inventory__branch=branch)
            if filters.get("product_ids"):
                inv_qs = inv_qs.filter(product_id__in=filters["product_ids"])
            
            inv_summary = inv_qs.aggregate(
                total_quantity=Coalesce(Sum("stock_quantity"), Value(0)),
                total_stock_value=Coalesce(Sum(F("stock_quantity") * F("product__cost_price")), Value(0, output_field=DecimalField())),
            )
            
            branch_inventory = list(
                inv_qs.values(
                    "product_id",
                    product_name=F("product__name"),
                    category_name=F("product__product_category__name"),
                ).annotate(
                    current_stock=Sum("stock_quantity"),
                    stock_value=Sum(F("stock_quantity") * F("product__cost_price"))
                ).order_by("-stock_value")
            )
            branch_report["inventory"] = {
                "summary": inv_summary,
                "products": branch_inventory
            }
            global_inventory_summary["total_quantity"] += inv_summary["total_quantity"]
            global_inventory_summary["total_stock_value"] += inv_summary["total_stock_value"]

        # --- 3. COST / FINANCIALS ---
        if "cost" in report_types:
            current_year = start_date.year
            current_month = start_date.month
            
            month_year_q = Q()
            while (current_year < end_date.year) or (current_year == end_date.year and current_month <= end_date.month):
                month_year_q |= Q(year=current_year, month=current_month)
                if current_month == 12:
                    current_month = 1
                    current_year += 1
                else:
                    current_month += 1
            
            fin_qs = MonthlyFinancialSummary.objects.filter(branch=branch).filter(month_year_q)
            
            branch_cost_report = {}
            if fin_qs.exists():
                fin_summary = fin_qs.aggregate(
                    total_revenue=Coalesce(Sum('total_revenue'), Value(0, output_field=DecimalField())),
                    cost_of_goods_sold=Coalesce(Sum('cost_of_goods_sold'), Value(0, output_field=DecimalField())),
                    operating_expenses=Coalesce(Sum('operating_expenses'), Value(0, output_field=DecimalField())),
                    salary_expenses=Coalesce(Sum('salary_expenses'), Value(0, output_field=DecimalField())),
                    output_gst=Coalesce(Sum('output_gst'), Value(0, output_field=DecimalField())),
                    input_gst=Coalesce(Sum('input_gst'), Value(0, output_field=DecimalField())),
                )
                
                gross_profit = fin_summary["total_revenue"] - fin_summary["cost_of_goods_sold"]
                total_expenses = fin_summary["operating_expenses"] + fin_summary["salary_expenses"]
                net_profit_before_tax = gross_profit - total_expenses
                
                branch_cost_report["financial_summary"] = {
                    "total_revenue": fin_summary["total_revenue"],
                    "cost_of_goods_sold": fin_summary["cost_of_goods_sold"],
                    "operating_expenses": fin_summary["operating_expenses"],
                    "salary_expenses": fin_summary["salary_expenses"],
                    "output_gst": fin_summary["output_gst"],
                    "input_gst": fin_summary["input_gst"],
                    "gross_profit": gross_profit,
                    "total_expenses": total_expenses,
                    "net_profit_before_tax": net_profit_before_tax,
                }
                
                cost_categories = MonthlyCostCategory.objects.filter(monthly_summary__in=fin_qs).values(
                    "cost_category__name"
                ).annotate(
                    total_cost=Sum("cost")
                )
                branch_cost_report["categories"] = list(cost_categories)
                    
            branch_report["cost"] = branch_cost_report
            if "financial_summary" in branch_cost_report:
                fs = branch_cost_report["financial_summary"]
                global_cost_summary["total_revenue"] += fs["total_revenue"]
                global_cost_summary["cost_of_goods_sold"] += fs["cost_of_goods_sold"]
                global_cost_summary["total_expenses"] += fs["total_expenses"]
                global_cost_summary["net_profit_before_tax"] += fs["net_profit_before_tax"]

        # --- 4. PURCHASE ORDERS ---
        if "purchase_order" in report_types:
            po_qs = PurchaseOrder.objects.filter(
                branch=branch,
                created_at__date__range=[start_date, end_date]
            )
            po_summary = po_qs.aggregate(
                total_po_amount=Coalesce(Sum("total_amount"), Value(0, output_field=DecimalField())),
                total_orders=Coalesce(Sum(1), Value(0))
            )
            
            branch_pos = list(
                po_qs.values(
                    "id",
                    "status",
                    "total_amount",
                    "order_date",
                    supplier_name=F("supplier__name")
                ).order_by("-order_date")
            )
            branch_report["purchase_order"] = {
                "summary": po_summary,
                "orders": branch_pos
            }
            global_po_summary["total_po_amount"] += po_summary["total_po_amount"]
            global_po_summary["total_orders"] += po_summary["total_orders"]
            
        branch_data_list.append(branch_report)

    # Build General Summary
    general_summary = {}
    if "product" in report_types:
        general_summary["product"] = global_product_summary
    if "inventory" in report_types:
        general_summary["inventory"] = global_inventory_summary
    if "cost" in report_types:
        general_summary["cost"] = global_cost_summary
    if "purchase_order" in report_types:
        general_summary["purchase_order"] = global_po_summary

    data = {
        "filters_applied": filters,
        "general_summary": general_summary,
        "branch": branch_data_list
    }
    return data
