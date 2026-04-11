import AppPieChart from "@/components/charts/AppPieChart";

export default function PieActiveArc({ data, valueFormatter }) {
    return (
        <AppPieChart
            data={data}
            height={200}
            seriesProps={{
                highlightScope: { fade: "global", highlight: "item" },
                faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
                valueFormatter,
            }}
        />
    );
}
