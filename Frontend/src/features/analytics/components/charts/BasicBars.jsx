import { BarChart } from '@mui/x-charts/BarChart';

export default function BasicBars({xAxis,series,height}) {
  return (
    <BarChart
      xAxis={xAxis}
      series={series}
      height={height}
    />
  );
}
