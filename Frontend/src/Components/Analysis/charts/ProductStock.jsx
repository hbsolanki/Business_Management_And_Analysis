import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";

// eslint-disable-next-line react/prop-types
export default function BasicBars({ Data }) {
  // Extract product names and values
  const productNames = Object.keys(Data);
  const productValues = Object.values(Data);

  return (
    <BarChart
      xAxis={[{ scaleType: "band", data: productNames }]} // Product names as categories
      series={[{ data: productValues, label: "Stock" }]} // One series with all values
      barLabel={({ value }) => value.toString()} // Show labels on bars
      width={Math.max(500, productNames.length * 100)} // Dynamic width based on number of products
      height={400}
      margin={{ left: 100, bottom: 50 }}
    />
  );
}
