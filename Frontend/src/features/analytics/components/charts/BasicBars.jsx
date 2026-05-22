import EChartRenderer from "@/components/charts/EChartRenderer";

export default function BasicBars({ xAxis, series, height }) {
  const labels = xAxis?.[0]?.data || [];
  const datasets = series.map(s => ({
    label: s.label,
    data: s.data
  }));

  return (
    <EChartRenderer 
      config={{
        chart_type: 'vertical_bar',
        labels,
        datasets,
        option: {
            toolbox: { show: true },
            dataZoom: [{ type: 'inside' }, { type: 'slider' }]
        }
      }} 
      height={`${height}px`} 
    />
  );
}
