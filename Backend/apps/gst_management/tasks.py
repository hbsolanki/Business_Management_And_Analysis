from celery import shared_task
from apps.gst_management.utils import aggregate_monthly_data

@shared_task
def update_gst_summary_task(business_id, month, year):
    """
    Celery task to trigger GST summary calculation for a specific business and month.
    """
    return aggregate_monthly_data(month=month, year=year, business_id=business_id)
