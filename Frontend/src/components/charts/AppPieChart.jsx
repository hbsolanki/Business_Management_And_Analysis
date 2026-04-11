import { PieChart } from "@mui/x-charts/PieChart";

const DEFAULT_COLORS = [
    "#0f766e",
    "#2563eb",
    "#f59e0b",
    "#16a34a",
    "#7c3aed",
    "#e11d48",
    "#0ea5e9",
];

function normalizePieData(data, colors) {
    const rows = Array.isArray(data) ? data : [];

    return rows.map((item, index) => ({
        ...item,
        id: item?.id ?? item?.label ?? `slice-${index}`,
        label: item?.label ?? `Item ${index + 1}`,
        value: Number(item?.value) || 0,
        color: item?.color || colors[index % colors.length],
    }));
}

export default function AppPieChart({
    data,
    colors = DEFAULT_COLORS,
    height = 260,
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
    showLegend = false,
    seriesProps = {},
    slotProps = {},
    sx,
}) {
    const normalizedData = normalizePieData(data, colors);
    const mergedSlotProps = {
        ...slotProps,
        legend: {
            hidden: !showLegend,
            ...(slotProps.legend || {}),
        },
    };

    return (
        <div className="w-full min-w-[320px]">
            <PieChart
                colors={colors}
                series={[
                    {
                        data: normalizedData,
                        innerRadius: 30,
                        outerRadius: 100,
                        paddingAngle: 5,
                        cornerRadius: 5,
                        startAngle: -45,
                        endAngle: 225,
                        cx: 150,
                        cy: 150,
                        ...seriesProps,
                    },
                ]}
                height={height}
                margin={margin}
                slotProps={mergedSlotProps}
                sx={sx}
            />
        </div>
    );
}
