import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

export default function ProductSell({ Data }) {
  let data = [];
  for (let product in Data) {
    data.push({ data: Data[product], label: product });
  }
  return (
    <LineChart
      xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }]}
      series={data}
      width={1000}
      height={400}
    />
  );
}
