from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver
from apps.employee.models import UserRole, UserBusinessRole
from apps.employee.permission.role_permissions import ROLE_PERMISSIONS
from apps.employee.utils.permission_utils import get_permissions_by_codenames


@receiver(post_migrate)
def create_roles(sender, **kwargs):
    """Create roles and assign permissions when migration is complete."""
    # Run role creation once when the employee app is migrated
    if sender.name == 'apps.employee':
        for role, config in ROLE_PERMISSIONS.items():
            group, _ = Group.objects.get_or_create(name=role)

            if config == "__all__":
                group.permissions.set(Permission.objects.all())
                continue

            if config == "__manager__":
                all_perms = Permission.objects.exclude(
                    content_type__app_label='business',
                    codename__in=[
                        'add_business', 'change_business', 'delete_business',
                        'add_branch', 'change_branch', 'delete_branch'
                    ]
                ).exclude(
                    content_type__app_label='user',
                    codename__in=['can_create_owner', 'can_create_manager']
                ).exclude(
                    codename__in=[
                        'change_owner_role', 'change_manager_role',
                        'change_branch_manager', 'change_manager_salary'
                    ]
                )
                group.permissions.set(all_perms)
                continue

            permissions = Permission.objects.none()

            if isinstance(config, dict):
                for app_label, codenames in config.items():
                    permissions |= get_permissions_by_codenames(app_label, codenames)

            group.permissions.set(permissions)




@receiver(post_save, sender=UserBusinessRole)
def sync_user_role_on_business_role_save(sender, instance, **kwargs):
    """Sync Django groups (roles and works) when UserBusinessRole is created or changed."""
    user = instance.user
    role = instance.role
    if role:
        # Add new role group
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.add(group)

        # Remove other role groups to ensure single role policy
        for r in UserRole.values:
            if r != role:
                old_group = Group.objects.filter(name=r).first()
                if old_group:
                    user.groups.remove(old_group)
