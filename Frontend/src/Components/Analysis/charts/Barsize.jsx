// import * as React from "react";
// import { BarChart } from "@mui/x-charts/BarChart";

// export default function Barsize() {
//   return (
//     <BarChart
//       xAxis={[
//         {
//           scaleType: "band",
//           data: ["Abhibh", "Bich", "Co", "Dajyn8jnjun", "E", "F", "G", "H"],
//         },
//       ]}
//       series={[
//         { data: [4, 3, 5, 6,4, 3, 5, 6] },
//         { data: [1, 6, 3, 5,4, 3, 5, 6] },
//         { data: [2, 5, 6, 4,4, 3, 5, 6] },
//       ]}
//       width={1000}
//       height={300}
//     />
//   );
// }

import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";

export default function Barsize() {
  return (
    <BarChart
      xAxis={[
        {
          scaleType: "band",
          data: ["Abhibh", "Bich", "Co", "Dajyn8jnjun", "E", "F", "G", "H"],
        },
      ]}
      series={[
        { 
          data: [10000, 12000, 80000, 16000, 140000, 130000, 55000, 60000], 
          label: 'Selling Price', 
          barLabel: (params) => `${params.value}` // Display value on each bar
        },
        { 
          data: [6000, 7000, 45000, 9000, 80000, 70000, 30000, 35000], 
          label: 'Manufacturing Cost', 
          barLabel: (params) => `${params.value}`
        },
        { 
          data: [4000, 5000, 35000, 7000, 60000, 60000, 25000, 25000], 
          label: 'Profit ', 
          barLabel: (params) => `${params.value}`
        },
      ]}
      width={1000}
      height={400}
    />
  );
}
