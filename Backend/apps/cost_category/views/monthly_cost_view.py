from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from apps.cost_category.services.monthly_cost_category import monthly_cost_category_create
from apps.cost_category.models import MonthlyCostCategory,MonthlyFinancialSummary
from apps.cost_category.serializers.monthly_cost_category import MonthlyAllCostCategoryCreateSerializer,MonthlyCostCategoryUpdateSerializer,MonthlyCostCategoryReadSerializer
from datetime import datetime


class MonthlyCostCategoryViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return MonthlyFinancialSummary.objects.filter(business=user.business)

    def get_serializer_class(self):
        if self.action == "monthly_cost_category":
            return MonthlyAllCostCategoryCreateSerializer
        if self.action == "monthly_cost_category_detail_update":
            return MonthlyCostCategoryUpdateSerializer
        return MonthlyCostCategoryReadSerializer


    @action(detail=False, methods=['post'],url_path="month")
    def monthly_cost_category(self, request):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data=serializer.validated_data["cost_category_items"]

        monthly_cost_category_create(cost_category_items=data, user=self.request.user)
        return  Response({"message":"successfully cost added"},status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'],url_path="month/list")
    def monthly_cost_category_detail_update(self, request):
        today=datetime.now()
        data=MonthlyFinancialSummary(business=request.user.business,year=today.year,month=today.month)
        if data is None:
            return Response({"message":"cost not found"},status=status.HTTP_404_NOT_FOUND)
        return Response(data,status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'],url_path="month/:id")
    def monthly_cost_category_detail_update(self, request, pk):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data=serializer.validated_data

        monthly_cost_category_create(data=data,user=self.request.user)
        return Response({"message":"successfully updated"},status=status.HTTP_200_OK)


    @action(detail=True, methods=['delete'],url_path="month/:id")
    def monthly_cost_category_delete(self, request, pk):
        monthly_cost_category = MonthlyCostCategory.objects.get(pk=pk)
        monthly_cost_category.delete()
        return Response({"message":"successfully deleted"},status=status.HTTP_200_OK)


