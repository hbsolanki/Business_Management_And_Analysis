from rest_framework import serializers
from apps.activity_log.models import ActivityLog
from apps.master.serializers.user import UserBasicDetailsSerializer
from apps.business.serializers.branch import BranchSerializer

class ActivityLogSerializer(serializers.ModelSerializer):
    actor_details = UserBasicDetailsSerializer(source="actor", read_only=True)
    branch_details = BranchSerializer(source="branch", read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    module_display = serializers.CharField(source="get_module_display", read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "business",
            "branch",
            "branch_details",
            "actor",
            "actor_details",
            "action",
            "action_display",
            "module",
            "module_display",
            "target_model",
            "target_id",
            "message",
            "meta",
            "created_at",
        ]
