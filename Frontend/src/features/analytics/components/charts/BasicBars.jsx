import { BarChart } from '@mui/x-charts/BarChart';

export default function BasicBars({ xAxis, series, height }) {
  return (
    <BarChart
      xAxis={xAxis}
      series={series}
      height={height}
      grid={{ horizontal: true }}
      margin={{ left: 70, right: 20, top: 40, bottom: 40 }}
      slotProps={{
        legend: {
          direction: 'horizontal',
          position: { vertical: 'top', horizontal: 'middle' },
        }
      }}
      sx={{
        ".MuiBarElement-root": {
          rx: 4,
        }
      }}
    />
  );
}
