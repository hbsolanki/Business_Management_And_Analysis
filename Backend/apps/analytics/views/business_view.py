from rest_framework.viewsets import ViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import date
from rest_framework.decorators import action
import calendar
from django.db.models.functions import TruncMonth
from django.db.models import Sum

# fro
from apps.invoice.models import Invoice

class AnalysisBusinessViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    # @action(detail=False, methods=["get"], url_path="business/turnover")
    # def business_turnover(self, request):
    #     products = Product.objects.all()
    #     serializer = ProductDetailsSerializer(products, many=True)
    #     return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="business/netprofit")
    def business_turnover(self, request):
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")

        if not from_date or not to_date:
            return Response(
                {"error": "from_date and to_date are required (YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from_m, from_y = map(int, from_date.split("-"))
            to_m, to_y = map(int, to_date.split("-"))

            start_date = date(from_y, from_m, 1)

            # last day of to-month
            last_day = calendar.monthrange(to_y, to_m)[1]
            end_date = date(to_y, to_m, last_day)
        except ValueError:
            return Response(
                {"error": "Invalid format. Use MM-YYYY"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        monthly_data = (
            Invoice.objects.filter(created_at__date__range=(start_date, end_date),)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total_profit=Sum("sub_total"))
            .order_by("month")
        )
        return Response(monthly_data, status=status.HTTP_200_OK)

