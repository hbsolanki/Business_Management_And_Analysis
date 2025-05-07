import { useEffect, useState } from "react";
import { PieChart } from "@mui/x-charts/PieChart";

export default function Piechart({ Data, Height, t }) {
  const getDimensions = () => ({
    width: window.innerWidth > 768 ? t || 1000 : window.innerWidth - 20,
    height: Height || (window.innerWidth > 768 ? 300 : 250),
  });

  const [dimensions, setDimensions] = useState(getDimensions);

  useEffect(() => {
    const handleResize = () => setDimensions(getDimensions());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [Height, t]);

  const data = [
    {
      id: 0,
      value: Data?.manufacturing_cost || 0,
      label: "Manufacturing Cost",
    },
    {
      id: 1,
      value: Data?.marketing_expenses || 0,
      label: "Marketing Expenses",
    },
    { id: 2, value: Data?.salary_expenses || 0, label: "Salary Expenses" },
    { id: 3, value: Data?.other_expenses || 0, label: "Other Expenses" },
    { id: 4, value: Data?.tax || 0, label: "Tax" },
    { id: 5, value: Data?.net_profit || 0, label: "Net Profit" },
  ];

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const percentageData = data.map((item) => ({
    ...item,
    label: `${item.label} (${((item.value / totalValue) * 100).toFixed(2)}%)`,
  }));

  const valueFormatter = (item) => `${item.value.toLocaleString("en-IN")} ₹`;

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
      width={dimensions.width}
    />
  );
}
