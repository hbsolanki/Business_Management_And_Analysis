import { useMemo } from "react";
import EChartRenderer from "@/components/charts/EChartRenderer";
import { FaBoxOpen, FaExclamationTriangle } from "react-icons/fa";

export default function ProductStock({ products = [] }) {
  // Sort products by stock (descending)
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    // Create a copy before sorting to avoid mutating props
    return [...products].sort((a, b) => (a.stock || 0) - (b.stock || 0));
  }, [products]);

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="p-4 bg-slate-50 rounded-full mb-4 border border-slate-100">
          <FaBoxOpen className="text-slate-400 text-3xl" />
        </div>
        <p className="text-slate-500 font-medium">No stock data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
          <FaBoxOpen />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Product Stock Levels</h3>
          <p className="text-sm text-slate-500">Overview of current inventory quantities</p>
        </div>
      </div>

      <div className="w-full">
        <EChartRenderer 
          config={{
            chart_type: 'vertical_bar',
            labels: sortedProducts.map(p => p.name),
            datasets: [
              {
                label: "Stock Quantity",
                data: sortedProducts.map(p => p.stock || 0),
              }
            ],
            option: {
              color: ["#6366f1"],
              yAxis: { name: "Units" },
              toolbox: { show: true },
              dataZoom: [{ type: 'inside' }, { type: 'slider' }]
            }
          }} 
          height="400px" 
        />
      </div>

      {/* Low Stock Warning Section */}
      {sortedProducts.some(p => (p.stock || 0) < 10) && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <FaExclamationTriangle className="text-amber-500 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Low Stock Alert</h4>
            <p className="text-sm text-amber-700 mt-1">
              The following products have less than 10 units:{" "}
              {sortedProducts.filter(p => (p.stock || 0) < 10).map(p => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
