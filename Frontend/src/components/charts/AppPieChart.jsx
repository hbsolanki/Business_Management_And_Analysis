import EChartRenderer from "./EChartRenderer";

export default function AppPieChart({
    data,
    colors,
    height = 260,
    showLegend = false,
    seriesProps = {},
}) {
    return (
        <div className="w-full">
            <EChartRenderer 
                config={{
                    chart_type: seriesProps.innerRadius ? 'donut_chart' : 'pie_chart',
                    pieData: data,
                    title: "",
                    option: {
                        legend: { show: showLegend },
                        color: colors,
                        toolbox: { show: true }
                    }
                }} 
                height={`${height}px`} 
            />
        </div>
    );
}
