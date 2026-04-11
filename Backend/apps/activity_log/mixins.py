from django.db.models.fields.files import FieldFile
from apps.activity_log.models import ActivityLog


class ActivityLogMixin:
    activity_module = ActivityLog.Module.OTHER

    # CREATE
    def perform_create(self, serializer):
        instance = serializer.save()

        # Handle models and non-model returns (like bulk dicts)
        has_id = hasattr(instance, 'id')
        target_model = instance.__class__.__name__ if has_id else serializer.__class__.__name__
        target_id = getattr(instance, 'id', None)
        message = f"Created {target_model}"

        business = getattr(self.request.user, 'business', None)
        if not business and has_id:
            # Handle unauthenticated owner registration (User model has business property)
            business = getattr(instance, 'business', None)

        if not business:
            return instance

        ActivityLog.objects.log(
            business=business,
            branch=getattr(self.request.user, 'branch', getattr(instance, 'branch', None)) if self.request.user.is_authenticated else getattr(instance, 'branch', None),
            actor=self.request.user if self.request.user.is_authenticated else instance,
            action=ActivityLog.Action.CREATE,
            module=self.activity_module,
            target_model=target_model,
            target_id=target_id,
            message=message,
        )

        return instance

    # UPDATE
    def perform_update(self, serializer):
        instance = serializer.instance
        old_state = instance._as_dict()

        instance = serializer.save()

        changes = {}
        for field, old_value in old_state.items():
            new_value = getattr(instance, field)
            
            # Special handling for potentially non-serializable objects (like ImageFieldFile)
            if isinstance(old_value, FieldFile) and isinstance(new_value, FieldFile):
                if old_value.name != new_value.name:
                    changes[field] = {"old": old_value.name, "new": new_value.name}
            elif old_value != new_value:
                # Basic check to ensure new_value is serializable or converted
                changes[field] = {"old": old_value, "new": new_value}

        if changes:
            changed_fields = ", ".join(changes.keys())
            business = getattr(self.request.user, 'business', None)
            if not business:
                return instance

            ActivityLog.objects.log(
                business=business,
                branch=getattr(self.request.user, 'branch', None),
                actor=self.request.user,
                action=ActivityLog.Action.UPDATE,
                module=self.activity_module,
                target_model=instance.__class__.__name__,
                target_id=instance.id,
                message=f"Updated {instance.__class__.__name__} ({changed_fields})",
                meta=changes
            )

        return instance

    # DELETE
    def perform_destroy(self, instance):
        ActivityLog.objects.log(
            business=self.request.user.business,
            branch=getattr(self.request.user, 'branch', None),
            actor=self.request.user,
            action=ActivityLog.Action.DELETE,
            module=self.activity_module,
            target_model=instance.__class__.__name__,
            target_id=instance.id,
            message=f"Deleted {instance.__class__.__name__}",
        )

        super().perform_destroy(instance)
