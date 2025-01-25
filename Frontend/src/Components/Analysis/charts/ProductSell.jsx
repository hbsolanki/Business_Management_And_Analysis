import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

export default function ProductSell({ Data }) {
  const [chartWidth, setChartWidth] = React.useState(
    window.innerWidth > 768 ? 1000 : window.innerWidth - 20
  );

  // Update chart width dynamically on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setChartWidth(window.innerWidth > 768 ? 1000 : window.innerWidth - 20);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prepare series data
  const seriesData = [];
  let maxDataLength = 0;

  for (let product in Data) {
    const productData = Data[product];
    seriesData.push({ data: productData, label: product });
    maxDataLength = Math.max(maxDataLength, productData.length);
  }

  // Generate xAxis values dynamically
  const xAxisData = Array.from(
    { length: maxDataLength },
    (_, index) => index + 1
  );

  return (
    <LineChart
      xAxis={[{ data: xAxisData, label: "Time Period" }]} // Provide a default label for xAxis
      series={seriesData}
      width={chartWidth}
      height={400}
      margin={{ left: 100 }}
    />
  );
}
