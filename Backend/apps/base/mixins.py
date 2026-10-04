class DirtyFieldsMixin:
    """
    Mixin to track field-level changes on a model instance.
    Inherit this alongside BaseModel for models that need activity logging.

    Usage:
        class MyModel(DirtyFieldsMixin, BaseModel):
            ...

        # Before saving:
        changes = instance.get_dirty_fields()
        # {'status': {'old': 'PENDING', 'new': 'DELIVERED'}, ...}
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_state = self._as_dict()

    def _as_dict(self):
        return {
            f.attname: self.__dict__.get(f.attname)
            for f in self._meta.concrete_fields
            if f.attname in self.__dict__
        }

    def get_dirty_fields(self):
        new_state = self._as_dict()
        changes = {}

        for field, old_value in self._original_state.items():
            new_value = new_state.get(field)
            if old_value != new_value:
                changes[field] = {"old": old_value, "new": new_value}

        return changes
