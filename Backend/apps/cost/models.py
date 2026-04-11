from django.db import models
from apps.base.models import BaseModel
from apps.business.models import Business, Branch
from apps.product.models import Product


from decimal import Decimal

class MonthlyFinancialSummary(BaseModel):
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="monthly_finance_summary"
    )

    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()

    # Revenue
    total_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    invoice_count = models.PositiveIntegerField(default=0)

    # Costs
    cost_of_goods_sold = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    operating_expenses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    salary_expenses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    # Taxation
    output_gst = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    input_gst = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "bma_monthly_financial_summary"
        constraints = [
            models.UniqueConstraint(
                fields=["business", "branch", "year", "month"],
                name="uniq_business_branch_year_month"
            )
        ]
        indexes = [
            models.Index(fields=["business", "branch", "year", "month"])
        ]

    # Derived Properties
    @property
    def gross_profit(self):
        return self.total_revenue - self.cost_of_goods_sold

    @property
    def total_expenses(self):
        return self.operating_expenses + self.salary_expenses

    @property
    def net_profit_before_tax(self):
        return self.gross_profit - self.total_expenses

    @property
    def gst_payable(self):
        return self.output_gst - self.input_gst

class MonthlyProductPerformance(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True,blank=True)
    monthly_summary = models.ForeignKey(MonthlyFinancialSummary, on_delete=models.CASCADE,related_name="product_performance")
    quantity = models.PositiveIntegerField()
    cost = models.DecimalField(default=0,max_digits=10, decimal_places=2)
    revenue = models.DecimalField(default=0,max_digits=10, decimal_places=2)

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


class CostCategory(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "bma_cost_category"
        indexes = [models.Index(fields=["business"])]


class MonthlyCostCategory(BaseModel):
    cost_category = models.ForeignKey(CostCategory, on_delete=models.SET_NULL, null=True,blank=True)
    monthly_summary = models.ForeignKey(MonthlyFinancialSummary, on_delete=models.CASCADE, related_name="cost_category_items")
    cost=models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "bma_monthly_cost_category"
        constraints = [
            models.UniqueConstraint(
                fields=["monthly_summary", "cost_category"],
                name="uniq_month_cost_category",
                condition=models.Q(is_deleted=False)
            )
        ]
        indexes = [
            models.Index(fields=["monthly_summary"])
        ]








