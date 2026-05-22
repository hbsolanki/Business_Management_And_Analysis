from decimal import Decimal
from apps.base.models import GST
from django.db.models import Sum, F, Count
from django.db import transaction
from apps.invoice.models import Invoice, ProductInvoice
from apps.supplier.models import PurchaseOrder, SalesOrder, OrderStatus
from apps.cost.models import Expense, MonthlyFinancialSummary, MonthlyCostCategory, CostCategory, MonthlyProductPerformance
from apps.gst_management.models import MonthlyGSTSummary
from apps.business.models import Business, Branch
from apps.user.models import User


from django.utils import timezone
import calendar
from datetime import datetime

def aggregate_monthly_data(*, month, year, business_id=None):
    """
    Optimized monthly aggregation for businesses.
    Uses date ranges for better index performance and minimizes DB round-trips.
    """
    # Calculate date range for the month
    start_date = datetime(year, month, 1, tzinfo=timezone.get_current_timezone())
    last_day = calendar.monthrange(year, month)[1]
    end_date = datetime(year, month, last_day, 23, 59, 59, 999999, tzinfo=timezone.get_current_timezone())
    
    # Range for DateField models (Expense uses DateField)
    start_date_only = start_date.date()
    end_date_only = end_date.date()

    businesses = Business.objects.filter(is_deleted=False)
    if business_id:
        businesses = businesses.filter(id=business_id)
    
    for business in businesses:
        with transaction.atomic():
            # 1. Base Querysets for the month (Using ranges for index performance)
            sales_qs = Invoice.objects.filter(business=business, created_at__range=(start_date, end_date), is_deleted=False)
            so_qs = SalesOrder.objects.filter(business=business, created_at__range=(start_date, end_date), is_deleted=False, invoices__isnull=True)
            po_qs = PurchaseOrder.objects.filter(business=business, received_at__range=(start_date, end_date), status=OrderStatus.DELIVERED, is_deleted=False)
            expense_qs = Expense.objects.filter(business=business, date__range=(start_date_only, end_date_only), is_deleted=False)

            # 2. Global Business-wide Aggregations
            sales_agg = sales_qs.aggregate(
                total_rev=Sum('total_amount'), total_sub_total=Sum('sub_total'), total_tax=Sum(F('total_amount') - F('sub_total')),
                cgst=Sum('gst__cgst_amount'), sgst=Sum('gst__sgst_amount'), igst=Sum('gst__igst_amount'),
                inv_count=Count('id')
            )
            total_cogs = ProductInvoice.objects.filter(invoice__in=sales_qs).aggregate(
                cogs=Sum(F('quantity') * F('product__cost_price'))
            )['cogs'] or Decimal("0.00")
            # Sales Order Aggregation (Corrected for missing gst field and join duplication)
            total_so_rev = so_qs.aggregate(total=Sum('total_amount'))['total'] or Decimal("0.00")
            so_tax_agg = so_qs.aggregate(
                tax=Sum('items__gst__gst_amount'),
                cgst=Sum('items__gst__cgst_amount'),
                sgst=Sum('items__gst__sgst_amount'),
                igst=Sum('items__gst__igst_amount')
            )
            po_agg = po_qs.aggregate(
                total_purch=Sum('total_amount'), total_tax=Sum('gst__gst_amount'),
                cgst=Sum('gst__cgst_amount'), sgst=Sum('gst__sgst_amount'), igst=Sum('gst__igst_amount')
            )
            exp_agg = expense_qs.aggregate(
                total_amt=Sum('gst__total_amount'), total_tax=Sum('gst__gst_amount'),
                cgst=Sum('gst__cgst_amount'), sgst=Sum('gst__sgst_amount'), igst=Sum('gst__igst_amount'),
                base=Sum('amount')
            )
            salary_val = User.objects.filter(business_roles__business=business, is_deleted=False).aggregate(total_sal=Sum('employee_details__salary'))['total_sal'] or Decimal("0.00")

            total_out_rev = (sales_agg['total_rev'] or Decimal("0")) + total_so_rev
            total_out_net_rev = (sales_agg['total_sub_total'] or Decimal("0")) + total_so_rev - (so_tax_agg['tax'] or Decimal("0"))
            total_out_tax = (sales_agg['total_tax'] or Decimal("0")) + (so_tax_agg['tax'] or Decimal("0"))
            total_in_tax = (po_agg['total_tax'] or Decimal("0")) + (exp_agg['total_tax'] or Decimal("0"))

            summary_obj, created = MonthlyGSTSummary.objects.update_or_create(
                business=business, month=month, year=year,
                defaults={
                    "total_sales": total_out_rev,
                    "total_tax_collected": total_out_tax,
                    "cgst_total": (sales_agg['cgst'] or Decimal("0")) + (so_tax_agg['cgst'] or Decimal("0")),
                    "sgst_total": (sales_agg['sgst'] or Decimal("0")) + (so_tax_agg['sgst'] or Decimal("0")),
                    "igst_total": (sales_agg['igst'] or Decimal("0")) + (so_tax_agg['igst'] or Decimal("0")),
                    "total_purchases": po_agg['total_purch'] or Decimal("0"),
                    "input_gst_total": po_agg['total_tax'] or Decimal("0"),
                    "input_cgst_total": po_agg['cgst'] or Decimal("0"),
                    "input_sgst_total": po_agg['sgst'] or Decimal("0"),
                    "input_igst_total": po_agg['igst'] or Decimal("0"),
                    "total_expenses": exp_agg['total_amt'] or exp_agg['base'] or Decimal("0"),
                    "expense_gst_total": exp_agg['total_tax'] or Decimal("0"),
                    "expense_cgst_total": exp_agg['cgst'] or Decimal("0"),
                    "expense_sgst_total": exp_agg['sgst'] or Decimal("0"),
                    "expense_igst_total": exp_agg['igst'] or Decimal("0"),
                    "net_gst_payable": total_out_tax - total_in_tax
                }
            )

            # Update Global Financial Summary
            fin_summary, _ = MonthlyFinancialSummary.objects.update_or_create(
                business=business, branch=None, month=month, year=year,
                defaults={
                    "total_revenue": total_out_net_rev,
                    "output_gst": total_out_tax,
                    "input_gst": total_in_tax,
                    "operating_expenses": exp_agg['base'] or Decimal("0"),
                    "salary_expenses": salary_val,
                    "cost_of_goods_sold": total_cogs,
                    "invoice_count": sales_agg['inv_count'] or 0
                }
            )

            # Business-wide Product Performance
            perf_data = ProductInvoice.objects.filter(invoice__in=sales_qs).values('product').annotate(
                qty=Sum('quantity'), rev=Sum(F('quantity') * F('selling_price')), cost=Sum(F('quantity') * F('product__cost_price'))
            )
            
            perf_objs = [
                MonthlyProductPerformance(
                    monthly_summary=fin_summary, product_id=p['product'],
                    quantity=p['qty'], revenue=p['rev'] or 0, cost=p['cost'] or 0
                ) for p in perf_data if p['product']
            ]
            MonthlyProductPerformance.objects.bulk_create(
                perf_objs, update_conflicts=True, 
                unique_fields=['monthly_summary', 'product'], 
                update_fields=['quantity', 'revenue', 'cost']
            )

            # 3. Optimized Branch-specific Aggregations (Consolidated Queries)
            branches = Branch.objects.filter(business=business, is_deleted=False)
            b_sales_map = {d['branch']: d for d in sales_qs.values('branch').annotate(
                total_rev=Sum('total_amount'), total_sub_total=Sum('sub_total'), total_tax=Sum(F('total_amount') - F('sub_total')), inv_count=Count('id')
            )}
            
            # Consolidated Branch COGS and Performance data to avoid redundant queries
            b_perf_qs = ProductInvoice.objects.filter(invoice__in=sales_qs).values('invoice__branch', 'product').annotate(
                qty=Sum('quantity'), rev=Sum(F('quantity') * F('selling_price')), cost=Sum(F('quantity') * F('product__cost_price'))
            )
            
            b_cogs_map = {}
            b_perf_map = {}
            for d in b_perf_qs:
                br_id = d['invoice__branch']
                b_cogs_map[br_id] = b_cogs_map.get(br_id, Decimal("0")) + (d['cost'] or Decimal("0"))
                if br_id not in b_perf_map:
                    b_perf_map[br_id] = []
                b_perf_map[br_id].append(d)

            b_so_rev_map = {d['branch']: d['total'] for d in so_qs.values('branch').annotate(total=Sum('total_amount'))}
            b_so_tax_map = {d['branch']: d for d in so_qs.values('branch').annotate(tax=Sum('items__gst__gst_amount'))}
            b_po_map = {d['branch']: d for d in po_qs.values('branch').annotate(total_tax=Sum('gst__gst_amount'))}
            b_exp_map = {d['branch']: d for d in expense_qs.values('branch').annotate(base=Sum('amount'), tax=Sum('gst__gst_amount'))}
            b_sal_map = {d['assigned_branches__branch']: d['total_sal'] for d in User.objects.filter(business_roles__business=business, is_deleted=False).values('assigned_branches__branch').annotate(total_sal=Sum('employee_details__salary'))}

            branch_perf_to_create = []
            for branch in branches:
                s_d = b_sales_map.get(branch.id, {})
                so_rev = b_so_rev_map.get(branch.id) or Decimal("0")
                so_tax = b_so_tax_map.get(branch.id, {}).get('tax') or Decimal("0")
                p_d = b_po_map.get(branch.id, {})
                e_d = b_exp_map.get(branch.id, {})
                
                br_rev = (s_d.get('total_sub_total') or Decimal("0")) + (so_rev - so_tax)
                br_out = (s_d.get('total_tax') or Decimal("0")) + so_tax
                br_in = (p_d.get('total_tax') or Decimal("0")) + (e_d.get('tax') or Decimal("0"))
                
                b_fin_summary, _ = MonthlyFinancialSummary.objects.update_or_create(
                    business=business, branch=branch, month=month, year=year,
                    defaults={
                        "total_revenue": br_rev,
                        "output_gst": br_out,
                        "input_gst": br_in,
                        "operating_expenses": e_d.get('base') or Decimal("0"),
                        "salary_expenses": b_sal_map.get(branch.id) or Decimal("0"),
                        "cost_of_goods_sold": b_cogs_map.get(branch.id) or Decimal("0.00"),
                        "invoice_count": s_d.get('inv_count') or 0
                    }
                )

                # Collect Branch-specific Product Performance for bulk create
                for p in b_perf_map.get(branch.id, []):
                    if p['product']:
                        branch_perf_to_create.append(
                            MonthlyProductPerformance(
                                monthly_summary=b_fin_summary, product_id=p['product'],
                                quantity=p['qty'], revenue=p['rev'] or 0, cost=p['cost'] or 0
                            )
                        )

            if branch_perf_to_create:
                MonthlyProductPerformance.objects.bulk_create(
                    branch_perf_to_create, update_conflicts=True,
                    unique_fields=['monthly_summary', 'product'],
                    update_fields=['quantity', 'revenue', 'cost']
                )

            # 4. Optimized Cost Category Aggregation
            cat_expenses = expense_qs.values('category').annotate(
                base=Sum('amount'), tax=Sum('gst__gst_amount'),
                cgst=Sum('gst__cgst_amount'), sgst=Sum('gst__sgst_amount'),
                igst=Sum('gst__igst_amount'), total=Sum('gst__total_amount')
            )
            
            # Pre-fetch existing summaries and cost categories to minimize queries in the loop
            existing_summaries = {
                obj.cost_category_id: obj for obj in 
                MonthlyCostCategory.objects.filter(monthly_summary=fin_summary).select_related('gst')
            }
            cat_map = {c.id: c for c in CostCategory.objects.filter(id__in=[d['category'] for d in cat_expenses if d['category']])}

            for c_d in cat_expenses:
                cat_id = c_d['category']
                if not (cat_id and cat_id in cat_map):
                    continue
                
                cat_obj = cat_map[cat_id]
                base_amt, tax_amt = c_d['base'] or Decimal("0"), c_d['tax'] or Decimal("0")
                
                gst_defaults = {
                    "gst_rate": ((tax_amt / base_amt) * Decimal("100")).quantize(Decimal("0.01")) if base_amt > 0 else cat_obj.gst_rate,
                    "gst_amount": tax_amt,
                    "cgst_amount": c_d['cgst'] or Decimal("0"),
                    "sgst_amount": c_d['sgst'] or Decimal("0"),
                    "igst_amount": c_d['igst'] or Decimal("0"),
                    "total_amount": c_d['total'] or Decimal("0")
                }

                if cat_id in existing_summaries:
                    cat_summary_obj = existing_summaries[cat_id]
                    if cat_summary_obj.gst:
                        GST.objects.filter(id=cat_summary_obj.gst.id).update(**gst_defaults)
                    else:
                        new_gst = GST.objects.create(**gst_defaults)
                        cat_summary_obj.gst = new_gst
                    cat_summary_obj.cost = base_amt
                    cat_summary_obj.save()
                else:
                    new_gst = GST.objects.create(**gst_defaults)
                    MonthlyCostCategory.objects.create(
                        monthly_summary=fin_summary, 
                        cost_category=cat_obj,
                        cost=base_amt,
                        gst=new_gst
                    )
    return True
