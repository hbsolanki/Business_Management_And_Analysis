
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

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; border-radius: 12px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">BizVisionary</h1>
            </div>
            <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin-bottom: 24px; text-align: center;">Your Username Request</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello,</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">You requested your username. Here are your account details:</p>
            <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 700; color: #2563eb;">{username}</span>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">If you did not request this information, please ignore this email.</p>
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 8px;">&copy; BizVisionary Support</p>
        </div>
    </div>
    """

    send_email_task.delay(
        to_email=to_email,
        subject="Your Username",
        text_content=text,
        html_content=html,
    )



