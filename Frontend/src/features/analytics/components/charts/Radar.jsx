import * as React from "react";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { RadarChart } from "@mui/x-charts/RadarChart";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

function valueFormatter(v) {
  return v === null ? "NaN" : `${v.toLocaleString()} ₹`;
}

const Radar = React.forwardRef(
  ({ Data = [], metrics = ["Price", "COGS", "Revenue"] }, chartRef) => {
    const [highlightedItem, setHighlightedItem] = React.useState(null);
    const [fillArea, setFillArea] = React.useState(false);

    const series = Data.map((item) => ({
      id: item.name,
      label: item.name,
      data: [item.price, item.cogs, item.revenue],
      valueFormatter,
      type: "radar",
      fillArea,
    }));

    const handleHighLightedSeries = (_, newSeriesId) => {
      setHighlightedItem(newSeriesId ? { seriesId: newSeriesId } : null);
    };

    return (
      <Stack sx={{ width: "100%" }} spacing={2} alignItems="center">
        {/* Top-left control bar */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={fillArea}
                onChange={(e) => setFillArea(e.target.checked)}
              />
            }
            label="Fill Area"
          />
        </Box>

        {/* Toggle Buttons */}
        <ToggleButtonGroup
          value={highlightedItem?.seriesId ?? null}
          exclusive
          onChange={handleHighLightedSeries}
          aria-label="highlighted series"
          fullWidth
          size="small"
        >
          {series.map((item) => (
            <ToggleButton
              key={item.id}
              value={item.id}
              aria-label={`series ${item.label}`}
            >
              {item.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Radar Chart */}
        <Box sx={{ width: "100%" }} ref={chartRef}>
          <RadarChart
            height={300}
            highlight="series"
            highlightedItem={highlightedItem}
            onHighlightChange={setHighlightedItem}
            series={series}
            radar={{ metrics }}
          />
        </Box>
      </Stack>
    );
  }
);

export default Radar;
