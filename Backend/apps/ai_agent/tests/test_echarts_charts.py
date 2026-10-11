import json
import pytest
from apps.ai_agent.utils.charts.apache_echarts import shared
from apps.ai_agent.utils.charts.apache_echarts import heatmap_chart
from apps.ai_agent.utils.charts.apache_echarts import treemap_chart


class TestEChartsSharedAndBuilders:

    def test_shared_primitives(self):
        # Arrange & Act & Assert - to_number
        assert shared.to_number(12.5) == 12.5
        assert shared.to_number("45.6") == 45.6
        assert shared.to_number("invalid") == 0.0

        # is_numeric
        assert shared.is_numeric(10) is True
        assert shared.is_numeric("10.5") is True
        assert shared.is_numeric("abc") is False

        # format_number
        assert shared.format_number(2_500_000) == "2.5M"
        assert shared.format_number(1_500) == "1.5k"
        assert shared.format_number(42) == "42"

        # load_data
        assert shared.load_data('[{"a": 1}]') == [{"a": 1}]
        assert shared.load_data("invalid json") == []
        assert shared.load_data([{"b": 2}]) == [{"b": 2}]
        assert shared.load_data(123) == []

        # _clamp_iframe_height
        assert shared._clamp_iframe_height(50) == 100
        assert shared._clamp_iframe_height(500) == 500
        assert shared._clamp_iframe_height(2000) == shared.MAX_IFRAME_HEIGHT

        # wrap_iframe
        assert shared.wrap_iframe("<p>test</p>") == "<p>test</p>"

        # normalizer stubs and branches
        assert shared.normalize_scatter_series(None) == []
        assert shared.normalize_scatter_series([[10, 20]]) == [{"x": 10.0, "y": 20.0}]
        assert shared.normalize_matrix_data([]) == ([], [], [])
        assert shared.normalize_gauge_data(50.0)["value"] == 50.0
        assert shared.normalize_gauge_data([{"value": 30.0}])["value"] == 30.0
        assert shared.normalize_gauge_data([40.0])["value"] == 40.0
        assert shared.normalize_bullet_data({})["actual"] == 0.0
        assert shared.normalize_kpi_data({})["value"] == 0.0
        assert shared.normalize_multi_series({"a": 1, "b": 2}) == (["a", "b"], [1.0, 2.0])
        assert shared.normalize_multi_series([1, 2, 3]) == ([], [])

    def test_shared_normalization(self):
        # normalize_single_series empty
        assert shared.normalize_single_series([]) == ([], [])

        # normalize_single_series with data
        data1 = [{"product": "Apples", "revenue": 100.0}, {"product": "Oranges", "revenue": 200.0}]
        labels, vals = shared.normalize_single_series(data1)
        assert labels == ["Apples", "Oranges"]
        assert vals == [100.0, 200.0]

        # generic_normalize empty
        assert shared.generic_normalize([], "label", ["val"]) == ([], [])

        # generic_normalize with and without keys
        labels2, ds2 = shared.generic_normalize(data1, "product", ["revenue"])
        assert labels2 == ["Apples", "Oranges"]
        assert ds2[0]["label"] == "Revenue"
        assert ds2[0]["data"] == [100.0, 200.0]

        # generic_normalize fallback keys
        labels2_fb, ds2_fb = shared.generic_normalize(data1, "", [])
        assert labels2_fb == ["Apples", "Oranges"]
        assert len(ds2_fb) == 1

        # normalize_multi_series empty
        assert shared.normalize_multi_series([]) == ([], [])

        # normalize_multi_series with series column
        data_multi = [
            {"cat": "Q1", "val": 50, "series": "North"},
            {"cat": "Q1", "val": 60, "series": "South"},
            {"cat": "Q2", "val": 70, "series": "North"},
        ]
        labels_m, ds_m = shared.normalize_multi_series(data_multi)
        assert "Q1" in labels_m
        assert "Q2" in labels_m
        assert len(ds_m) == 2

    def test_shared_page_and_chart_page(self):
        # page without and with description
        p1 = shared.page("Sales", "Monthly sales breakdown", "<div>Chart</div>", 400)
        assert "Sales" in p1
        assert "Monthly sales breakdown" in p1
        assert "<!-- codex-iframe-height:400 -->" in p1

        p2 = shared.page("", "", "<div>Body</div>")
        assert "<div>Body</div>" in p2

        # chart_page
        res = shared.chart_page({"title": "Test"}, "Title", "Desc", height=300)
        assert isinstance(res, dict)
        assert "html" in res
        assert "config" in res
        assert res["config"]["title"] == "Test"

    def test_shared_build_generic_config(self):
        labels = ["Jan", "Feb"]
        datasets = [{"label": "Sales", "data": [10, 20]}]

        # 1. vertical_bar
        vbar = shared.build_generic_config("vertical_bar", labels, datasets, title="VBar")
        assert vbar["xAxis"]["type"] == "category"
        assert vbar["series"][0]["type"] == "bar"

        # 2. horizontal_bar
        hbar = shared.build_generic_config("horizontal_bar", labels, datasets, title="HBar")
        assert hbar["xAxis"]["type"] == "value"
        assert hbar["yAxis"]["type"] == "category"

        # 3. stacked_bar
        sbar = shared.build_generic_config("stacked_bar", labels, datasets, title="SBar")
        assert sbar["series"][0]["stack"] == "total"

        # 4. line_chart
        lchart = shared.build_generic_config("line_chart", labels, datasets, title="LChart")
        assert lchart["series"][0]["type"] == "line"

        # 5. area_chart
        achart = shared.build_generic_config("area_chart", labels, datasets, title="AChart")
        assert "areaStyle" in achart["series"][0]

        # 6. pie_chart
        pchart = shared.build_generic_config("pie_chart", labels, datasets, title="PChart")
        assert pchart["series"][0]["type"] == "pie"
        assert pchart["series"][0]["radius"] == "50%"

        # 7. donut_chart
        dchart = shared.build_generic_config("donut_chart", labels, datasets, title="DChart")
        assert dchart["series"][0]["radius"] == ["40%", "70%"]

        # 8. default fallback
        fchart = shared.build_generic_config("unknown_type", labels, datasets, title="Fallback")
        assert fchart["series"][0]["type"] == "bar"

    def test_heatmap_chart(self):
        # Empty data
        res_empty = heatmap_chart.build_chart([], "Empty Heatmap", "No data")
        assert "Empty Heatmap" in res_empty["html"]

        # Single dimension data (< 2 label keys)
        single_dim_data = [
            {"product": "Prod A", "count": 10},
            {"product": "Prod B", "count": 25},
        ]
        res_single = heatmap_chart.build_chart(single_dim_data, "Product Density", "Single dim")
        assert res_single["config"]["series"][0]["type"] == "heatmap"

        # 2D Matrix data (>= 2 label keys)
        multi_dim_data = [
            {"branch": "Main", "month": "Jan", "total": 100},
            {"branch": "Main", "month": "Feb", "total": 150},
            {"branch": "West", "month": "Jan", "total": 80},
        ]
        res_multi = heatmap_chart.build_chart(multi_dim_data, "Branch Sales Matrix", "2D heatmap")
        assert res_multi["config"]["series"][0]["type"] == "heatmap"
        assert len(res_multi["config"]["series"][0]["data"]) == 3

        # Custom numeric key (not in ["value", "total", "count", "hotel_count"])
        custom_key_data = [
            {"branch": "Main", "month": "Jan", "custom_metric": 42},
            {"branch": "Main", "month": "Feb", "custom_metric": 84},
        ]
        res_custom = heatmap_chart.build_chart(custom_key_data, "Custom Metric", "Desc")
        assert res_custom["config"]["series"][0]["type"] == "heatmap"

    def test_treemap_chart(self):
        # Empty data
        res_empty = treemap_chart.build_chart(None, "Empty Treemap", "No data")
        assert "Empty Treemap" in res_empty["html"]

        # Custom numeric key
        custom_treemap_data = [
            {"category": "Hardware", "custom_metric": 100},
        ]
        res_custom_tm = treemap_chart.build_chart(custom_treemap_data, "Custom Metric Treemap", "Desc")
        assert res_custom_tm["config"]["series"][0]["type"] == "treemap"

        # Flat data (< 2 name keys)
        flat_data = [
            {"product": "Keyboard", "count": 50},
            {"product": "Mouse", "count": 70},
        ]
        res_flat = treemap_chart.build_chart(flat_data, "Product Treemap", "Flat")
        assert res_flat["config"]["series"][0]["type"] == "treemap"
        assert len(res_flat["config"]["series"][0]["data"]) == 2

        # Hierarchical data (>= 2 name keys: e.g. City & Country)
        hier_data = [
            {"city": "Mumbai", "country": "India", "total": 500},
            {"city": "Delhi", "country": "India", "total": 450},
            {"city": "New York", "country": "USA", "total": 600},
        ]
        res_hier = treemap_chart.build_chart(hier_data, "Global Sales Hierarchy", "Nested")
        assert res_hier["config"]["series"][0]["type"] == "treemap"
        assert len(res_hier["config"]["series"][0]["data"]) == 2  # India and USA

    def test_all_chart_builders(self):
        from apps.ai_agent.utils.charts.apache_echarts import (
            CHART_BUILDERS,
            SUPPORTED_CHART_TYPES,
            vertical_bar,
            horizontal_bar,
            grouped_bar,
            stacked_bar,
            line_chart,
            multi_line_chart,
            area_chart,
            combo_bar_line,
            pie_chart,
            donut_chart,
            funnel_chart,
            gauge_chart,
            bullet_chart,
            kpi_sparkline_chart,
            scatter_chart,
            bubble_chart,
            radar_chart,
        )

        assert len(SUPPORTED_CHART_TYPES) > 10
        assert len(CHART_BUILDERS) > 10

        sample_multi = [{"category": "A", "q1": 10, "q2": 20}, {"category": "B", "q1": 15, "q2": 25}]
        sample_single = [{"label": "A", "value": 10}, {"label": "B", "value": 20}]

        # 1. vertical_bar
        res = vertical_bar.build_chart(sample_multi, "Vertical", "Desc")
        assert "Vertical" in res["html"]
        assert "xAxis" in res["config"]

        # 2. horizontal_bar
        res = horizontal_bar.build_chart(sample_multi, "Horizontal", "Desc")
        assert "Horizontal" in res["html"]
        assert "yAxis" in res["config"]

        # 3. grouped_bar
        res = grouped_bar.build_chart(sample_multi, "Grouped", "Desc")
        assert "Grouped" in res["html"]

        # 4. stacked_bar
        res = stacked_bar.build_chart(sample_multi, "Stacked", "Desc")
        assert "Stacked" in res["html"]
        assert "stack" in res["config"]["series"][0]

        # 5. line_chart
        res = line_chart.build_chart(sample_multi, "Line", "Desc")
        assert "Line" in res["html"]

        # 6. multi_line_chart
        res = multi_line_chart.build_chart(sample_multi, "MultiLine", "Desc")
        assert "MultiLine" in res["html"]

        # 7. area_chart
        res = area_chart.build_chart(sample_multi, "Area", "Desc")
        assert "Area" in res["html"]
        assert "areaStyle" in res["config"]["series"][0]

        # 8. combo_bar_line
        res = combo_bar_line.build_chart(sample_multi, "Combo", "Desc")
        assert "Combo" in res["html"]
        assert "yAxisIndex" in res["config"]["series"][0]

        # 9. pie_chart
        res = pie_chart.build_chart(sample_single, "Pie", "Desc")
        assert "Pie" in res["html"]
        res_empty = pie_chart.build_chart([], "Empty Pie", "Desc")
        assert "Empty Pie" in res_empty["html"]

        # 10. donut_chart (dict and list)
        res = donut_chart.build_chart(sample_single, "Donut", "Desc")
        assert "Donut" in res["html"]
        res_dict = donut_chart.build_chart({"data": sample_single}, "Donut Dict", "Desc")
        assert "Donut Dict" in res_dict["html"]

        # 11. funnel_chart
        res = funnel_chart.build_chart(sample_single, "Funnel", "Desc")
        assert "Funnel" in res["html"]
        res_empty = funnel_chart.build_chart([], "Empty Funnel", "Desc")
        assert "Empty Funnel" in res_empty["html"]

        # 12. gauge_chart (dict, float, and overflow)
        res = gauge_chart.build_chart({"value": 75, "min": 0, "max": 100}, "Gauge", "Desc")
        assert "Gauge" in res["html"]
        res_high = gauge_chart.build_chart({"value": 150, "min": 0, "max": 100}, "High Gauge", "Desc")
        assert "High Gauge" in res_high["html"]

        # 13. bullet_chart
        res = bullet_chart.build_chart({"actual": 85, "target": 90, "ranges": [50, 80, 100]}, "Bullet", "Desc")
        assert "Bullet" in res["html"]

        # 14. kpi_sparkline_chart (dict and list)
        res = kpi_sparkline_chart.build_chart({"value": 100, "trend": [10, 20, 30]}, "KPI", "Desc")
        assert "KPI" in res["html"]
        res_list = kpi_sparkline_chart.build_chart([10, 20, 30, 40], "KPI List", "Desc")
        assert "KPI List" in res_list["html"]

        # 15. scatter_chart (list of dicts and list of lists)
        res = scatter_chart.build_chart([{"x": 1, "y": 2}, {"x": 3, "y": 4}], "Scatter", "Desc")
        assert "Scatter" in res["html"]
        res_lists = scatter_chart.build_chart([[1, 2], [3, 4]], "Scatter Lists", "Desc")
        assert "Scatter Lists" in res_lists["html"]

        # 16. bubble_chart (dicts and lists)
        res = bubble_chart.build_chart([{"x": 1, "y": 2, "size": 15, "label": "Point A"}], "Bubble", "Desc")
        assert "Bubble" in res["html"]
        res_lists = bubble_chart.build_chart([[1, 2, 3, "B"]], "Bubble Lists", "Desc")
        assert "Bubble Lists" in res_lists["html"]
        res_empty = bubble_chart.build_chart(None, "Empty Bubble", "Desc")
        assert "Empty Bubble" in res_empty["html"]

        # 17. radar_chart
        res = radar_chart.build_chart(sample_single, "Radar", "Desc")
        assert "Radar" in res["html"]
        res_empty = radar_chart.build_chart([], "Empty Radar", "Desc")
        assert "Empty Radar" in res_empty["html"]

