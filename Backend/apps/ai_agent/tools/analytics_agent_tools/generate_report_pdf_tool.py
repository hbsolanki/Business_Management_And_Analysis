import logging
import uuid
import boto3
from django.conf import settings
from asgiref.sync import sync_to_async
from datetime import datetime
from apps.ai_agent.utils.context import current_user_context
from apps.user.models import User
from apps.analytics.utils.report_calc import calculate_report_data
from apps.analytics.utils.report_pdf import generate_report_pdf

logger = logging.getLogger(__name__)

async def generate_report_pdf_tool(start_date: str, end_date: str, report_types: str = "all") -> dict:
    """
    Generates a comprehensive Business Analytics PDF Report for the given date range.
    Uploads it securely to S3 and returns a presigned download URL.
    Provide start_date and end_date in YYYY-MM-DD format.
    report_types: comma-separated string containing specific report types: "product", "inventory", "cost", "gst", "purchase_order". Defaults to "all".
    """
    ctx = current_user_context.get()
    if not ctx or not ctx.get("user_id"):
        return {"error": "User context not found."}

    user_id = ctx.get("user_id")

    try:
        # Fetch user securely and extract lazy-loaded properties safely
        def get_user_data():
            u = User.objects.get(id=user_id)
            return u, u.business.name if u.business else "Unknown_Business"
            
        user, business_name = await sync_to_async(get_user_data)()
        
        # Parse dates
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()

        # Parse and map report types
        if report_types and report_types.lower() != "all":
            selected_types = [t.strip().lower() for t in report_types.split(",")]
            report_type_filter = []
            for t in selected_types:
                if t in ["product", "sales", "product performance"]:
                    report_type_filter.extend(["product", "sales"])
                elif t in ["cost", "expenses", "costs"]:
                    report_type_filter.extend(["cost", "expenses"])
                elif t in ["gst", "tax", "gst compliance"]:
                    report_type_filter.extend(["gst", "tax"])
                elif t in ["purchase_order", "purchase orders"]:
                    report_type_filter.extend(["purchase_order"])
                elif t in ["inventory"]:
                    report_type_filter.extend(["inventory"])
        else:
            report_type_filter = ["sales", "expenses", "tax", "product", "inventory", "cost", "purchase_order", "gst"]

        # Generate Data
        filters = {"start_date": start, "end_date": end, "report_type": report_type_filter}
        report_data = await sync_to_async(calculate_report_data)(user, filters)
        
        logger.info(f"DEBUG PDF DATES: {start_date} to {end_date}")
        logger.info(f"DEBUG PDF DATA: {report_data}")

        # Generate PDF Bytes
        pdf_bytes = await sync_to_async(generate_report_pdf)(
            report_data=report_data, 
            business_name=business_name, 
            start_date=start_date, 
            end_date=end_date
        )

        if not pdf_bytes:
            return {"error": "Failed to generate PDF buffer."}

        # Upload to S3
        safe_business = "".join([c if c.isalnum() else "_" for c in business_name])
        file_key = f"bma/chat/reports/{safe_business}_{start_date}_to_{end_date}_{uuid.uuid4().hex[:8]}.pdf"
        
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        await sync_to_async(s3.put_object)(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=file_key,
            Body=pdf_bytes,
            ContentType="application/pdf"
        )

        # Generate Presigned URL (Valid for 1 hour)
        url = await sync_to_async(s3.generate_presigned_url)(
            'get_object',
            Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': file_key},
            ExpiresIn=3600
        )

        return {
            "success": True,
            "message": "Successfully generated report PDF. Include the markdown_link exactly as provided in your response.",
            "url": url,
            "markdown_link": f"📄 [**Download Analytics Report ({start_date} to {end_date})**]({url})"
        }
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}")
        return {"error": str(e)}
