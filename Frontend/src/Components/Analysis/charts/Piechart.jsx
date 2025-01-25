// import * as React from 'react';
// import { PieChart } from '@mui/x-charts/PieChart';

// export default function Piechart() {
//   return (
//     <PieChart
//       series={[
//         {
//           data: [
//             { id: 0, value: 10, label: 'Manufacturing Cost' },
//             { id: 1, value: 15, label: 'Marketing Expenses' },
//             { id: 2, value: 20, label: 'Salary Expenses' },
//             { id: 3, value: 10, label: 'Other Expenses' },
//             { id: 4, value: 15, label: 'Tax' },
//             { id: 5, value: 20, label: 'Net Profit' },
//           ],
//         },
//       ]}
//       width={1000}
//       height={400}
//     />
//   );
// }

// import * as React from 'react';
// import { PieChart } from '@mui/x-charts/PieChart';

// export default function Piechart() {
//   const data = [
//     { id: 0, value: 100, label: 'Manufacturing Cost' },
//     { id: 1, value: 15, label: 'Marketing Expenses' },
//     { id: 2, value: 27, label: 'Salary Expenses' },
//     { id: 3, value: 67, label: 'Other Expenses' },
//     { id: 4, value: 55, label: 'Tax' },
//     { id: 5, value: 21, label: 'Net Profit' },
//   ];

//   // Calculate the total value
//   const totalValue = data.reduce((sum, item) => sum + item.value, 0);

//   // Convert values to percentages
//   const percentageData = data.map(item => ({
//     ...item,
//     value: ((item.value / totalValue) * 100).toFixed(2), // Calculate percentage and fix to 2 decimal places
//   }));

//   return (
//     <PieChart
//       series={[
//         {
//           data: percentageData,
//         },
//       ]}
//       width={1000}
//       height={400}
//     />
//   );
// }

// with percenteg
import { useEffect, useState } from "react";

import { PieChart } from "@mui/x-charts/PieChart";

export default function Piechart({ Data, Height, t }) {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth > 768 ? t || 1000 : window.innerWidth - 20,
    height: Height || (window.innerWidth > 768 ? 300 : 250),
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth > 768 ? t || 1000 : window.innerWidth - 20,
        height: Height || (window.innerWidth > 768 ? 300 : 250),
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [Height, t]);

  const data = [
    { id: 0, value: Data["manaufacturing_cost"], label: "Manufacturing Cost" },
    { id: 1, value: Data["marketing_expenses"], label: "Marketing Expenses" },
    { id: 2, value: Data["salary_expenses"], label: "Salary Expenses" },
    { id: 3, value: Data["other_expenses"], label: "Other Expenses" },
    { id: 4, value: Data["tax"], label: "Tax" },
    { id: 5, value: Data["net_profit"], label: "Net Profit" },
  ];

  // Calculate the total value
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  // Convert values to percentages and update labels
  const percentageData = data.map((item) => ({
    ...item,
    label: `${item.label} (${((item.value / totalValue) * 100).toFixed(2)}%)`, // Include percentage in the label
    value: item.value, // Keep original value for proper chart display
  }));
  let valueFormatter = (item) => `${item.value}%`;

  return (
    <PieChart
      series={[
        {
          data: percentageData,
          highlightScope: { fade: "global", highlight: "item" },
          faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
          valueFormatter,
        },
      ]}
      height={dimensions.height}
    />
  );
}
