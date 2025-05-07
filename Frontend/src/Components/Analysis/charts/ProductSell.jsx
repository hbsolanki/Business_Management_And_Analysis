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

  // Find the max data length for all products
  for (let product in Data) {
    const productData = Data[product];
    maxDataLength = Math.max(maxDataLength, productData.length);
  }

  // Prepare series data, padding the data for products with fewer points
  for (let product in Data) {
    const productData = Data[product];
    // Calculate how many null values to pad at the beginning
    const missingDataPoints = maxDataLength - productData.length;

    // Pad the product data with null values for missing data points
    const paddedData = new Array(missingDataPoints)
      .fill(null)
      .concat(productData);

    // Push the padded data to seriesData
    seriesData.push({ data: paddedData, label: product });
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
