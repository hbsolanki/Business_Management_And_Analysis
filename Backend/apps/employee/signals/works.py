from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Group, Permission
from apps.employee.models import UserBranchWork
from apps.employee.utils.permission_utils import sync_user_work_groups
from apps.employee.permission.role_permissions import MODULE_GROUPS

@receiver(post_migrate)
def create_work_groups(sender, **kwargs):
    """Create module groups and assign base permissions when migration is complete."""
    if sender.name == 'apps.employee':
        for group_name, app_labels in MODULE_GROUPS.items():
            group, _ = Group.objects.get_or_create(name=group_name)
            perms = Permission.objects.filter(content_type__app_label__in=app_labels)
            group.permissions.set(perms)


@receiver(post_save, sender=UserBranchWork)
def update_user_work_groups(sender, instance, **kwargs):
    """Update work groups when UserBranchWork is saved."""
    sync_user_work_groups(instance.user)
