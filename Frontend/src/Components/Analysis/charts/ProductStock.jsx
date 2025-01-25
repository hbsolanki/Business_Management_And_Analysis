// import * as React from 'react';
// import { BarChart } from '@mui/x-charts/BarChart';

// export default function BasicBars() {
//   return (
//     <BarChart
//       xAxis={[{ scaleType: 'band', data: ['Stock'] }]}
//       series={[{ data: [40] }, { data: [100] }, { data: [20] }, { data: [60] }, { data: [80] }, { data: [10] }]}
//       width={500}
//       height={300}
//     />
//   );
// }

import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";

export default function BasicBars({ Data }) {
  let data = [];

  for (let product in Data) {
    data.push({ data: [Data[product]], label: product });
  }

  return (
    <BarChart
      xAxis={[{ scaleType: "band", data: ["Product Stock"] }]} // Updated to match the number of bars
      series={data}
      barLabel={({ value }) => value.toString()} // Display the value as label
      width={1000}
      height={400}
      margin={{ left: 100 }}
    />
  );
}
