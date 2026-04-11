from rest_framework import serializers

class DateRangeSerializer(serializers.Serializer):
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)

    def validate(self, data):
        if data.get("from_date") and data.get("to_date"):
            if data["from_date"] > data["to_date"]:
                raise serializers.ValidationError(
                    {"date_range": "from_date must be <= to_date"}
                )
        return data


class DateTimeRangeSerializer(serializers.Serializer):
    from_date_and_time = serializers.DateTimeField(required=False)
    to_date_and_time = serializers.DateTimeField(required=False)

    def validate(self, data):
        if data.get("from_date_and_time") and data.get("to_date_and_time"):
            if data["from_date_and_time"] > data["to_date_and_time"]:
                raise serializers.ValidationError(
                    {"datetime_range": "from_date_and_time must be <= to_date_and_time"}
                )
        return data


class BranchFilterSerializer(serializers.Serializer):
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")


class CustomerFilterSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False)
    mobile_number = serializers.CharField(required=False)


class ProductFilterSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False)


class MonthlySummaryMonthYearFilterSerializer(serializers.Serializer):
    month = serializers.IntegerField(min_value=1, max_value=12,required=False)
    year = serializers.IntegerField(min_value=2000,required=False)
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")


class MonthlySummaryDateRangeFilterSerializer(serializers.Serializer):
    start_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    start_year = serializers.IntegerField(min_value=2000, required=False)
    end_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    end_year = serializers.IntegerField(min_value=2000, required=False)
    year = serializers.IntegerField(min_value=2000, required=False)
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")

    def validate(self, data):
        start_month = data.get("start_month")
        start_year = data.get("start_year")
        end_month = data.get("end_month")
        end_year = data.get("end_year")

        if start_month and start_year and end_month and end_year:
            if start_year > end_year:
                 raise serializers.ValidationError("Start year must be less than or equal to end year.")
            if start_year == end_year and start_month > end_month:
                raise serializers.ValidationError("Start month must be less than or equal to end month in the same year.")
        
        return data

class MonthlySummaryYearFilterSerializer(serializers.Serializer):
    year = serializers.IntegerField(min_value=2000, required=False)


class CustomerCreatedAtRangeFilterSerializer(DateRangeSerializer, BranchFilterSerializer):
    pass


class CustomerInvoiceFilterSerializer(DateRangeSerializer, CustomerFilterSerializer, BranchFilterSerializer):
    pass


class CustomerInvoiceProductFilterSerializer(DateRangeSerializer, CustomerFilterSerializer, ProductFilterSerializer, BranchFilterSerializer):
    pass

class CustomerMonthYearFilterSerializer(serializers.Serializer):
    month = serializers.IntegerField(min_value=1, max_value=12,required=False)
    year = serializers.IntegerField(min_value=2000,required=False)
    branch = serializers.IntegerField(required=False, help_text="Filter by branch ID")


class ProductPerformanceMonthYearFilterSerializer(BranchFilterSerializer):
    product_id = serializers.IntegerField(required=False)
    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)

    def validate(self, data):
        if data.get("from_date") and data.get("to_date"):
            if data["from_date"] > data["to_date"]:
                raise serializers.ValidationError(
                    {"date_range": "from_date must be <= to_date"}
                )
        return data





class ProductStockFilterSerializer(ProductFilterSerializer, BranchFilterSerializer):
    pass


class ProductPerformanceFilterSerializer(DateTimeRangeSerializer, ProductFilterSerializer, BranchFilterSerializer):
    pass

class CustomReportFilterSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(
        choices=[
            "product",
            "inventory",
            "transaction",
            "cost",
            "supplier",
            "purchase_order",
        ]
    )

    # optional filters
    product_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    category_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    branch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    supplier_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    month = serializers.IntegerField(required=False)
    year = serializers.IntegerField(required=False)

    def validate(self, data):
        # Example conditional validation
        if data.get("report_type") == "cost":
            if not data.get("month") or not data.get("year"):
                raise serializers.ValidationError(
                    "Month and year required for cost report."
                )
        return data
