from decimal import Decimal, ROUND_HALF_UP

class TaxCalculator:
    @staticmethod
    def calculate_gst(base_amount, tax_rate, is_interstate=False):
        """
        Centrally calculates GST breakdown and total.
        Returns a dict with all components rounded to 2 decimal places.
        """
        if base_amount is None:
            base_amount = Decimal("0.00")
        if tax_rate is None:
            tax_rate = Decimal("0.00")
            
        tax_amount = (base_amount * tax_rate) / Decimal("100")
        tax_amount = tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        igst = Decimal("0.00")
        
        if is_interstate:
            igst = tax_amount
        else:
            cgst = (tax_amount / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sgst = tax_amount - cgst # Ensure sum matches exactly
            
        return {
            "base_amount": base_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "tax_rate": tax_rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "tax_amount": tax_amount,
            "cgst_amount": cgst,
            "sgst_amount": sgst,
            "igst_amount": igst,
            "total_amount": (base_amount + tax_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        }
