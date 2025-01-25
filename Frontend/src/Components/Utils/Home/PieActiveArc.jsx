import * as React from "react";
import { PieChart } from "@mui/x-charts/PieChart";

// eslint-disable-next-line react/prop-types
export default function PieActiveArc({ data, valueFormatter }) {
  return (
    <PieChart
      series={[
        {
          data: data,
          highlightScope: { fade: "global", highlight: "item" },
          faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
          valueFormatter,
        },
      ]}
      height={200}
    />
  );
}
