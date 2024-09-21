import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

export default function ProductSell() {
  return (
    <LineChart
      xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }]}
      series={[
        {
          data: [200, 33, 64, 91, 33, 55, 26, 85, 150, 50], // First line
          label: "iphone", // Add label here
        },

        {
          data: [37, 69, 69, 90, 156, 67, 120, 45, 98, 79], // Second line
          label: "macbook air", // Add label here
        },

        {
          data: [110, 67, 38, 99, 76, 56, 103, 88, 147, 79], // Third line
          label: "ipad", // Add label here
        },
      ]}
      width={1000}
      height={400}
    />
  );
}
