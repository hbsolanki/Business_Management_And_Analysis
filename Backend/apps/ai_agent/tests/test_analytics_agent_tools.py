import asyncio
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from django.utils import timezone

from apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool import (
    _extract_json,
    chart_intent_planner,
    chart_intent_tool,
    fetch_chart_data,
)
from apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool import (
    generate_report_pdf_tool,
)
from apps.ai_agent.tools.analytics_agent_tools.get_schema_tool import get_schema_tool
from apps.ai_agent.tools.analytics_agent_tools.get_user_contex_tool import (
    get_user_contex_tool,
)
from apps.ai_agent.tools.analytics_agent_tools.query_build_tool import (
    _build_one,
    query_build_tool,
)
from apps.ai_agent.tools.analytics_agent_tools.query_execute_tool import (
    _check_security,
    _execute_sql_sync,
    query_execute_tool,
)
from apps.ai_agent.utils import context as ai_context
from apps.ai_agent.utils.db import context as db_context
from apps.business.models import Business
from apps.user.models import User


@pytest.fixture(autouse=True)
def cleanup_context():
    token_ctx = ai_context.current_user_context.set({})
    token_msg = ai_context.current_message_id.set(None)
    yield
    ai_context.current_user_context.reset(token_ctx)
    ai_context.current_message_id.reset(token_msg)


@pytest.mark.asyncio
@pytest.mark.django_db
class TestGetSchemaTool:
    async def test_get_schema_tool_delegates_to_get_db_schema(self):
        # Arrange
        dummy_schema = {"bma_product": ["id", "name"]}
        with patch("apps.ai_agent.tools.analytics_agent_tools.get_schema_tool.get_db_schema", AsyncMock(return_value=dummy_schema)):
            # Act
            sut_res = await get_schema_tool()

            # Assert
            assert sut_res == dummy_schema

    async def test_get_db_schema_cached_and_fallback(self):
        # Arrange
        db_context._SCHEMA_CACHE = {"bma_test": ["id"]}

        # Act
        sut_cached = await db_context.get_db_schema()

        # Assert
        assert sut_cached == {"bma_test": ["id"]}

        # Arrange cache reset and exception handling
        db_context._SCHEMA_CACHE = None
        with patch.object(db_context, "_fetch_db_schema_sync", side_effect=RuntimeError("DB error")):
            # Act
            sut_err = await db_context.get_db_schema()

            # Assert
            assert sut_err == {}
        db_context._SCHEMA_CACHE = None


@pytest.mark.asyncio
class TestGetUserContextTool:
    async def test_get_user_contex_tool_no_context(self):
        # Arrange
        ai_context.current_user_context.set({})

        # Act
        sut_res = await get_user_contex_tool()

        # Assert
        assert "error" in sut_res

    async def test_get_user_contex_tool_with_context(self):
        # Arrange
        ai_context.current_user_context.set({
            "role": "OWNER",
            "business_id": 42,
            "branch_id": 7,
            "user_id": 99,
        })

        # Act
        sut_res = await get_user_contex_tool()

        # Assert
        assert sut_res["role"] == "OWNER"
        assert sut_res["business_id"] == 42
        assert sut_res["branch_id"] == 7
        assert sut_res["user_id"] == 99
        assert sut_res["current_date"] == timezone.localdate().strftime("%Y-%m-%d")


