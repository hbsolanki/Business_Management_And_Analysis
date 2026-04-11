from decimal import Decimal
from celery import shared_task
from datetime import  date, timedelta
from django.db import transaction
from django.db.models import Sum
from apps.business.models import Business, Branch
from apps.cost.models import MonthlyCostCategory
from apps.cost.models import MonthlyProductPerformance, MonthlyFinancialSummary
from apps.invoice.models import Invoice, ProductInvoice
from apps.user.models import User


@transaction.atomic
def end_month_finance_update(month_summary_data: MonthlyFinancialSummary, business: Business, branch: Branch):
    total_operating_expenses = Decimal("0")

    cost_categories = MonthlyCostCategory.objects.filter(monthly_summary=month_summary_data)
    for cost_category in cost_categories:
        total_operating_expenses += cost_category.cost

    total_salary_expenses = (
        User.objects.filter(business_roles__business=business, assigned_branches__branch=branch).aggregate(Sum("employee_details__salary"))["employee_details__salary__sum"] or Decimal("0")
    )

    month_summary_data.operating_expenses = total_operating_expenses
    month_summary_data.salary_expenses = total_salary_expenses

    month_summary_data.save(
        update_fields=[
            "operating_expenses",
            "salary_expenses",
        ]
    )


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=5, retry_kwargs={"max_retries": 3})
@transaction.atomic
def daily_financial_summary_update(self):
    today = date.today()
    # today = date(2026, 2, 1)

    prev_date = today - timedelta(days=1)
    month = prev_date.month
    year = prev_date.year

    branches = Branch.objects.all()

    for branch in branches:
        business = branch.business
        new_month = False
        month_summary_data = MonthlyFinancialSummary.objects.filter(
            business=business, branch=branch, year=year, month=month
        ).first()

        if not month_summary_data:
            new_month = True
            month_summary_data = MonthlyFinancialSummary.objects.create(
                business=business, branch=branch, year=year, month=month
            )

        revenue = Decimal("0")
        products_total_cost = Decimal("0")
        input_gst = Decimal("0")
        output_gst = Decimal("0")
        invoice_count = 0

        invoices_prev_date = Invoice.objects.filter(business=business, branch=branch, created_at__date=prev_date)

        for invoice in invoices_prev_date:
            revenue += invoice.sub_total
            output_gst += (invoice.total_amount - invoice.sub_total)

            l1_input_gst = Decimal("0")
            l1_product_total_cost = Decimal("0")

            products_invoice = ProductInvoice.objects.select_related("product").filter(invoice=invoice)

            for product in products_invoice:
                product_obj = product.product
                quantity = Decimal(product.quantity)

                cost = product_obj.cost_price * quantity
                product_revenue = product.selling_price * quantity

                l1_product_total_cost += cost

                l1_input_gst += quantity * (
                    (product.base_price * product_obj.input_gst_rate) / Decimal("100")
                )

                monthly_product_performance = MonthlyProductPerformance.objects.filter(
                    monthly_summary=month_summary_data, product=product_obj
                ).first()

                if monthly_product_performance:
                    monthly_product_performance.quantity += quantity
                    monthly_product_performance.cost += cost
                    monthly_product_performance.revenue += product_revenue

                    monthly_product_performance.save(update_fields=["quantity", "cost", "revenue"])
                else:
                    MonthlyProductPerformance.objects.create(
                        monthly_summary=month_summary_data,
                        product=product_obj,
                        quantity=quantity,
                        cost=cost,
                        revenue=product_revenue,
                    )

            products_total_cost += l1_product_total_cost
            input_gst += l1_input_gst

        invoice_count = len(invoices_prev_date)

        if new_month:
            month_summary_data.total_revenue = revenue
            month_summary_data.cost_of_goods_sold = products_total_cost
            month_summary_data.input_gst = input_gst
            month_summary_data.output_gst = output_gst
            month_summary_data.invoice_count = invoice_count

            month_summary_data.save(
                update_fields=["total_revenue", "cost_of_goods_sold", "input_gst", "output_gst", "invoice_count"]
            )
        else:
            month_summary_data.total_revenue += revenue
            month_summary_data.cost_of_goods_sold += products_total_cost
            month_summary_data.input_gst += input_gst
            month_summary_data.output_gst += output_gst
            month_summary_data.invoice_count += invoice_count

            month_summary_data.save(
                update_fields=["total_revenue", "cost_of_goods_sold", "input_gst", "output_gst", "invoice_count"]
            )

            if today.day == 1:
                end_month_finance_update(month_summary_data, business, branch)

    return f"Daily financial summary updated for {today}"
