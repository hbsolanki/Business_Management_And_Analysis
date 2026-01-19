import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

const BasicLineChart = React.forwardRef(({ Data }, ref) => {
  const [chartWidth, setChartWidth] = React.useState(
    window.innerWidth > 768 ? 1000 : window.innerWidth - 20
  );

  // Update chart width on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setChartWidth(window.innerWidth > 768 ? 1000 : window.innerWidth - 20);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const seriesData = [];
  let maxDataLength = 0;

  for (let product in Data) {
    const productData = Data[product];
    maxDataLength = Math.max(maxDataLength, productData.length);
  }

  for (let product in Data) {
    const productData = Data[product];
    const missingDataPoints = maxDataLength - productData.length;
    const paddedData = new Array(missingDataPoints)
      .fill(null)
      .concat(productData);
    seriesData.push({ data: paddedData, label: product });
  }

  const xAxisData = Array.from(
    { length: maxDataLength },
    (_, index) => index + 1
  );

  return (
    <div ref={ref}>
      <LineChart
        xAxis={[{ data: xAxisData, label: "Time Period" }]}
        series={seriesData}
        width={chartWidth}
        height={400}
        margin={{ left: 100 }}
      />
    </div>
  );
});

export default BasicLineChart;
