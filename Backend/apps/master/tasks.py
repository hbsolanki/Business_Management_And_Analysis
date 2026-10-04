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


@shared_task
def send_otp_email(*, to_email: str, otp: str, purpose: str = "verification"):
    text = f"""
Hello,

Your One-Time Password (OTP) for {purpose} is:

OTP: {otp}

This OTP is valid for 3 minutes.
Do NOT share this OTP with anyone.

If you did not request this, please ignore this email.

— BizVisionary Support
""".strip()

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">BizVisionary</h1>
            </div>
            <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin-bottom: 24px; text-align: center;">Verification Code</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello,</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your One-Time Password (OTP) for <strong>{purpose}</strong> is:</p>
            <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px; border: 1px dashed #cbd5e1;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #2563eb;">{otp}</span>
            </div>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 32px; text-align: center; background-color: #fffbeb; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                This OTP is valid for <strong>3 minutes</strong>.<br>Do NOT share this code with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">If you did not request this code, please ignore this email.</p>
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 8px;">&copy; BizVisionary Support</p>
        </div>
    </div>
    """

    send_email_task.delay(
        to_email=to_email,
        subject="Your OTP Code",
        text_content=text,
        html_content=html,
    )
