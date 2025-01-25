import React, { useState, useEffect } from "react";
import { LineChart } from "@mui/x-charts/LineChart";

// eslint-disable-next-line react/prop-types
export default function Linechart({ Data, h, t }) {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth > 768 ? t || 1000 : window.innerWidth - 20,
    height: h || (window.innerWidth > 768 ? 300 : 250),
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth > 768 ? t || 1000 : window.innerWidth - 20,
        height: h || (window.innerWidth > 768 ? 300 : 250),
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [h, t]);

  // Reverse the data array
  const data = Data.reverse();

  // Generate xAxis data based on the length of the data
  const xAxisData = Array.from(
    { length: data.length },
    (_, index) => index + 1
  );

  return (
    <LineChart
      xAxis={[{ data: xAxisData }]} // Adjust xAxis to match the length of data
      series={[{ data: data }]}
      width={dimensions.width}
      height={dimensions.height}
      margin={{ left: 100, right: 20, top: 20, bottom: 20 }} // Add left margin for y-axis labels
    />
  );
}
