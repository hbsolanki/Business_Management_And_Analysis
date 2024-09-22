import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

export default function Linechart({ Data }) {
  let cr = 1000000;
  let data = [];
  Data.reverse().map((val) => {
    data.push(val / cr);
  });
  return (
    <LineChart
      xAxis={[{ data: [1, 2, 3, 5, 8, 10] }]}
      series={[
        {
          data: data,
        },
      ]}
      width={1000}
      height={300}
    />
  );
}