@pytest.mark.asyncio
class TestQueryBuildTool:
    @pytest.fixture(autouse=True)
    def setup_schema(self):
        db_context._SCHEMA_CACHE = {
            "bma_product": ["id", "business_id", "branch_id", "name", "cost_price"],
            "bma_invoice": ["id", "business_id", "invoice_number", "total_amount"],
            "bma_conversation": ["id", "user1_id", "user2_id"],
            "bma_task": ["id", "business_id", "assigned_by_id", "assignee_id", "title"],
            "bma_notification": ["id", "user_id", "title"],
            "bma_monthly_cost_category": ["id", "monthly_summary_id"],
        }
        yield
        db_context._SCHEMA_CACHE = None

    async def test_query_build_tool_empty(self):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": 1, "user_id": 1})

        # Act
        sut_res = await query_build_tool([])

        # Assert
        assert sut_res == []

    async def test_query_build_tool_no_security_context(self):
        # Arrange
        ai_context.current_user_context.set({})

        # Act / Assert
        with pytest.raises(ValueError, match="No security context found"):
            await query_build_tool([{"base_table": "bma_product"}])

    async def test_query_build_tool_raw_sql(self):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": 1, "user_id": 1})
        raw_list = [{"sql": "SELECT 1 FROM bma_product"}, "SELECT 2 FROM bma_product"]

        # Act
        sut_res = await query_build_tool(raw_list)

        # Assert
        assert sut_res == ["SELECT 1 FROM bma_product", "SELECT 2 FROM bma_product"]

    async def test_query_build_tool_full_blueprint_owner(self):
        # Arrange
        ai_context.current_user_context.set({
            "role": "OWNER",
            "business_id": 10,
            "branch_id": None,
            "user_id": 5,
        })
        blueprint = {
            "base_table": "bma_product",
            "columns": [{"field": "name", "alias": "prod_name"}, {"field": "cost_price"}],
            "joins": [
                {
                    "type": "LEFT",
                    "table": "bma_invoice",
                    "alias": "inv",
                    "on": {"left": "bma_product.id", "right": "inv.id"},
                }
            ],
            "filters": [
                {"field": "name", "operator": "=", "value": "Widget"},
                {"field": "cost_price", "operator": "IN", "value": [10, 20]},
            ],
            "group_by": ["name", "cost_price"],
            "having": [{"field": "COUNT(id)", "operator": ">", "value": "1"}],
            "order_by": [{"field": "name", "direction": "desc"}],
            "limit": 25,
        }

        # Act
        sut_res = await query_build_tool([blueprint])

        # Assert
        assert len(sut_res) == 1
        sql = sut_res[0]
        assert "SELECT bma_product.name AS prod_name, bma_product.cost_price FROM bma_product" in sql
        assert "LEFT JOIN bma_invoice AS inv ON bma_product.id = inv.id" in sql
        assert "business_id = '10'" in sql
        assert "inv.business_id = '10'" in sql
        assert "bma_product.name = 'Widget'" in sql
        assert "bma_product.cost_price IN (10, 20)" in sql
        assert "GROUP BY name, cost_price" in sql
        assert "HAVING COUNT(id) > 1" in sql
        assert "ORDER BY name DESC" in sql
        assert "LIMIT 25" in sql

    async def test_query_build_tool_manager_branch_isolation(self):
        # Arrange
        ai_context.current_user_context.set({
            "role": "MANAGER",
            "business_id": 10,
            "branch_id": 99,
            "user_id": 5,
        })
        blueprint = {
            "base_table": "bma_product",
            "columns": [{"field": "*"}],
        }

        # Act
        sut_res = await query_build_tool([blueprint])

        # Assert
        assert "branch_id = '99'" in sut_res[0]

    async def test_query_build_tool_user_isolated_tables(self):
        # Arrange
        ai_context.current_user_context.set({
            "role": "EMPLOYEE",
            "business_id": 10,
            "branch_id": None,
            "user_id": 77,
        })
        bp_conv = {"base_table": "bma_conversation", "columns": [{"field": "*"}]}
        bp_task = {"base_table": "bma_task", "columns": [{"field": "*"}]}
        bp_notif = {"base_table": "bma_notification", "columns": [{"field": "*"}]}
        bp_subquery = {"base_table": "bma_monthly_cost_category", "columns": [{"field": "*"}]}

        # Act
        sut_res_conv = await query_build_tool([bp_conv])
        sut_res_task = await query_build_tool([bp_task])
        sut_res_notif = await query_build_tool([bp_notif])
        sut_res_sub = await query_build_tool([bp_subquery])

        # Assert
        assert "user1_id = '77' OR user2_id = '77'" in sut_res_conv[0]
        assert "assigned_by_id = '77' OR assignee_id = '77'" in sut_res_task[0]
        assert "user_id = '77'" in sut_res_notif[0]
        assert "business_id = '10'" in sut_res_sub[0]

    async def test_query_build_tool_validation_error(self):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": 1, "user_id": 1})
        invalid_bp = {"base_table": "non_existent_table"}

        # Act / Assert
        with pytest.raises(ValueError, match="Access denied"):
            await query_build_tool([invalid_bp])


