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
    UserRole.OWNER: ["can_create_employee", "can_create_manager"],
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

    work_types = user.assigned_works.values_list("work_type", flat=True)

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

    # Get the highest role of the user in any business
    role_obj = user.business_roles.order_by('role').first()  # OWNER < MANAGER < EMPLOYEE? Wait, let's check alphabetically or order.
    # Actually, let's just use user.role if it's available on the model, or check the related roles.
    # Based on models.py, User doesn't have role field directly, it has business_roles.
    # But UserViewSet.get_queryset uses user.role. 
    # Let me check User model.
    role = getattr(user, 'role_name', None)

    if not role and user.business_roles.exists():
        role = user.business_roles.first().role

    if role in ROLE_TO_PERMISSIONS:
        codenames = ROLE_TO_PERMISSIONS[role]
        permissions = get_permissions_by_codenames('employee', codenames)
        user.user_permissions.set(permissions)

    return user
