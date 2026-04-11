import secrets
import string

def mask_email(email):
    if not email or '@' not in email:
        return email

    username, domain = email.split('@', 1)
    if len(username) <= 4:
        masked_username = f"{username[0]}****"
    else:
        masked_username = f"{username[:2]}****{username[-2:]}"

    return f"{masked_username}@{domain}"

def generate_otp():
    # Generate a random integer between 1000 and 9999 is NOT safe for "0001" cases.
    # Instead, pick 4 random digits and join them.
    otp = ''.join(secrets.choice(string.digits) for _ in range(6))
    return otp