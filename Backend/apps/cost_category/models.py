from apps.core.model import BaseModel
from apps.business_app.models import Business
from django.db import models
from apps.product.models import Product



class CostCategory(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "bma_cost_category"
        indexes = [models.Index(fields=["business"])]


class MonthlyFinancialSummary(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)

    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()

    revenue = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    products_total_cost = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    total_cost = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    net_profit_before_tax = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    net_profit_after_tax= models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    gross_profit=models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    taxes = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    salary_expenditure=models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    input_gst = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    output_gst = models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)
    gst_payable=models.DecimalField(default=0,max_digits=12, decimal_places=2,blank=True, null=True)

    invoice_count = models.PositiveIntegerField(default=0,blank=True, null=True)

    class Meta:
        db_table = "bma_monthly_financial_summary"
        constraints = [
            models.UniqueConstraint(
                fields=["business", "year", "month"],
                name="uniq_business_month_year"
            )
        ]
        indexes = [
            models.Index(fields=["business", "year", "month"])
        ]

class MonthlyProductPerformance(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True,blank=True)
    monthly_summary = models.ForeignKey(MonthlyFinancialSummary, on_delete=models.CASCADE,related_name="product_performance")
    quantity = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    revenue = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "bma_monthly_product_performance"
        constraints = [
            models.UniqueConstraint(
                fields=["monthly_summary", "product"],
                name="uniq_month_product"
            )
        ]
        indexes = [
            models.Index(fields=["monthly_summary"])
        ]



class MonthlyCostCategory(models.Model):
    cost_category = models.ForeignKey(CostCategory, on_delete=models.SET_NULL, null=True,blank=True)
    monthly_summary = models.ForeignKey(MonthlyFinancialSummary, on_delete=models.CASCADE, related_name="cost_category_items")
    cost=models.DecimalField(max_digits=10, decimal_places=2)
    class Meta:
        db_table = "bma_monthly_cost_category"
        constraints = [
            models.UniqueConstraint(
                fields=["monthly_summary", "cost_category"],
                name="uniq_month_cost_category"
            )
        ]
        indexes = [
            models.Index(fields=["monthly_summary"])
        ]




