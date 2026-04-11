from celery import shared_task
import base64
from apps.analytics.utils.report_pdf import generate_report_pdf
from apps.master.tasks import send_email_task
import json


@shared_task
def send_analytics_report_email(*, to_email: str, business_name: str, start_date: str, end_date: str, report_data_json: str):
    report_data = json.loads(report_data_json)
    
    try:
        pdf_bytes = generate_report_pdf(
            report_data=report_data, 
            business_name=business_name, 
            start_date=start_date, 
            end_date=end_date
        )
        encoded_pdf = base64.b64encode(pdf_bytes).decode()
    except Exception as e:
        print(f"Failed to generate analytics PDF: {e}")
        return

    # Create safe filename out of business name and dates
    safe_business_name = "".join([c if c.isalnum() else "_" for c in business_name])
    filename = f"{safe_business_name}_Analytics_{start_date}_to_{end_date}.pdf"
    
    html_content = f"""
    <h3>Hello,</h3>
    <p>Please find attached the requested comprehensive Business Analytics Report for <strong>{business_name}</strong>.</p>
    <p>This report covers the period from <strong>{start_date}</strong> to <strong>{end_date}</strong>.</p>
    <br>
    <p>Thank you,</p>
    <p>The BizVisionary Team</p>
    """

    send_email_task.delay(
        to_email=to_email,
        subject=f"Business Analytics Report: {business_name}",
        html_content=html_content,
        attachments=[
            {
                "content": encoded_pdf,
                "name": filename,
            }
        ],
    )