@pytest.mark.asyncio
class TestQueryExecuteTool:
    async def test_query_execute_tool_empty(self):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": 1, "user_id": 1})

        # Act
        sut_res = await query_execute_tool([])

        # Assert
        assert sut_res == []

    async def test_query_execute_tool_no_context(self):
        # Arrange
        ai_context.current_user_context.set({})

        # Act / Assert
        with pytest.raises(ValueError, match="No security context found"):
            await query_execute_tool(["SELECT 1"])

    async def test_check_security_violations(self):
        # Arrange
        ctx = {"business_id": "1", "user_id": "2", "role": "OWNER", "branch_id": None}

        # Non-SELECT
        with pytest.raises(ValueError, match="Only SELECT queries are allowed"):
            await _check_security("DELETE FROM bma_product", ctx)

        # No bma_ tables
        with pytest.raises(ValueError, match="Security Exploit Detected: Unauthorized table"):
            await _check_security("SELECT * FROM pg_catalog.pg_tables", ctx)

        # Missing business isolation
        with pytest.raises(ValueError, match="Mandatory business isolation missing for bma_product"):
            await _check_security("SELECT * FROM bma_product", ctx)

        # Missing user isolation
        with pytest.raises(ValueError, match="Mandatory user isolation missing for bma_task"):
            await _check_security("SELECT * FROM bma_task", ctx)

        # Missing complex isolation
        with pytest.raises(ValueError, match="Mandatory complex isolation missing for bma_monthly_cost_category"):
            await _check_security("SELECT * FROM bma_monthly_cost_category", ctx)

    async def test_check_security_passed(self):
        # Arrange
        ctx = {"business_id": "1", "user_id": "2", "role": "OWNER", "branch_id": None}
        sql = "SELECT * FROM bma_product WHERE business_id = '1'"

        # Act / Assert (should not raise)
        await _check_security(sql, ctx)

    @patch("apps.ai_agent.tools.analytics_agent_tools.query_execute_tool._execute_sql_sync")
    async def test_query_execute_tool_execution_flow(self, mock_exec_sync):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": "1", "user_id": "2"})
        mock_exec_sync.return_value = [{"id": 1, "name": "Item"}]
        query = {"sql": "SELECT * FROM bma_product WHERE business_id = '1'"}

        # Act
        sut_res = await query_execute_tool([query])

        # Assert
        assert len(sut_res) == 1
        assert sut_res[0] == [{"id": 1, "name": "Item"}]

    @patch("apps.ai_agent.tools.analytics_agent_tools.query_execute_tool._execute_sql_sync")
    async def test_query_execute_tool_truncation_and_error(self, mock_exec_sync):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": "1", "user_id": "2"})
        long_result = [{"id": i} for i in range(105)]
        mock_exec_sync.side_effect = [long_result, RuntimeError("Query syntax failed")]
        queries = [
            "SELECT * FROM bma_product WHERE business_id = '1'",
            "SELECT * FROM bma_product WHERE business_id = '1' AND id = 2",
        ]

        # Act
        sut_res = await query_execute_tool(queries)

        # Assert
        assert len(sut_res) == 2
        assert len(sut_res[0]) == 101  # 100 rows + meta truncated
        assert sut_res[0][-1] == {"_meta": "truncated"}
        assert "Execution Error" in sut_res[1][0]["error"]

    async def test_query_execute_tool_empty_sql_items(self):
        # Arrange
        ai_context.current_user_context.set({"role": "OWNER", "business_id": "1", "user_id": "2"})
        items = [{"sql": ""}, ""]

        # Act
        sut_res = await query_execute_tool(items)

        # Assert
        assert sut_res == []

    @patch("apps.ai_agent.tools.analytics_agent_tools.query_execute_tool.connection")
    async def test_execute_sql_sync(self, mock_conn):
        # Arrange
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = [(1, "Product A")]

        # Act
        sut_res = await _execute_sql_sync("SELECT id, name FROM bma_product")

        # Assert
        assert sut_res == [{"id": 1, "name": "Product A"}]

        # Test empty description
        mock_cursor.description = None
        sut_empty = await _execute_sql_sync("SELECT 1")
        assert sut_empty == []


