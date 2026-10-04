from django.apps import AppConfig

class GstManagementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.gst_management'

    def ready(self):
        # import apps.invoice.gst_management.signals
        pass
