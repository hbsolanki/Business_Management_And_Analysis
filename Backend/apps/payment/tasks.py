import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.db import transaction

from apps.payment.models import Payment, PaymentGatewayDetail
from apps.master.utils.text_choices import PaymentStatus

logger = logging.getLogger(__name__)

STALE_PAYMENT_HOURS = 24  # Stripe Checkout Sessions expire after 24 hours


@shared_task
def cleanup_stale_pending_payments():
    """Cancels expired pending Stripe checkout session payments after 24 hours."""
    cutoff = timezone.now() - timedelta(hours=STALE_PAYMENT_HOURS)

    stale_payment_ids = list(
        Payment.objects.filter(
            status=PaymentStatus.PENDING,
            created_at__lt=cutoff,
            gateway_detail__checkout_session_id__isnull=False,
        ).values_list("id", flat=True)
    )

    if not stale_payment_ids:
        logger.info("No stale pending payments found.")
        return

    cancelled_count = 0
    for payment_id in stale_payment_ids:
        try:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(
                    id=payment_id, status=PaymentStatus.PENDING
                )
                payment.status = PaymentStatus.CANCELLED
                payment.failure_reason = "Checkout session expired (auto-cleanup)"
                payment.failed_at = timezone.now()
                payment.save(update_fields=["status", "failure_reason", "failed_at"])
                cancelled_count += 1
        except Payment.DoesNotExist:
            # Already updated by a webhook or another process
            continue
        except Exception:
            logger.exception("Failed to cancel stale payment #%s", payment_id)

    logger.info(
        "Stale payment cleanup complete: %d/%d payments cancelled.",
        cancelled_count, len(stale_payment_ids),
    )
