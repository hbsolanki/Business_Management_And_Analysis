import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

// eslint-disable-next-line react/prop-types
export default function BasicLineChart({ Data }) {
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

  // Prepare series data and determine the max number of points
  const seriesData = [];
  let maxDataLength = 0;

  // Find the max data length across all products
  for (let product in Data) {
    const productData = Data[product];
    maxDataLength = Math.max(maxDataLength, productData.length);
  }

  // Prepare the series data, padding products with fewer data points
  for (let product in Data) {
    const productData = Data[product];

    // Calculate how many null values to pad at the beginning
    const missingDataPoints = maxDataLength - productData.length;

    // Pad the product data with null values for missing data points
    const paddedData = new Array(missingDataPoints)
      .fill(null)
      .concat(productData);

    // Add the padded data to seriesData
    seriesData.push({ data: paddedData, label: product });
  }

  // Generate x-axis labels: 1, 2, 3, ..., up to the maxDataLength
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
