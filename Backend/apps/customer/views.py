from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from apps.customer.models import Customer
from apps.customer.serializers import create,read,update
from apps.permission.customer import CustomerPermission


class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [CustomerPermission]

    def get_queryset(self):
        return Customer.objects.filter(business=self.request.user.business)

    def get_serializer_class(self):
        if self.action == "create":
            return create.CustomerCreateSerializer
        elif self.action in["update","partial_update"]:
            return update.CustomerUpdateSerializer
        else:
            return read.CustomerReadSerializer


    @action(methods=['get'],detail=False,url_path='mobile_number')
    def customer_get_by_mobile(self,request,*args,**kwargs):
        mobile_number = request.query_params.get("mobile_number")

        if not mobile_number:
            return ValidationError("Customer must have mobile_number")

        try:
            customer = Customer.objects.get(mobile_number=mobile_number)
        except Customer.DoesNotExist:
            return ValidationError("Customer does not exist")

        serializer = read.CustomerReadSerializer(customer)
        return Response(
            {"exists": True, "customer": serializer.data},
            status=status.HTTP_200_OK
        )
