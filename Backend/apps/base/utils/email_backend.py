import os
import logging
from django.conf import settings
from django.core.mail.backends.filebased import EmailBackend as FileEmailBackend

logger = logging.getLogger(__name__)

class DebugEmailBackend(FileEmailBackend):
    def __init__(self, *args, **kwargs):
        # Set file path to Backend/debug_emails.log
        base_path = getattr(settings, 'BASE_DIR', os.getcwd())
        kwargs['file_path'] = os.path.join(base_path, 'debug_emails.log')
        super().__init__(*args, **kwargs)

    def send_messages(self, email_messages):
        # Log a warning about Brevo IP whitelisting
        logger.warning(
            "\n" + "!"*60 +
            "\nWARNING: Email delivery failed via Brevo (likely IP Whitelist issue)." +
            "\nThe OTP has been saved to: Backend/debug_emails.log" +
            "\nTo enable real emails, please whitelist your IP at:" +
            "\nhttps://app.brevo.com/security/authorised_ips" +
            "\n" + "!"*60 + "\n"
        )
        
        return super().send_messages(email_messages)
