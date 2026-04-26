from apps.ai_agent.tools.apache_echarts.vertical_bar import ALIASES as VERTICAL_BAR_ALIASES, build_chart as build_vertical_bar_chart
from apps.ai_agent.tools.apache_echarts.horizontal_bar import ALIASES as HORIZONTAL_BAR_ALIASES, build_chart as build_horizontal_bar_chart
from apps.ai_agent.tools.apache_echarts.grouped_bar import ALIASES as GROUPED_BAR_ALIASES, build_chart as build_grouped_bar_chart
from apps.ai_agent.tools.apache_echarts.stacked_bar import ALIASES as STACKED_BAR_ALIASES, build_chart as build_stacked_bar_chart
from apps.ai_agent.tools.apache_echarts.line_chart import ALIASES as LINE_ALIASES, build_chart as build_line_chart
from apps.ai_agent.tools.apache_echarts.multi_line_chart import ALIASES as MULTI_LINE_ALIASES, build_chart as build_multi_line_chart
from apps.ai_agent.tools.apache_echarts.area_chart import ALIASES as AREA_ALIASES, build_chart as build_area_chart
from apps.ai_agent.tools.apache_echarts.combo_bar_line import ALIASES as COMBO_ALIASES, build_chart as build_combo_chart
from apps.ai_agent.tools.apache_echarts.pie_chart import ALIASES as PIE_ALIASES, build_chart as build_pie_chart
from apps.ai_agent.tools.apache_echarts.donut_chart import ALIASES as DONUT_ALIASES, build_chart as build_donut_chart
from apps.ai_agent.tools.apache_echarts.treemap_chart import ALIASES as TREEMAP_ALIASES, build_chart as build_treemap_chart
from apps.ai_agent.tools.apache_echarts.funnel_chart import ALIASES as FUNNEL_ALIASES, build_chart as build_funnel_chart
from apps.ai_agent.tools.apache_echarts.heatmap_chart import ALIASES as HEATMAP_ALIASES, build_chart as build_heatmap_chart
from apps.ai_agent.tools.apache_echarts.gauge_chart import ALIASES as GAUGE_ALIASES, build_chart as build_gauge_chart
from apps.ai_agent.tools.apache_echarts.bullet_chart import ALIASES as BULLET_ALIASES, build_chart as build_bullet_chart
from apps.ai_agent.tools.apache_echarts.kpi_sparkline_chart import ALIASES as KPI_ALIASES, build_chart as build_kpi_chart
from apps.ai_agent.tools.apache_echarts.scatter_chart import ALIASES as SCATTER_ALIASES, build_chart as build_scatter_chart
from apps.ai_agent.tools.apache_echarts.bubble_chart import ALIASES as BUBBLE_ALIASES, build_chart as build_bubble_chart
from apps.ai_agent.tools.apache_echarts.radar_chart import ALIASES as RADAR_ALIASES, build_chart as build_radar_chart

def _register(builders, aliases, fn):
    for alias in aliases:
        builders[alias] = fn

CHART_BUILDERS = {}
_register(CHART_BUILDERS, VERTICAL_BAR_ALIASES, build_vertical_bar_chart)
_register(CHART_BUILDERS, HORIZONTAL_BAR_ALIASES, build_horizontal_bar_chart)
_register(CHART_BUILDERS, GROUPED_BAR_ALIASES, build_grouped_bar_chart)
_register(CHART_BUILDERS, STACKED_BAR_ALIASES, build_stacked_bar_chart)
_register(CHART_BUILDERS, LINE_ALIASES, build_line_chart)
_register(CHART_BUILDERS, MULTI_LINE_ALIASES, build_multi_line_chart)
_register(CHART_BUILDERS, AREA_ALIASES, build_area_chart)
_register(CHART_BUILDERS, COMBO_ALIASES, build_combo_chart)
_register(CHART_BUILDERS, PIE_ALIASES, build_pie_chart)
_register(CHART_BUILDERS, DONUT_ALIASES, build_donut_chart)
_register(CHART_BUILDERS, TREEMAP_ALIASES, build_treemap_chart)
_register(CHART_BUILDERS, FUNNEL_ALIASES, build_funnel_chart)
_register(CHART_BUILDERS, HEATMAP_ALIASES, build_heatmap_chart)
_register(CHART_BUILDERS, GAUGE_ALIASES, build_gauge_chart)
_register(CHART_BUILDERS, BULLET_ALIASES, build_bullet_chart)
_register(CHART_BUILDERS, KPI_ALIASES, build_kpi_chart)
_register(CHART_BUILDERS, SCATTER_ALIASES, build_scatter_chart)
_register(CHART_BUILDERS, BUBBLE_ALIASES, build_bubble_chart)
_register(CHART_BUILDERS, RADAR_ALIASES, build_radar_chart)

SUPPORTED_CHART_TYPES = tuple(CHART_BUILDERS.keys())
