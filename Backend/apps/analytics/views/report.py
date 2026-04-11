import json
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema

from apps.subscription.permissions import AdvancedAnalyticsFeaturePermission
from apps.base.views.base_view import BaseViewSet
from apps.analytics.serializers.report import ReportGenerateSerializer
from apps.business.models import Branch
from apps.analytics.tasks import send_analytics_report_email
from apps.analytics.utils.report_calc import calculate_report_data
from apps.activity_log.models import ActivityLog

class ReportViewSet(BaseViewSet):
    permission_classes = [AdvancedAnalyticsFeaturePermission]
    serializer_class = ReportGenerateSerializer

    def get_queryset(self):
        return Branch.objects.none()


    @extend_schema(
        summary="Generate Analytics Report",
        request=ReportGenerateSerializer,
        responses={200: {}}
    )
    @action(detail=False, methods=["post"], url_path="generate")
    def report(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data
        
        user = request.user
        start_date = filters.get("start_date")
        end_date = filters.get("end_date")
        
        # Use the utility to calculate data
        data = calculate_report_data(user, filters)
        
        report_data_json = json.dumps(data, cls=DjangoJSONEncoder)

        # Always trigger the background email task
        send_analytics_report_email.delay(
            to_email=user.email,
            business_name=user.business.name,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            report_data_json=report_data_json
        )
        
        # Log the activity
        ActivityLog.objects.log(
            business=user.business,
            actor=user,
            action=ActivityLog.Action.CUSTOM,
            module=ActivityLog.Module.ANALYTICS,
            message=f"Generated analytics report for {start_date} to {end_date}",
            meta={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "report_types": filters.get("report_type", [])
            }
        )
        
        return Response({
            "detail": "Analytics report is being generated and will be sent to your email.",
        }, status=status.HTTP_202_ACCEPTED)