@pytest.mark.asyncio
@pytest.mark.asyncio
class TestGenerateReportPdfTool:
    async def test_generate_report_pdf_tool_no_context(self):
        # Arrange
        ai_context.current_user_context.set({})

        # Act
        sut_res = await generate_report_pdf_tool("2026-01-01", "2026-01-31")

        # Assert
        assert sut_res == {"error": "User context not found."}

    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.User.objects.get")
    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.boto3.client")
    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.generate_report_pdf")
    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.calculate_report_data")
    async def test_generate_report_pdf_tool_success(
        self, mock_calc, mock_pdf_gen, mock_boto, mock_user_get
    ):
        # Arrange
        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.business = MagicMock()
        mock_user.business.name = "Acme Corp"
        mock_user_get.return_value = mock_user

        ai_context.current_user_context.set({"user_id": 1, "business_id": 10})
        mock_calc.return_value = {"summary": "sample"}
        mock_pdf_gen.return_value = b"%PDF-1.4 sample content"
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://s3.example.com/report.pdf"
        mock_boto.return_value = mock_s3

        # Act
        sut_res = await generate_report_pdf_tool("2026-01-01", "2026-01-31", report_types="product,cost,gst,purchase_order,inventory")

        # Assert
        assert sut_res["success"] is True
        assert sut_res["url"] == "https://s3.example.com/report.pdf"
        assert "📄 [**Download Analytics Report" in sut_res["markdown_link"]

    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.User.objects.get")
    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.generate_report_pdf")
    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.calculate_report_data")
    async def test_generate_report_pdf_tool_empty_pdf(
        self, mock_calc, mock_pdf_gen, mock_user_get
    ):
        # Arrange
        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.business = None
        mock_user_get.return_value = mock_user

        ai_context.current_user_context.set({"user_id": 1, "business_id": 10})
        mock_calc.return_value = {}
        mock_pdf_gen.return_value = None

        # Act
        sut_res = await generate_report_pdf_tool("2026-01-01", "2026-01-31")

        # Assert
        assert sut_res == {"error": "Failed to generate PDF buffer."}

    @patch("apps.ai_agent.tools.analytics_agent_tools.generate_report_pdf_tool.User.objects.get")
    async def test_generate_report_pdf_tool_exception(self, mock_user_get):
        # Arrange
        ai_context.current_user_context.set({"user_id": 1, "business_id": 10})
        mock_user_get.side_effect = RuntimeError("DB connection dropped")

        # Act
        sut_res = await generate_report_pdf_tool("2026-01-01", "2026-01-31")

        # Assert
        assert "error" in sut_res
        assert "DB connection dropped" in sut_res["error"]


class TestChartIntentToolSync:
    def test_extract_json(self):
        # Arrange
        raw_codeblock = "```json\n[{\"index\": 1}]\n```"
        raw_dict = "{\"index\": 2}"
        raw_empty = ""

        # Act
        sut1 = _extract_json(raw_codeblock)
        sut2 = _extract_json(raw_dict)
        sut3 = _extract_json(raw_empty)
        sut4 = _extract_json("plain text without brackets")

        # Assert
        assert sut1 == "[{\"index\": 1}]"
        assert sut2 == "[{\"index\": 2}]"
        assert sut3 == "[]"
        assert sut4 == "plain text without brackets"


