from celery import shared_task
from datetime import date, timedelta
from django.db import transaction
from apps.gst_management.utils import aggregate_monthly_data


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=5, retry_kwargs={"max_retries": 3})
@transaction.atomic
def daily_financial_summary_update(self):
    """
    Daily task to trigger global financial and GST aggregation for all businesses.
    """
    today = date.today()
    # today = date(2026, 2, 1)

    prev_date = today - timedelta(days=1)
    month = prev_date.month
    year = prev_date.year

    # 1. Trigger global monthly aggregation for GST, base financials, and product performance
    aggregate_monthly_data(month=month, year=year)

    return f"Daily financial summary updated for {today} (Month: {month}, Year: {year})"
