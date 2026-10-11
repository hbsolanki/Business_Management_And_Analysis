import datetime
import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock
from rest_framework.exceptions import ValidationError

from apps.analytics.pagination import (
    AnalyticsCustomerCursorPagination,
    DefaultPagination,
)
from apps.analytics.serializers.business import (
    BusinessNetProfitSerializer,
    BusinessTurnoverSerializer,
)
from apps.analytics.serializers.filter.base import (
    DateRangeSerializer,
    DateTimeRangeSerializer,
    BranchFilterSerializer,
)
from apps.invoice.models import Invoice

import importlib.util
from pathlib import Path
_utils_py_path = Path(__file__).resolve().parent.parent / "utils.py"
_spec = importlib.util.spec_from_file_location("apps.analytics.utils_standalone", _utils_py_path)
_analytics_utils = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_analytics_utils)
make_cache_key = _analytics_utils.make_cache_key
CURSOR_ORDERINGS = _analytics_utils.CURSOR_ORDERINGS


class TestAnalyticsPagination:
    def test_pagination_classes(self):
        # Arrange & Act
        sut_cursor = AnalyticsCustomerCursorPagination()
        sut_page = DefaultPagination()

        # Assert
        assert sut_cursor.page_size == 6
        assert sut_cursor.cursor_query_param == "cursor"
        assert sut_cursor.ordering is None

        assert sut_page.page_size == 10
        assert sut_page.page_size_query_param == "limit"


class TestAnalyticsSerializersAndUtils:
    def test_business_net_profit_and_turnover_serializer(self):
        # Arrange
        inv = Invoice(sub_total=150.0)
        sut_profit_ser = BusinessNetProfitSerializer(inv)
        sut_turnover_ser = BusinessTurnoverSerializer()

        # Act & Assert
        assert sut_profit_ser.data == {"profit": 150.0}
        assert sut_turnover_ser is not None

    def test_date_range_serializer(self):
        # Valid range
        ser_valid = DateRangeSerializer(data={"from_date": "2026-01-01", "to_date": "2026-01-31"})
        assert ser_valid.is_valid() is True

        # Invalid range
        ser_invalid = DateRangeSerializer(data={"from_date": "2026-02-01", "to_date": "2026-01-31"})
        assert ser_invalid.is_valid() is False
        assert "date_range" in ser_invalid.errors

    def test_datetime_range_serializer(self):
        # Valid range
        ser_valid = DateTimeRangeSerializer(data={
            "from_date_and_time": "2026-01-01T10:00:00",
            "to_date_and_time": "2026-01-02T10:00:00",
        })
        assert ser_valid.is_valid() is True

        # Invalid range
        ser_invalid = DateTimeRangeSerializer(data={
            "from_date_and_time": "2026-01-02T10:00:00",
            "to_date_and_time": "2026-01-01T10:00:00",
        })
        assert ser_invalid.is_valid() is False
        assert "datetime_range" in ser_invalid.errors

    def test_branch_filter_serializer(self):
        ser = BranchFilterSerializer(data={"branch": 5})
        assert ser.is_valid() is True
        assert ser.validated_data["branch"] == 5

    def test_make_cache_key_and_orderings(self):
        # Arrange
        mock_request = SimpleNamespace(
            query_params=SimpleNamespace(dict=lambda: {"period": "monthly", "year": "2026"}),
            user=SimpleNamespace(business_id=42),
        )

        # Act
        key = make_cache_key(mock_request, "revenue_summary", mock_request.user)

        # Assert
        assert key.startswith("analytics:")
        assert len(key) > 20
        assert "customer_leaderboard_revenue" in CURSOR_ORDERINGS
        assert "customer_product_preference" in CURSOR_ORDERINGS


class TestRoutingPatterns:
    def test_websocket_routing_patterns(self):
        from apps.activity_log import routing as act_routing
        from apps.ai_agent import routing as ai_routing
        from apps.chat import routing as chat_routing

        assert len(act_routing.websocket_urlpatterns) == 1
        assert len(ai_routing.websocket_urlpatterns) == 1
        assert len(chat_routing.websocket_urlpatterns) == 1
