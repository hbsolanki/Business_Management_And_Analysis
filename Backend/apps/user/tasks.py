
from celery import shared_task
from apps.master.tasks import send_email_task


@shared_task
def send_username_email(*, to_email: str, username: str):
    text = f"""
Hello,

You requested your username.

Username: {username}

If you did not request this, please ignore this email.

— BizVisionary Support
""".strip()

    send_email_task.delay(
        to_email=to_email,
        subject="Your Username",
        text_content=text,
    )

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

    send_email_task.delay(
        to_email=to_email,
        subject="Your OTP Code",
        text_content=text,
    )

