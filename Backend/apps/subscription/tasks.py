import base64
from celery import shared_task
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from apps.master.tasks import send_email_task
from apps.business.models import Branch
from apps.product.models import Product
from apps.subscription.models import Subscription
from apps.subscription.utils.receipt_pdf import generate_subscription_pdf
from apps.user.models import User
from apps.master.utils.text_choices import UserRole


@shared_task
def send_subscription_email(*, subscription_id: int, user_id: int):
    subscription = Subscription.objects.filter(id=subscription_id).first()
    user = User.objects.filter(id=user_id).first()

    if not subscription or not user or not user.email:
        return

    subject = f"Subscription Activated: {subscription.plan_name}"

    # Context for HTML body
    context = {
        "user_name": user.get_full_name() or user.username,
        "subscription_id": subscription.id,
        "plan_name": subscription.plan_name,
        "price": subscription.price,
        "duration_days": subscription.duration_days,
        "start_date": subscription.start_date.strftime("%d %b %Y"),
        "end_date": subscription.end_date.strftime("%d %b %Y"),
    }

    html_content = render_to_string("subscription_receipt.html", context)

    # Generate PDF
    pdf_bytes = generate_subscription_pdf(subscription, user)
    if not pdf_bytes:
        return
    encoded_pdf = base64.b64encode(pdf_bytes).decode()

    send_email_task.delay(
        to_email=user.email,
        subject=subject,
        html_content=html_content,
        attachments=[
            {
                "content": encoded_pdf,
                "name": f"BizVisionary_Receipt_{subscription.id}.pdf",
            }
        ],
    )


@shared_task
def deactivate_expired_subscriptions():
    """
    Find expired active subscriptions and either roll over to a queued paid subscription
    or enforce free-tier style resource limits.
    Expired subscriptions are retained for audit and marked inactive.
    """
    now = timezone.now()
    expired_sub_ids = list(
        Subscription.objects.filter(is_active=True, end_date__lt=now).values_list(
            "id", flat=True
        )
    )

    for sub_id in expired_sub_ids:
        with transaction.atomic():
            try:
                sub = Subscription.objects.select_for_update().get(
                    id=sub_id, is_active=True
                )
            except Subscription.DoesNotExist:
                continue

            business = sub.business
            if not business.is_active:
                continue

            # Check if there is a queued paid subscription waiting to start
            queued_sub = (
                Subscription.objects.select_for_update()
                .filter(
                    business=business,
                    is_active=False,
                    start_date__lte=now,
                    end_date__gt=now,
                    status=Subscription.SubscriptionStatus.ACTIVE,
                )
                .first()
            )

            if queued_sub:
                # Roll over to the queued subscription
                sub.is_active = False
                sub.status = Subscription.SubscriptionStatus.SUPERSEDED
                sub.save(update_fields=["is_active", "status"])

                queued_sub.is_active = True
                queued_sub.status = Subscription.SubscriptionStatus.ACTIVE
                queued_sub.save(update_fields=["is_active", "status"])
                continue

            # No queued plan: transition to free-tier and deactivate excess resources
            branches = Branch.objects.filter(
                business=business, is_active=True
            ).order_by("-is_default", "created_at")
            if branches.count() > 1:
                Branch.objects.filter(
                    id__in=branches[1:].values_list("id", flat=True)
                ).update(is_active=False)

            products = Product.objects.filter(
                business=business, is_active=True
            ).order_by("created_at")
            if products.count() > 1:
                Product.objects.filter(
                    id__in=products[1:].values_list("id", flat=True)
                ).update(is_active=False)

            staff = (
                User.objects.filter(
                    business_roles__business=business,
                    is_active=True,
                )
                .exclude(business_roles__role=UserRole.OWNER)
                .order_by("created_at")
            )
            if staff.count() > 1:
                User.objects.filter(
                    id__in=staff[1:].values_list("id", flat=True)
                ).update(is_active=False)

            sub.is_active = False
            sub.status = Subscription.SubscriptionStatus.EXPIRED
            sub.expired_at = now
            sub.save(update_fields=["is_active", "status", "expired_at"])
