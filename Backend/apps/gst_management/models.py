from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from apps.base.models import BaseModel
from apps.business.models import Business

class MonthlyGSTSummary(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="monthly_gst_summaries")
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)]) # 1-12
    year = models.IntegerField()
    
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_tax_collected = models.DecimalField(max_digits=15, decimal_places=2, default=0.00) # Output GST
    
    cgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    igst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    # Input GST (from Purchases)
    total_purchases = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    input_gst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    input_cgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    input_sgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    input_igst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Operational Costs (from Expenses)
    total_expenses = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    expense_gst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    expense_cgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    expense_sgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    expense_igst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    net_gst_payable = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    class Meta:
        app_label = "gst_management"
        db_table = "bma_monthly_gst_summary"
        ordering = ["-year", "-month"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "month", "year"], 
                name="unique_monthly_gst_summary_per_business"
            )
        ]
        indexes = [
            models.Index(fields=["business", "-year", "-month"]),
        ]

    def __str__(self):
        return f"{self.business.name} - {self.month}/{self.year} Monthly Summary"

