import json
from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.fields.files import FieldFile
from apps.base.models import BaseModel
from apps.user.models import User
from apps.business.models import Business, Branch

class ActivityLogJSONEncoder(DjangoJSONEncoder):
    def default(self, o):
        if isinstance(o, FieldFile):
            return o.url if o else None
        return super().default(o)

class ActivityLogManager(models.Manager):
    def log(self, business, actor, action, module, branch=None, target_model=None, target_id=None, message="", meta=None):
        if meta:
            # Sanitize meta to be JSON serializable (handles datetime, uuid, etc)
            meta = json.loads(json.dumps(meta, cls=ActivityLogJSONEncoder))

        log_instance = self.create(
            business=business,
            branch=branch,
            actor=actor,
            action=action,
            module=module,
            target_model=target_model or "",
            target_id=target_id,
            message=message,
            meta=meta or {}
        )

        try:
            from apps.activity_log.utils import broadcast_activity_log
            broadcast_activity_log(log_instance)
        except Exception:
            pass

        return log_instance

class ActivityLog(BaseModel):

    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE" , "Delete"
        LOGIN = "LOGIN", "Login"
        LOGOUT = "LOGOUT", "Logout"
        PURCHASE = "PURCHASE", "Purchase"
        CUSTOM = "CUSTOM", "Custom"

    class Module(models.TextChoices):
        USER = "USER", "User"
        BUSINESS = "BUSINESS", "Business"
        CHAT = "CHAT", "Chat"
        COST = "COST", "Cost"
        ANALYTICS = "ANALYTICS", "Analytics"
        INVENTORY = "INVENTORY", "Inventory"
        INVOICE = "INVOICE", "Invoice"
        PRODUCT = "PRODUCT", "Product"
        NOTIFICATION = "NOTIFICATION", "Notification"
        SUBSCRIPTION = "SUBSCRIPTION", "Subscription"
        SUPPLIER = "SUPPLIER", "Supplier"
        TASKS = "TASKS", "Tasks"
        OTHER = "OTHER", "Other"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="activity_logs", null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="activity_logs")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="activities")

    action = models.CharField(max_length=20, choices=Action.choices)
    module = models.CharField(max_length=20, choices=Module.choices, default=Module.OTHER)

    # what object affected
    target_model = models.CharField(max_length=100, blank=True)
    target_id = models.IntegerField(null=True, blank=True)
    message = models.TextField()

    meta = models.JSONField(default=dict, blank=True)  # optional extra info

    objects = ActivityLogManager()

    class Meta:
        db_table = 'bma_activity_log'
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.module}] {self.action} - {self.message} by {self.actor or 'System'}"
