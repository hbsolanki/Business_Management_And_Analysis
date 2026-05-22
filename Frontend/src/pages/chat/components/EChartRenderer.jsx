import { useEffect, useRef } from "react";

export default function EChartRenderer({ config, height = "400px" }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !config) return;

    const echarts = window.echarts;
    if (!echarts) {
      console.error("ECharts library not found on window.");
      return;
    }

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const { chart_type, labels, datasets, title } = config;

    // Helper to build the option based on backend data
    const buildOption = () => {
      const baseOption = {
        title: {
          text: title || "",
          left: "center",
          top: 10,
          textStyle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          textStyle: { color: '#1e293b' }
        },
        legend: {
          bottom: 0,
          type: 'scroll',
          textStyle: { color: '#64748b' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        toolbox: {
          feature: {
            saveAsImage: { title: "Save" },
            restore: { title: "Reset" }
          },
          right: 10,
          top: 5
        },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { color: '#64748b', fontSize: 11, rotate: labels?.length > 8 ? 30 : 0 },
          axisLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#64748b', fontSize: 11 },
          splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        series: []
      };

      if (['vertical_bar', 'horizontal_bar', 'grouped_bar', 'stacked_bar'].includes(chart_type)) {
        if (chart_type === 'horizontal_bar') {
          const temp = baseOption.xAxis;
          baseOption.xAxis = baseOption.yAxis;
          baseOption.yAxis = temp;
        }

        baseOption.series = (datasets || []).map(ds => ({
          name: ds.label,
          type: 'bar',
          data: ds.data || [],
          stack: chart_type === 'stacked_bar' ? 'total' : undefined,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          emphasis: { focus: 'series' }
        }));
      } else if (['line_chart', 'area_chart', 'multi_line'].includes(chart_type)) {
        baseOption.xAxis.boundaryGap = false;
        baseOption.series = (datasets || []).map(ds => ({
          name: ds.label,
          type: 'line',
          data: ds.data || [],
          smooth: true,
          areaStyle: chart_type === 'area_chart' ? { opacity: 0.1 } : undefined,
          symbolSize: 6,
          emphasis: { focus: 'series' }
        }));
      } else if (['pie_chart', 'donut_chart'].includes(chart_type)) {
        baseOption.tooltip.trigger = 'item';
        const pieData = (labels || []).map((label, i) => ({
          name: label,
          value: datasets?.[0]?.data?.[i] || 0
        }));

        baseOption.series = [{
          name: title,
          type: 'pie',
          radius: chart_type === 'donut_chart' ? ['40%', '70%'] : '60%',
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' }
          },
          data: pieData
        }];
        delete baseOption.xAxis;
        delete baseOption.yAxis;
      } else {
        // Fallback to simple bar
        baseOption.series = (datasets || []).map(ds => ({
          name: ds.label,
          type: 'bar',
          data: ds.data || []
        }));
      }

      // Merge with backend's specific interactive features if provided
      if (config.option) {
        if (config.option.dataZoom) baseOption.dataZoom = config.option.dataZoom;
        if (config.option.toolbox) {
          baseOption.toolbox = {
            ...baseOption.toolbox,
            ...config.option.toolbox,
            feature: { ...baseOption.toolbox.feature, ...config.option.toolbox.feature }
          };
        }
        // If the backend provided explicit grid/axis names, use them
        if (config.option.grid) baseOption.grid = { ...baseOption.grid, ...config.option.grid };
        if (config.option.xAxis?.name) baseOption.xAxis.name = config.option.xAxis.name;
        if (config.option.yAxis?.name) baseOption.yAxis.name = config.option.yAxis.name;
      }

      return baseOption;
    };

    try {
      const option = buildOption();
      instanceRef.current.setOption(option, true);
    } catch (err) {
      console.error("Failed to build/set ECharts option:", err);
    }

    const handleResize = () => {
      instanceRef.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [config]);

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all hover:shadow-md"
      style={{ height }}
    >
      <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
