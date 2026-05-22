from django.contrib.auth.models import Group, Permission
from apps.employee.models import WorkType, UserRole

WORK_TO_GROUP = {
    WorkType.INVOICE: "Invoice Access",
    WorkType.INVENTORY: "Inventory Access",
    WorkType.PRODUCT: "Product Access",
    WorkType.ANALYTICS: "Analytics Access",
    WorkType.SUPPLIER: "Supplier Access"
}

ROLE_TO_PERMISSIONS = {
    UserRole.OWNER: [
        "can_create_employee", 
        "can_create_manager",
        "add_business",
        "change_business",
        "view_business",
        "delete_business"
    ],
    UserRole.MANAGER: ["can_create_employee"],
    UserRole.EMPLOYEE: []
}


def get_permissions_by_codenames(app_label, codenames):
    """Fetch permissions based on app label and codenames."""
    return Permission.objects.filter(
        content_type__app_label=app_label,
        codename__in=codenames
    )


def sync_user_work_groups(user):
    """Sync user work-based permission groups."""
    if not user.pk:
        return user

    work_types = user.branch_works.values_list("work_type", flat=True)

    group_names = {
        WORK_TO_GROUP[w] for w in work_types if w in WORK_TO_GROUP
    }

    groups = Group.objects.filter(name__in=group_names)

    user.groups.set(
        list(groups) + list(user.groups.exclude(name__in=WORK_TO_GROUP.values()))
    )

    return user


def sync_user_role_permissions(user):
    """Sync user role-based permissions."""
    if not user.pk:
        return user

    role_obj = user.business_roles.order_by('role').first()
    role = role_obj.role if role_obj else None

    if role in ROLE_TO_PERMISSIONS:
        codenames = ROLE_TO_PERMISSIONS[role]
        permissions = Permission.objects.filter(codename__in=codenames)
        user.user_permissions.set(permissions)

    return user
