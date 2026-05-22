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
        backgroundColor: 'transparent',
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
      } else if (chart_type === 'pie_chart' || chart_type === 'donut_chart' || chart_type === 'pie') {
        baseOption.tooltip.trigger = 'item';
        const pieData = config.pieData ? config.pieData.map(p => ({
          name: p.label || p.name,
          value: p.value,
          itemStyle: p.color ? { color: p.color } : undefined
        })) : (labels || []).map((label, i) => ({
          name: label,
          value: datasets?.[0]?.data?.[i] || 0
        }));

        baseOption.series = [{
          name: title,
          type: 'pie',
          radius: (chart_type === 'donut_chart' || (chart_type === 'pie' && config.seriesProps?.innerRadius)) ? ['40%', '70%'] : '60%',
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
      } else if (chart_type === 'scatter') {
        baseOption.tooltip.trigger = 'item';
        baseOption.tooltip.formatter = (params) => {
          const p = params.data;
          return `${p[2] || 'Data Point'}<br/>X: ${p[0]}<br/>Y: ${p[1]}`;
        };
        baseOption.series = [{
          type: 'scatter',
          symbolSize: 12,
          data: (config.scatterData || []).map(p => [p.x, p.y, p.label, p.id]),
          itemStyle: { color: '#3b82f6', opacity: 0.8 },
          emphasis: { focus: 'self' }
        }];
        baseOption.xAxis = {
          type: 'value',
          name: config.xAxisLabel,
          nameLocation: 'middle',
          nameGap: 25,
          splitLine: { lineStyle: { color: '#f1f5f9' } }
        };
        baseOption.yAxis = {
          type: 'value',
          name: config.yAxisLabel,
          splitLine: { lineStyle: { color: '#f1f5f9' } }
        };
      } else if (chart_type === 'gauge') {
        const val = config.gaugeValue || 0;
        baseOption.series = [{
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: config.gaugeMax || 100,
          splitNumber: 10,
          radius: '95%',
          center: ['50%', '65%'],
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.3, '#ef4444'],
                [0.7, '#f59e0b'],
                [1, '#10b981']
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '12%',
            width: 20,
            offsetCenter: [0, '-60%'],
            itemStyle: { color: 'auto' }
          },
          axisTick: { distance: -14, length: 8, lineStyle: { color: '#fff', width: 2 } },
          splitLine: { distance: -14, length: 14, lineStyle: { color: '#fff', width: 4 } },
          axisLabel: { color: '#64748b', distance: 20, fontSize: 10, fontWeight: 'bold' },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'inherit',
            fontSize: 32,
            fontWeight: '900',
            offsetCenter: [0, '35%']
          },
          title: {
            offsetCenter: [0, '75%'],
            fontSize: 11,
            fontWeight: 'bold',
            color: '#94a3b8',
            textTransform: 'uppercase'
          },
          data: [{ value: val, name: config.gaugeLabel || "" }]
        }];
        delete baseOption.xAxis;
        delete baseOption.yAxis;
      } else if (chart_type === 'radar') {
        baseOption.radar = {
          indicator: (config.radarMetrics || []).map(m => ({ name: m, max: config.max || 100 })),
          radius: '60%',
          axisName: { color: '#64748b', fontWeight: 'bold' },
          splitArea: { areaStyle: { color: ['#fff', '#f8fafc'] } }
        };
        baseOption.series = (config.radarData || []).map(rd => ({
          type: 'radar',
          data: [{ value: rd.data, name: rd.label }],
          symbol: 'none',
          itemStyle: { color: '#3b82f6' },
          areaStyle: { opacity: 0.2 }
        }));
        delete baseOption.xAxis;
        delete baseOption.yAxis;
      } else if (chart_type === 'funnel') {
        baseOption.tooltip.trigger = 'item';
        baseOption.series = [{
          type: 'funnel',
          left: '10%',
          top: 60,
          bottom: 60,
          width: '80%',
          min: 0,
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: { show: true, position: 'inside', color: '#fff', fontWeight: 'bold' },
          data: (labels || []).map((label, i) => ({
            name: label,
            value: datasets?.[0]?.data?.[i] || 0
          }))
        }];
        delete baseOption.xAxis;
        delete baseOption.yAxis;
      } else {
        // Fallback to simple bar
        baseOption.series = (datasets || []).map(ds => ({
          name: ds.label,
          type: 'bar',
          data: ds.data || [],
          itemStyle: { borderRadius: [4, 4, 0, 0] }
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
      className="w-full rounded-2xl border border-slate-200/80 bg-white/40 backdrop-blur-xl p-3 shadow-sm transition-all hover:shadow-md"
      style={{ height }}
    >
      <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
