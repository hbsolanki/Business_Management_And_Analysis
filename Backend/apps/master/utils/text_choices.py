from django.db import models


class UserRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    MANAGER = "MANAGER", "Manager"
    EMPLOYEE = "EMPLOYEE", "Employee"


class WorkType(models.TextChoices):
    PRODUCT = "PRODUCT", "Production"
    INVENTORY = "INVENTORY", "Inventory"
    ANALYTICS = "ANALYTICS", "Analytics"
    INVOICE = "INVOICE", "Invoice"
    SUPPLIER = "SUPPLIER", "Supplier"


class GSTRegistrationType(models.TextChoices):
    REGULAR = "REGULAR", "Regular"
    COMPOSITION = "COMPOSITION", "Composition"
    UNREGISTERED = "UNREGISTERED", "Unregistered"


class GenderType(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"


class InventoryTransactionAction(models.TextChoices):
    IN = "IN", "Stock In"
    OUT = "OUT", "Stock Out"


class ActivityLogAction(models.TextChoices):
    CREATE = "CREATE", "Create"
    UPDATE = "UPDATE", "Update"
    DELETE = "DELETE", "Delete"
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    PURCHASE = "PURCHASE", "Purchase"
    CUSTOM = "CUSTOM", "Custom"


class ActivityLogModule(models.TextChoices):
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


class ITCType(models.TextChoices):
    INPUTS = "INPUTS", "Inputs"
    INPUT_SERVICES = "INPUT_SERVICES", "Input Services"
    CAPITAL_GOODS = "CAPITAL_GOODS", "Capital Goods"


class AiChatMessageSenderChoices(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"


class NotificationActionType(models.TextChoices):
    TASK_ASSIGNED = "TASK_ASSIGNED", "Task Assigned"
    TASK_COMPLETED = "TASK_COMPLETED", "Task Completed"
    TASK_UPDATED = "TASK_UPDATED", "Task Updated"
    COMMENT = "COMMENT", "Comment"
    SUBSCRIPTION_PURCHASED = "SUBSCRIPTION_PURCHASED", "Subscription Purchased"
    INVOICE_PAID = "INVOICE_PAID", "Invoice Paid"
    SYSTEM = "SYSTEM", "System"
    LOW_STOCK_ALERT = "LOW_STOCK_ALERT", "Low Stock Alert"
    MESSAGE_BROADCAST = "MESSAGE_BROADCAST", "Message Broadcast"


class ReminderRecurrenceChoices(models.TextChoices):
    NONE = "NONE", "None"
    DAILY = "DAILY", "Daily"
    WEEKLY = "WEEKLY", "Weekly"
    MONTHLY = "MONTHLY", "Monthly"


class TaskStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class MessageType(models.TextChoices):
    TEXT = "TEXT", "Text"
    IMAGE = "IMAGE", "Image"
    VIDEO = "VIDEO", "Video"
    FILE = "FILE", "File"


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentType(models.TextChoices):
    INVOICE = "INVOICE", "Invoice"
    SUBSCRIPTION = "SUBSCRIPTION", "Subscription"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    CHEQUE = "CHEQUE", "Cheque"
    UPI = "UPI", "UPI"
    NEFT = "NEFT", "NEFT"
    RTGS = "RTGS", "RTGS"
    IMPS = "IMPS", "IMPS"
    NET_BANKING = "NET_BANKING", "Net Banking"
    CARD = "CARD", "Card (Debit/Credit)"
    OTHER = "OTHER", "Other"

class OfflinePaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    CHEQUE = "CHEQUE", "Cheque"
    UPI = "UPI", "UPI"
    NEFT = "NEFT", "NEFT"
    RTGS = "RTGS", "RTGS"
    IMPS = "IMPS", "IMPS"
    NET_BANKING = "NET_BANKING", "Net Banking"
    OTHER = "OTHER", "Other"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially Refunded"
    CANCELLED = "CANCELLED", "Cancelled"


class InvoicePaymentStatus(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
    PAID = "PAID", "Paid"


class PaymentGateway(models.TextChoices):
    STRIPE = "STRIPE", "Stripe"


class StripeAccountType(models.TextChoices):
    EXPRESS = "EXPRESS", "Express"
    STANDARD = "STANDARD", "Standard"


class StripeAccountStatus(models.TextChoices):
    PENDING = "PENDING", "Pending Onboarding"
    ACTIVE = "ACTIVE", "Active"              # charges_enabled=True
    RESTRICTED = "RESTRICTED", "Restricted"  # partial KYC
    DISABLED = "DISABLED", "Disabled"        # manually disabled

