import io
from django.template.loader import render_to_string
from xhtml2pdf import pisa


def generate_invoice_pdf(invoice):
    # Calculate tax
    tax_amount = float(invoice.total_amount) - float(invoice.sub_total)

    # Render Django template to HTML string
    html_string = render_to_string(
        "invoice.html",
        {
            "invoice": invoice,
            "tax_amount": tax_amount,
        },
    )

    # Create a file-like buffer to receive PDF data
    result = io.BytesIO()

    # Convert HTML to PDF
    pisa_status = pisa.CreatePDF(
        src=html_string,
        dest=result
    )

    # Return None or raise error if conversion failed
    if pisa_status.err:
        return None

    # Get the value from the buffer
    pdf = result.getvalue()
    result.close()

    return pdf