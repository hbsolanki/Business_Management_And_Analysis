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

export default function Barsize({ Data }) {
  let mainObject = {
    scaleType: "band",
    data: [],
  };
  let object1 = {
    data: [],
    label: "Selling Price",
    barLabel: (params) => `${params.value}`, // Display value on each bar
  };
  let object2 = {
    data: [],
    label: "Manufacturing Cost",
    barLabel: (params) => `${params.value}`,
  };
  let object3 = {
    data: [],
    label: "Profit ",
    barLabel: (params) => `${params.value}`,
  };
  Data.map((product) => {
    mainObject.data.push(product["name"]);
    object1.data.push(product["price"]);
    object2.data.push(product["cogs"]);
    object3.data.push(product["revenue"]);
  });
  return (
    <BarChart
      xAxis={[mainObject]}
      series={[object1, object2, object3]}
      width={1000}
      height={400}
    />
  );
}
