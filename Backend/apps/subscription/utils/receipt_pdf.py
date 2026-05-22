import io
from django.template.loader import render_to_string
from xhtml2pdf import pisa


def generate_subscription_pdf(subscription, user):
    """
    Generate a professional PDF receipt for a subscription using xhtml2pdf (Pure Python).
    Returns bytes.
    """
    context = {
        "user_name": user.get_full_name() or user.username,
        "user_email": user.email,
        "subscription_id": subscription.id,
        "plan_name": subscription.plan_name,
        "price": subscription.price,
        "duration_days": subscription.duration_days,
        "start_date": subscription.start_date.strftime("%d %b %Y"),
        "end_date": subscription.end_date.strftime("%d %b %Y"),
        "payment_date": subscription.payment_date.strftime("%d %b %Y")
        if subscription.payment_date
        else "N/A",
        "transaction_id": subscription.payment_reference or "N/A",
    }

    # 1. Render HTML as a string
    html_string = render_to_string("subscription_receipt.html", context)

    # 2. Use a Byte Stream to hold the PDF data in memory
    result = io.BytesIO()

    # 3. Create the PDF
    pisa_status = pisa.CreatePDF(src=html_string, dest=result)

    # 4. Check for errors
    if pisa_status.err:
        # In a real app, you might want to log pisa_status.err here
        return None

    # 5. Extract bytes and close the stream
    pdf_bytes = result.getvalue()
    result.close()

    return pdf_bytes
