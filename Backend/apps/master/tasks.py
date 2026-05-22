from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
import base64


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 10},
    retry_backoff=True,
)
def send_email_task(
    self,
    *,
    to_email: str,
    subject: str,
    text_content: str | None = None,
    html_content: str | None = None,
    attachments: list | None = None,
):
    email_msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content or "",
        from_email=f"{settings.DEFAULT_FROM_NAME_EMAIL} <{settings.DEFAULT_FROM_EMAIL}>",
        to=[to_email],
    )

    if html_content:
        email_msg.attach_alternative(html_content, "text/html")

    if attachments:
        for attachment in attachments:
            content_bytes = base64.b64decode(attachment["content"])
            email_msg.attach(attachment["name"], content_bytes, "application/pdf")

    email_msg.send(fail_silently=False)
