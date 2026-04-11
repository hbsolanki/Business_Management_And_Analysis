import base64
from celery import shared_task
from django.template.loader import render_to_string
from django.utils import timezone
from apps.master.tasks import send_email_task
from apps.business.models import Business, Branch
from apps.product.models import Product
from apps.subscription.models import Subscription
from apps.subscription.utils.entitlements import get_active_subscription
from apps.subscription.utils.receipt_pdf import generate_subscription_pdf
from apps.user.models import User

@shared_task
def send_subscription_email(*, subscription_id: int, user_id: int):
    subscription = Subscription.objects.filter(id=subscription_id).first()
    user = User.objects.filter(id=user_id).first()
    
    if not subscription or not user or not user.email:
        return

    subject = f"Subscription Activated: {subscription.plan_name}"
    
    # Context for HTML body
    context = {
        'user_name': user.get_full_name() or user.username,
        'subscription_id': subscription.id,
        'plan_name': subscription.plan_name,
        'price': subscription.price,
        'duration_days': subscription.duration_days,
        'start_date': subscription.start_date.strftime('%d %b %Y'),
        'end_date': subscription.end_date.strftime('%d %b %Y'),
    }
    
    html_content = render_to_string('subscription_receipt.html', context)
    
    # Generate PDF
    try:
        pdf_bytes = generate_subscription_pdf(subscription, user)
        encoded_pdf = base64.b64encode(pdf_bytes).decode()
    except Exception:
        return

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
    Find expired subscriptions, deactivate extra branches/products for their businesses,
    and then delete the expired subscriptions.
    """
    now = timezone.now()
    expired_subs = Subscription.objects.filter(end_date__lt=now)
    
    for sub in expired_subs:
        business = sub.business
        
        if not business.is_active:
            continue
            
        branches = Branch.objects.filter(business=business, is_active=True).order_by('-is_default', 'created_at')
        if branches.count() > 1:
            Branch.objects.filter(id__in=branches[1:].values_list('id', flat=True)).update(is_active=False)
            
        products = Product.objects.filter(business=business, is_active=True).order_by('created_at')
        if products.count() > 1:
            Product.objects.filter(id__in=products[1:].values_list('id', flat=True)).update(is_active=False)

        staff = User.objects.filter(business_roles__business=business, is_active=True).order_by('created_at')
        if staff.count() > 1:
            User.objects.filter(id__in=staff[1:].values_list('id', flat=True)).update(is_active=False)
            
    expired_subs.delete()
