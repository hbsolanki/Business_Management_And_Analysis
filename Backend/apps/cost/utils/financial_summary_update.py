from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from apps.business.models import  Branch
from apps.cost.models import MonthlyProductPerformance, MonthlyFinancialSummary
from apps.invoice.models import Invoice, ProductInvoice


@transaction.atomic
def end_month_finance_update(business_id, month, year):
    """
    Centrally triggers a full financial and GST aggregation for the month.
    """
    from apps.gst_management.utils import aggregate_monthly_data

    return aggregate_monthly_data(month=month, year=year, business_id=business_id)


@transaction.atomic
def financial_summary_update(*,today=None,month=None,year=None):
    prev_date = today - timedelta(days=1)
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

        from apps.base.utils.tax import TaxCalculator
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

                # Use central TaxCalculator
                tax_data = TaxCalculator.calculate_gst(product.base_price * quantity, product_obj.input_gst_rate)
                l1_input_gst += tax_data["tax_amount"]

                monthly_product_performance, _ = MonthlyProductPerformance.objects.get_or_create(
                    monthly_summary=month_summary_data,
                    product=product_obj,
                    defaults={"quantity": 0, "cost": 0, "revenue": 0}
                )
                monthly_product_performance.quantity += quantity
                monthly_product_performance.cost += cost
                monthly_product_performance.revenue += product_revenue
                monthly_product_performance.save()

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
                end_month_finance_update(business.id, month, year)

    return f"Daily financial summary updated for {today}"
