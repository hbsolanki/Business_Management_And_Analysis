import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";

const BasicBars = React.forwardRef(({ data = [] }, ref) => {
  const safeData = Array.isArray(data) ? data : [];

  // Sort by stock quantity descending for better visualization
  const sortedData = [...safeData].sort((a, b) => Number(b.stock_quantity) - Number(a.stock_quantity));

  const productNames = sortedData.map((item) => item.name);
  const productValues = sortedData.map((item) => Number(item.stock_quantity));

  // Dynamic width based on number of products
  const [chartWidth, setChartWidth] = React.useState(
    Math.max(500, productNames.length * 80)
  );

  React.useEffect(() => {
    const handleResize = () => {
      setChartWidth(Math.max(500, productNames.length * 80));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [productNames.length]);

  return (
    <div ref={ref} className="w-full overflow-x-auto">
      <BarChart
        xAxis={[
          {
            scaleType: "band",
            data: productNames,
            label: "Product Name",
            tickLabelStyle: {
              angle: -20,
              textAnchor: "end",
              fontSize: 11,
              fontWeight: 500,
              fill: '#334155',
            },
          }
        ]}
        yAxis={[
          {
            label: "Stock Quantity",
            labelStyle: {
              fontWeight: 600,
              fill: '#334155',
            }
          }
        ]}
        series={[
          {
            data: productValues,
            label: "Stock",
            color: "#14b8a6", // Brand 500
            highlightScope: { faded: 'global', highlighted: 'item' },
          }
        ]}
        width={chartWidth}
        height={400}
        margin={{ left: 80, bottom: 90, top: 40, right: 20 }}
        grid={{ horizontal: true }}
        slotProps={{
          legend: { hidden: true },
        }}
        sx={{
          ".MuiBarElement-root": {
            rx: 4,
            cursor: 'pointer',
            "&:hover": {
              fillOpacity: 0.9,
            }
          },
          ".MuiChartsAxis-label": {
            fontWeight: 'bold',
          }
        }}
      />
    </div>
  );
});

export default BasicBars;
