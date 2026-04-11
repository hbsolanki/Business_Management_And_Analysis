from celery import shared_task
from django.conf import settings
import sib_api_v3_sdk


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
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = settings.BREVO_API_KEY

    api_client = sib_api_v3_sdk.ApiClient(configuration)
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)

    email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        subject=subject,
        text_content=text_content,
        html_content=html_content,
        sender={
            "email": settings.DEFAULT_FROM_EMAIL,
            "name": settings.DEFAULT_FROM_EMAIL,
        },
        attachment=attachments,
    )

    try:
        api_instance.send_transac_email(email)
    except Exception as e:
        raise e
