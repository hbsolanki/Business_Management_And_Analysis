import os
from django.core.mail.backends.filebased import EmailBackend as FileEmailBackend
from django.conf import settings

class DebugEmailBackend(FileEmailBackend):
    def __init__(self, *args, **kwargs):
        # Set file path to Backend/debug_emails.log
        base_path = getattr(settings, 'BASE_DIR', os.getcwd())
        kwargs['file_path'] = os.path.join(base_path, 'debug_emails.log')
        super().__init__(*args, **kwargs)

    def send_messages(self, email_messages):
        # Print a loud warning about Brevo IP whitelisting
        print("\n" + "!"*60)
        print("WARNING: Email delivery failed via Brevo (likely IP Whitelist issue).")
        print("The OTP has been saved to: Backend/debug_emails.log")
        print("To enable real emails, please whitelist your IP at:")
        print("https://app.brevo.com/security/authorised_ips")
        print("!"*60 + "\n")
        
        return super().send_messages(email_messages)
