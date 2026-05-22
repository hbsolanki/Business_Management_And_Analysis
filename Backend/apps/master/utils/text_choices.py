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
