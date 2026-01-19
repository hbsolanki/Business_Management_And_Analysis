from celery import shared_task
from  .models import Invoice
from datetime import datetime
from django.core.mail import send_mail

# @shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=5, retry_kwargs={"max_retries": 3})
# def send_invoice(self, invoice_id):
#     invoice = Invoice.objects.get(id=invoice_id)
#     print("Try sending email")
#     print("mail is:",invoice.customer.email )
#     send_mail("test email","Django Local email",None,[invoice.customer.email],fail_silently=False)
#
#     return "Email sent successfully"