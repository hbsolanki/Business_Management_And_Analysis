from django.db.models import Sum, Count, Q
from apps.master.utils.text_choices import PaymentMethod, PaymentStatus

def compute_payment_summary(queryset, amount_field="amount", status_field="status", method_field="method"):
    """
    Compute payment aggregates for a queryset.
    Consolidates all metrics and method breakdowns into EXACTLY ONE database query without loops.
    """
    aggregates = queryset.aggregate(
        total_sum=Sum(amount_field),
        total_count=Count('id'),
        paid_sum=Sum(amount_field, filter=Q(**{status_field: PaymentStatus.SUCCEEDED})),
        paid_count=Count('id', filter=Q(**{status_field: PaymentStatus.SUCCEEDED})),
        pending_sum=Sum(amount_field, filter=Q(**{f"{status_field}__in": [PaymentStatus.PENDING, 'PROCESSING']})),
        pending_count=Count('id', filter=Q(**{f"{status_field}__in": [PaymentStatus.PENDING, 'PROCESSING']})),
        refunded_failed_sum=Sum(amount_field, filter=Q(**{f"{status_field}__in": [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.FAILED]})),
        refunded_failed_count=Count('id', filter=Q(**{f"{status_field}__in": [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.FAILED]})),
        method_sum_card=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.CARD})),
        method_sum_cash=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.CASH})),
        method_sum_cheque=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.CHEQUE})),
        method_sum_neft=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.NEFT})),
        method_sum_rtgs=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.RTGS})),
        method_sum_imps=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.IMPS})),
        method_sum_upi=Sum(amount_field, filter=Q(**{method_field: PaymentMethod.UPI})),
    )

    method_summary = {
        PaymentMethod.CARD.value: float(aggregates["method_sum_card"] or 0),
        PaymentMethod.CASH.value: float(aggregates["method_sum_cash"] or 0),
        PaymentMethod.CHEQUE.value: float(aggregates["method_sum_cheque"] or 0),
        PaymentMethod.NEFT.value: float(aggregates["method_sum_neft"] or 0),
        PaymentMethod.RTGS.value: float(aggregates["method_sum_rtgs"] or 0),
        PaymentMethod.IMPS.value: float(aggregates["method_sum_imps"] or 0),
        PaymentMethod.UPI.value: float(aggregates["method_sum_upi"] or 0),
    }

    return {
        "total": float(aggregates["total_sum"] or 0),
        "totalCount": aggregates["total_count"] or 0,
        "paid": float(aggregates["paid_sum"] or 0),
        "paidCount": aggregates["paid_count"] or 0,
        "pending": float(aggregates["pending_sum"] or 0),
        "pendingCount": aggregates["pending_count"] or 0,
        "refunded_failed": float(aggregates["refunded_failed_sum"] or 0),
        "refunded_failed_count": aggregates["refunded_failed_count"] or 0,
        "methods": method_summary,
    }
