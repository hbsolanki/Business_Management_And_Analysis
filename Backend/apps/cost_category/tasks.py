from celery import shared_task
from datetime import datetime,date,timedelta
from django.db import transaction
from django.db.models import Sum

from apps.analytics.utils.tax_calculation import calculate_tax_on_net_profit

from apps.business_app.models import Business
from apps.cost_category.models import MonthlyFinancialSummary,MonthlyProductPerformance,MonthlyCostCategory
from apps.invoice.models import Invoice,ProductInvoice
from apps.product.models import Product
from apps.user.models import User

def end_month_finance_update(month_summary_data:MonthlyFinancialSummary,business:Business):
    total_cost_from_cost_category=0

    cost_categorys=MonthlyCostCategory.objects.all(month_summary=month_summary_data)
    for cost_category in cost_categorys:
        total_cost_from_cost_category+=cost_category.cost

    month_summary_data.gross_profit=month_summary_data.revenue-month_summary_data.products_total_cost  ## CHECK
    month_summary_data.total_cost+=(month_summary_data.products_total_cost+total_cost_from_cost_category)
    total_salary_expenditure=User.objects.filter(business=business).aggregate(Sum("salary"))
    month_summary_data.salary_expenditure=total_salary_expenditure
    month_summary_data.net_profit_before_tax=(month_summary_data.gross_profit-total_cost_from_cost_category-total_salary_expenditure)
    taxes=calculate_tax_on_net_profit(month_summary_data.net_profit_before_tax)
    month_summary_data.taxes=taxes
    month_summary_data.net_profit_after_tax=month_summary_data.net_profit_before_tax-taxes
    month_summary_data.gst_payable=month_summary_data.output_gst-month_summary_data.input_gst

    month_summary_data.save(update_fields=["gross_profit","total_cost","salary_expenditure","net_profit_before_tax","taxes","net_profit_after_tax","gst_payable"])





@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=5, retry_kwargs={"max_retries": 3})
@transaction.atomic
def daily_financial_summary_update(self):
    today = date.today()
    prev_date = today.replace(day=1) - timedelta(days=1)
    end_month=False
    if today.day == 1:
        end_month=True
        month = prev_date.month
        year = prev_date.year
    else:
        month = today.month
        year = today.year


    businesses = Business.objects.all()

    for business in businesses:
        new_month=False
        month_summary_data=MonthlyFinancialSummary.objects.filter(business=business,year=year,month=month)
        if not month_summary_data:
            new_month=True
            month_summary_data=MonthlyFinancialSummary.objects.create(business=business,year=year,month=month)

        revenue = 0
        products_total_cost = 0
        # net_profit = 0
        # gross_profit=0
        # taxes = 0
        input_gst = 0
        output_gst = 0
        invoice_count=0
        # product_performance=[]
        invoices_prev_date=Invoice.objects.filter(business=business,created_at_=prev_date)

        for invoice in invoices_prev_date:
            revenue += invoice.sub_total
            output_gst+=(invoice.total_amount-invoice.sub_total)
            l1_input_gst = 0
            l1_product_total_cost = 0
            l1_revenue = 0

            products_invoice=ProductInvoice.objects.filter(invoice=invoice)
            for product in products_invoice:
                product_id=product.id
                product_obj=Product.objects.get(id=product_id)
                quantity=product.quantity
                cost=product_obj.cost_price*quantity
                revenue = product.base_price * quantity
                l1_product_total_cost+=cost
                l1_input_gst+=(quantity*((product.base_price*product_obj.input_gst_rate)/100))
                l1_revenue+=revenue


                monthly_product_performance=MonthlyProductPerformance.objects.filter(monthly_summary=month_summary_data,product=product_obj)
                if monthly_product_performance:
                    monthly_product_performance.quantity+=quantity
                    monthly_product_performance.cost+=cost
                    monthly_product_performance.revenue+=revenue

                    monthly_product_performance.save(update_fields=["quantity","cost","revenue"])
                else:
                    MonthlyProductPerformance.objects.create(monthly_summary=month_summary_data,product=product_obj,quantity=quantity,cost=cost,revenue=revenue)


            products_total_cost+=l1_product_total_cost
            revenue+=l1_revenue
            input_gst+=l1_input_gst


        invoice_count = len(invoices_prev_date)

        if new_month:
            month_summary_data.save(update_fields=["revenue","products_total_cost","input_gst","output_gst","invoice_count"])
        else:
            month_summary_data.revenue+=revenue
            month_summary_data.products_total_cost+=products_total_cost
            month_summary_data.input_gst+=input_gst
            month_summary_data.output_gst+=output_gst
            month_summary_data.invoice_count+=invoice_count
            month_summary_data.save(update_fields=["revenue","products_total_cost","input_gst","output_gst","invoice_count"])
            if end_month:
                end_month_finance_update(month_summary_data,business)


    return f"Daily financial summary updated for {today}"



