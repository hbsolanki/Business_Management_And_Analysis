import io
from django.template.loader import render_to_string
from xhtml2pdf import pisa


def generate_report_pdf(report_data, business_name, start_date, end_date):
    """
    Generates a PDF using xhtml2pdf (Pure Python) based on unified analytics report data.
    """
    # 1. Render your existing Django template to an HTML string
    html_string = render_to_string(
        "analytics_report.html",
        {
            "report_data": report_data,
            "business_name": business_name,
            "start_date": start_date,
            "end_date": end_date,
        },
    )

    # 2. Create a buffer to store the PDF bytes
    result = io.BytesIO()

    # 3. Convert HTML to PDF
    # pisa.CreatePDF is the engine that does the heavy lifting
    pisa_status = pisa.CreatePDF(
        src=html_string,
        dest=result
    )

    # 4. Check for errors during conversion
    if pisa_status.err:
        # You can log the error here if needed
        return None

    # 5. Get the raw bytes to return to your view
    pdf_bytes = result.getvalue()
    result.close()

    return pdf_bytes