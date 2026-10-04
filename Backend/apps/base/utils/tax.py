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

    @staticmethod
    def apply_order_totals(order, items):
        """
        Calculates totals from order items and applies them to the order's GST object.
        Creates a new GST object if the order doesn't have one.
        Saves the updated total_amount on the order.
        """
        total_tax_val = sum(item.gst.gst_amount for item in items if getattr(item, "gst", None))
        cgst_total_val = sum(item.gst.cgst_amount for item in items if getattr(item, "gst", None))
        sgst_total_val = sum(item.gst.sgst_amount for item in items if getattr(item, "gst", None))
        igst_total_val = sum(item.gst.igst_amount for item in items if getattr(item, "gst", None))
        total_amount_val = sum(item.subtotal for item in items) + total_tax_val
        
        avg_gst_rate = ((total_tax_val / (total_amount_val - total_tax_val)) * Decimal("100")).quantize(Decimal("0.01")) if total_amount_val > total_tax_val else Decimal("0.00")

        from apps.base.serializers.gst import GSTSerializer
        
        gst_data = {
            "gst_rate": avg_gst_rate,
            "gst_amount": total_tax_val,
            "cgst_amount": cgst_total_val,
            "sgst_amount": sgst_total_val,
            "igst_amount": igst_total_val,
            "total_amount": total_amount_val
        }
        
        if order.gst:
            gst_serializer = GSTSerializer(order.gst, data=gst_data, partial=True)
            gst_serializer.is_valid(raise_exception=True)
            gst_serializer.save()
        else:
            gst_serializer = GSTSerializer(data=gst_data)
            gst_serializer.is_valid(raise_exception=True)
            order.gst = gst_serializer.save()

        order.total_amount = total_amount_val
        order.save(update_fields=["total_amount", "gst"])
        return order
