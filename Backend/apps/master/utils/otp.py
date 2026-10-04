import secrets
import string
import logging
from functools import wraps

from django.core.cache import cache
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status, serializers

from apps.master.tasks import send_otp_email

logger = logging.getLogger(__name__)


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
    # Pick 6 random digits and join them
    otp = ''.join(secrets.choice(string.digits) for _ in range(6))
    return otp


def generate_and_send_otp(identifier: str, email: str, purpose: str = "registration"):
    """
    Central utility to generate an OTP, enforce time-based rate limits (cooldown and max attempts),
    store the OTP in Redis, and dispatch the Celery email task.
    """
    # 1. Enforce 1-minute cooldown between requests
    cooldown_key = f"otp_send_cooldown_{identifier}"
    if cache.get(cooldown_key):
        raise serializers.ValidationError("Please wait 1 minute before requesting another OTP.")

    # 2. Track send attempts and enforce 3-minute rolling window limit
    send_attempt_key = f"otp_send_attempts_{identifier}"
    send_count = cache.get(send_attempt_key, 0)
    
    if send_count >= 3:
        raise serializers.ValidationError("You have requested OTP too many times. Please try again after 3 minutes.")

    # Increment attempt counter (3-minute window)
    if send_count == 0:
        cache.set(send_attempt_key, 1, 180) # 3 minutes
    else:
        try:
            cache.incr(send_attempt_key)
        except ValueError:
            cache.set(send_attempt_key, 1, 180)

    # Apply the cooldown
    cache.set(cooldown_key, True, 60) # 1 minute

    # 3. Determine purpose-specific cache keys
    if purpose == "forgot_password":
        otp_key = f"fp:{identifier}"
    else:
        otp_key = f"otp_registration_{identifier}"

    # 4. Generate and store OTP (10 min TTL)
    otp = generate_otp()
    cache.set(otp_key, otp, 600)

    # 5. Send via Celery task
    try:
        send_otp_email.delay(to_email=email, otp=otp, purpose=purpose)
    except Exception:
        logger.exception(f"Failed to dispatch Celery task for OTP {purpose} email")
        # Revert OTP generation and tracking if we failed to dispatch the email
        cache.delete(otp_key)
        cache.delete(cooldown_key)
        if send_count == 0:
            cache.delete(send_attempt_key)
        else:
            try:
                cache.decr(send_attempt_key)
            except ValueError:
                pass
        
        # Raise generic validation error so it translates to 400
        raise serializers.ValidationError("Email dispatch service is temporarily unavailable. Please try again later.")
    
    return True


def verify_otp(identifier_field="email", purpose="registration"):
    """
    Decorator to abstract and standardize OTP verification logic.

    :param identifier_field: The key in request.data to look for the identifier (e.g., "email" or "username").
                             Supports nested lookup like "user" if it's the root key for registration payload.
    :param purpose: Context of the OTP ("registration" or "forgot_password")
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(view_instance, request, *args, **kwargs):
            # Extract identifier dynamically based on payload structure
            identifier = request.data.get(identifier_field)
            if not identifier and "user" in request.data and isinstance(request.data["user"], dict):
                identifier = request.data["user"].get(identifier_field)
            
            if not identifier:
                return Response(
                    {"error": f"{identifier_field.capitalize()} is required for verification"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            identifier = identifier.strip().lower()
            
            # OTP is always at the root of request.data
            otp = request.data.get("otp")
            if not otp:
                return Response({"otp": "OTP is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Determine purpose-specific cache keys
            if purpose == "forgot_password":
                otp_key = f"fp:{identifier}"
                block_key = f"fp_block_{identifier}"
                attempt_key = f"fp_verify_attempts_{identifier}"
            else:
                # Default "registration" format
                otp_key = f"otp_registration_{identifier}"
                block_key = f"otp_block_{identifier}"
                attempt_key = f"otp_verify_attempts_{identifier}"

            # Check if user is temporarily blocked
            if cache.get(block_key):
                return Response(
                    {"otp": "This account is temporarily blocked due to too many attempts. Please try again after 1 hour."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            cached_otp = cache.get(otp_key)
            attempts = cache.get(attempt_key, 0)
            is_magic_otp = settings.DEBUG and str(otp) == "123456"

            # OTP Verification Logic
            if not is_magic_otp and (not cached_otp or str(cached_otp) != str(otp)):
                attempts += 1
                cache.set(attempt_key, attempts, 3600)

                if attempts >= 3:
                    cache.set(block_key, True, 3600)
                    return Response(
                        {"otp": "Too many invalid OTP attempts. Your account is now blocked for 1 hour."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                remaining = 3 - attempts
                return Response(
                    {"otp": f"Invalid or expired OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Execution
            response = view_func(view_instance, request, *args, **kwargs)

            # Cleanup logic on Success Response (2xx)
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                cache.delete(otp_key)
                cache.delete(attempt_key)
                
                if purpose == "registration":
                    cache.delete(f"otp_send_attempts_{identifier}")
                elif purpose == "forgot_password":
                    # Mark FP session as verified so user can proceed to reset
                    cache.set(f"fp_verified:{identifier}", True, 120)

            return response
            
        return _wrapped_view
    return decorator
