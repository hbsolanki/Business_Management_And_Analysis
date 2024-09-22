// import React from 'react'
// import { LineChart } from '@mui/x-charts/LineChart';

// function Productmnf() {
//   return (
//     <LineChart
//       series={[
//         { curve: "linear", data: [0, 5, 2, 6, 3, 9.3] },
//         { curve: "linear", data: [6, 3, 7, 9.5, 4, 2] },
//       ]}
//     />
//   )
// }

// export default Productmnf

import * as React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

export default function BasicLineChart({ Data }) {
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
