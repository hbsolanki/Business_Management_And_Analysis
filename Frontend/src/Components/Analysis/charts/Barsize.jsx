import * as React from "react";
import { BarChart } from "@mui/x-charts/BarChart";

export default function Barsize({ Data }) {
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth > 768 ? 1000 : window.innerWidth - 20,
    height: window.innerWidth > 768 ? 400 : 300,
  });

  // Update dimensions on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth > 768 ? 1000 : window.innerWidth - 20,
        height: window.innerWidth > 768 ? 400 : 300,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    label: "Profit",
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
      width={dimensions.width}
      height={dimensions.height}
      margin={{ left: 100 }}
    />
  );
}
