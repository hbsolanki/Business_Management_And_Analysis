import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";

const BasicBars = React.forwardRef(({ Data }, ref) => {
  const productNames = Object.keys(Data);
  const productValues = Object.values(Data);

  const [chartWidth, setChartWidth] = React.useState(
    Math.max(500, productNames.length * 100)
  );

  React.useEffect(() => {
    const handleResize = () => {
      setChartWidth(Math.max(500, productNames.length * 100));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [productNames.length]);

  return (
    <div ref={ref}>
      <BarChart
        xAxis={[{ scaleType: "band", data: productNames }]}
        series={[{ data: productValues, label: "Stock" }]}
        barLabel={({ value }) => value.toString()}
        width={chartWidth}
        height={400}
        margin={{ left: 100, bottom: 50 }}
      />
    </div>
  );
});

export default BasicBars;
