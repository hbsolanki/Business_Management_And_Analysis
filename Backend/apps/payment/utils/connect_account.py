from django.utils import timezone
from apps.payment.models import StripeConnectAccount
from apps.master.utils.text_choices import StripeAccountStatus

def sync_connect_account(connect_account: StripeConnectAccount, stripe_account):
    """Sync Stripe account flags into our StripeConnectAccount model."""
    connect_account.charges_enabled = stripe_account.charges_enabled
    connect_account.payouts_enabled = stripe_account.payouts_enabled
    connect_account.details_submitted = stripe_account.details_submitted

    if stripe_account.charges_enabled and connect_account.status != StripeAccountStatus.ACTIVE:
        connect_account.status = StripeAccountStatus.ACTIVE
        connect_account.onboarded_at = timezone.now()
    elif not stripe_account.charges_enabled and connect_account.status == StripeAccountStatus.ACTIVE:
        connect_account.status = StripeAccountStatus.RESTRICTED

    connect_account.save(update_fields=[
        "charges_enabled", "payouts_enabled", "details_submitted",
        "status", "onboarded_at",
    ])
