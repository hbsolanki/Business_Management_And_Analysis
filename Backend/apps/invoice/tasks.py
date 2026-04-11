
from celery import shared_task
import base64
from apps.invoice.utils.invoice_pdf import generate_invoice_pdf
from apps.master.tasks import send_email_task
from apps.invoice.models import Invoice


@shared_task
def send_invoice_email(*, to_email: str, invoice_id: int):
    invoice = Invoice.objects.filter(id=invoice_id).first()
    if not invoice:
        return
    
    try:
        pdf_bytes = generate_invoice_pdf(invoice)
        encoded_pdf = base64.b64encode(pdf_bytes).decode()
    except Exception:
        return
    
    send_email_task.delay(
        to_email=to_email,
        subject=f"BizVisionary Invoice #{invoice.id}",
        html_content=f"<h3>Hello,</h3><p>Please find your invoice for #{invoice.id} from BizVisionary attached.</p>",
        attachments=[
            {
                "content": encoded_pdf,
                "name": f"BizVisionary_Invoice_{invoice.id}.pdf",
            }
        ],
    )