@pytest.mark.asyncio
class TestChartIntentTool:
    async def test_chart_intent_planner_empty(self):
        # Arrange
        sql_queries = []

        # Act
        sut_res = await chart_intent_planner("sales trend", sql_queries)

        # Assert
        assert sut_res == []

    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.asyncio.sleep", AsyncMock())
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool._client")
    async def test_chart_intent_planner_retry_and_fail(self, mock_client):
        # Arrange
        mock_client.aio.models.generate_content = AsyncMock(
            side_effect=[RuntimeError("503 UNAVAILABLE"), RuntimeError("400 Bad Request")]
        )

        # Act
        sut_res = await chart_intent_planner("sales trend", ["SELECT * FROM bma_product"])

        # Assert
        assert sut_res == []

    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool._client")
    async def test_chart_intent_planner_success_and_retry(self, mock_client):
        # Arrange
        mock_client.aio.models.generate_content = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.text = '[{"index": 1, "chart_type": "line_chart"}]'
        mock_client.aio.models.generate_content.return_value = mock_resp

        # Act
        sut_res = await chart_intent_planner("sales trend", ["SELECT * FROM bma_product"])

        # Assert
        assert len(sut_res) == 1
        assert sut_res[0]["chart_type"] == "line_chart"

    async def test_fetch_chart_data(self):
        # Arrange
        with patch(
            "apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.query_execute_tool",
            AsyncMock(return_value=[
                [{"id": 1, "name": "A"}],
                [{"id": 2, "name": "B"}]
            ]),
        ):
            # Act
            sut_res = await fetch_chart_data(["q1", "q2"])

            # Assert
            assert len(sut_res) == 2
            assert sut_res[0]["series"] == "Dataset 1"
            assert sut_res[1]["series"] == "Dataset 2"

    async def test_chart_intent_tool_no_context(self):
        # Arrange
        ai_context.current_user_context.set({})

        # Act
        sut_res = await chart_intent_tool(chart_type="vertical_bar", queries=["q"])

        # Assert
        assert "error" in sut_res

    @patch("apps.business.models.Business.objects.filter")
    async def test_chart_intent_tool_business_not_found(self, mock_filter):
        # Arrange
        ai_context.current_user_context.set({"business_id": 99999})
        mock_filter.return_value.first.return_value = None

        # Act
        sut_res = await chart_intent_tool(chart_type="vertical_bar", queries=["q"])

        # Assert
        assert sut_res == {"error": "Business context not found."}

    @patch("apps.business.models.Business.objects.filter")
    @patch("apps.subscription.utils.entitlements.can_use_feature")
    async def test_chart_intent_tool_feature_disabled(self, mock_feature, mock_filter):
        # Arrange
        ai_context.current_user_context.set({"business_id": 10})
        mock_filter.return_value.first.return_value = MagicMock()
        mock_feature.return_value = (False, "Feature disabled")

        # Act
        sut_res = await chart_intent_tool(chart_type="vertical_bar", queries=["q"])

        # Assert
        assert "Advanced Analytics feature is not enabled" in sut_res["result"]

    @patch("apps.business.models.Business.objects.filter")
    @patch("apps.subscription.utils.entitlements.can_use_feature")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.fetch_chart_data")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.chart_intent_planner")
    async def test_chart_intent_tool_full_flow(
        self, mock_planner, mock_fetch, mock_feature, mock_filter
    ):
        # Arrange
        ai_context.current_user_context.set({"business_id": 10})
        mock_filter.return_value.first.return_value = MagicMock()
        mock_feature.return_value = (True, "Allowed")
        mock_fetch.return_value = [{"category": "Electronics", "sales": 1500}]
        mock_planner.return_value = [{
            "chart_type": "vertical_bar",
            "title": "Sales by Category",
            "description": "Insight",
            "label_key": "category",
            "value_keys": ["sales"],
            "data_shape": "wide",
        }]

        # Act
        sut_res = await chart_intent_tool(
            chart_type="vertical_bar",
            sql="SELECT * FROM bma_product",
            title="Sales by Category",
        )

        # Assert
        assert sut_res["type"] == "chart"
        assert sut_res["chart_type"] == "vertical_bar"
        assert sut_res["title"] == "Sales by Category"
        assert "option" in sut_res

    async def test_fetch_chart_data_empty_and_error(self):
        # Arrange empty queries
        sut_empty = await fetch_chart_data([])
        assert sut_empty == []

        # Arrange query_execute_tool returning empty list or error dict
        with patch(
            "apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.query_execute_tool",
            AsyncMock(return_value=[[], [{"error": "syntax"}]]),
        ):
            # Act
            sut_res = await fetch_chart_data(["q1", "q2"])

            # Assert
            assert sut_res == []

    @patch("apps.business.models.Business.objects.filter")
    @patch("apps.subscription.utils.entitlements.can_use_feature")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.fetch_chart_data")
    async def test_chart_intent_tool_no_data(self, mock_fetch, mock_feature, mock_filter):
        # Arrange
        ai_context.current_user_context.set({"business_id": 10})
        mock_filter.return_value.first.return_value = MagicMock()
        mock_feature.return_value = (True, "Allowed")
        mock_fetch.return_value = []

        # Act
        sut_res = await chart_intent_tool(chart_type="vertical_bar", queries=["q1"])

        # Assert
        assert sut_res == {"error": "No data available to generate chart."}

    @patch("apps.business.models.Business.objects.filter")
    @patch("apps.subscription.utils.entitlements.can_use_feature")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.fetch_chart_data")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.chart_intent_planner")
    async def test_chart_intent_tool_fallback_and_long_shape(
        self, mock_planner, mock_fetch, mock_feature, mock_filter
    ):
        # Arrange
        ai_context.current_user_context.set({"business_id": 10})
        mock_filter.return_value.first.return_value = MagicMock()
        mock_feature.return_value = (True, "Allowed")
        mock_fetch.return_value = [{"category": "Books", "sales": 100, "series": "S1"}]
        mock_planner.return_value = []  # Triggers fallback intent (lines 249-256)

        # Act
        sut_res = await chart_intent_tool(chart_type="line_chart", queries=["q1"])

        # Assert
        assert sut_res["type"] == "chart"
        assert sut_res["chart_type"] == "line_chart"

        # Now test long shape
        mock_planner.return_value = [{
            "chart_type": "multi_line",
            "data_shape": "long",
            "label_key": "category",
            "value_keys": ["sales"],
        }]
        sut_long = await chart_intent_tool(chart_type="multi_line", queries=["q1"])
        assert sut_long["type"] == "chart"

    @patch("apps.ai_agent.models.AiChartRef.objects.create")
    @patch("apps.ai_agent.models.AiChatMessage.objects.filter")
    @patch("apps.business.models.Business.objects.filter")
    @patch("apps.subscription.utils.entitlements.can_use_feature")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.fetch_chart_data")
    @patch("apps.ai_agent.tools.analytics_agent_tools.chart_intent_tool.chart_intent_planner")
    async def test_chart_intent_tool_with_message_id(
        self, mock_planner, mock_fetch, mock_feature, mock_filter, mock_msg_filter, mock_chart_ref_create
    ):
        # Arrange
        ai_context.current_user_context.set({"business_id": 10})
        ai_context.current_message_id.set(999)
        mock_filter.return_value.first.return_value = MagicMock()
        mock_feature.return_value = (True, "Allowed")
        mock_fetch.return_value = [{"category": "Books", "sales": 100}]
        mock_planner.return_value = [{
            "chart_type": "vertical_bar",
            "label_key": "category",
            "value_keys": ["sales"],
        }]
        mock_ref = MagicMock()
        mock_ref.id = "chart-uuid-123"
        mock_chart_ref_create.return_value = mock_ref

        # Act
        sut_res = await chart_intent_tool(chart_type="vertical_bar", queries=["q1"])

        # Assert
        assert sut_res["type"] == "chart"
        assert sut_res["id"] == "chart-uuid-123"
        assert sut_res["result"] == "<ChartRef:chart-uuid-123>"

    @patch("apps.business.models.Business.objects.filter")
    async def test_chart_intent_tool_exception_caught(self, mock_filter):
        # Arrange
        ai_context.current_user_context.set({"business_id": 10})
        mock_filter.side_effect = RuntimeError("Fatal DB failure")

        # Act
        sut_res = await chart_intent_tool(chart_type="vertical_bar", queries=["q1"])

        # Assert
        assert "error" in sut_res
        assert "Chart generation failed" in sut_res["error"]


