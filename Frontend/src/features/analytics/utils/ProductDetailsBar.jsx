import { useState } from "react";
import { FaChevronUp, FaChevronDown, FaExpandAlt, FaCompressAlt, FaBox } from "react-icons/fa";
import BasicBars from "@/features/analytics/components/charts/BasicBars";

function ProductDetailsBar({ Data = [] }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allExpanded, setAllExpanded] = useState(true);

  if (!Array.isArray(Data) || Data.length === 0) return null;

  const groupedByCategory = Data.reduce((acc, item) => {
    const category = item.product_category || "Uncategorized";
    acc[category] = acc[category] || [];
    acc[category].push({
      ...item,
      cost_price: Number(item.cost_price),
      base_price: Number(item.base_price),
      net_profit: Number(item.net_profit),
    });
    return acc;
  }, {});

  const categories = Object.keys(groupedByCategory);

  const isCategoryExpanded = (category) => {
    if (expandedCategories[category] === undefined) {
      return allExpanded;
    }
    return expandedCategories[category];
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !isCategoryExpanded(category),
    }));
  };

  const handleExpandAll = () => {
    const newState = {};
    categories.forEach((cat) => {
      newState[cat] = true;
    });
    setExpandedCategories(newState);
    setAllExpanded(true);
  };

  const handleCollapseAll = () => {
    const newState = {};
    categories.forEach((cat) => {
      newState[cat] = false;
    });
    setExpandedCategories(newState);
    setAllExpanded(false);
  };

  const areAllExpanded = categories.every((cat) => isCategoryExpanded(cat));

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <FaBox />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Product Cost & Profit Breakdown</h3>
            <p className="text-sm text-slate-500">Detailed analysis by category</p>
          </div>
        </div>
        <div className="flex justify-end">
          {areAllExpanded ? (
            <button
              onClick={handleCollapseAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <FaCompressAlt className="text-slate-500" />
              Collapse All
            </button>
          ) : (
            <button
              onClick={handleExpandAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <FaExpandAlt className="text-slate-500" />
              Expand All
            </button>
          )}
        </div>
      </div>

      {Object.entries(groupedByCategory).map(([category, products]) => {
        const isExpanded = isCategoryExpanded(category);
        return (
          <div
            key={category}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all duration-300 shadow-sm"
          >
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-slate-800">{category}</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-white text-slate-600 border border-slate-200 rounded-full">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">{isExpanded ? "Collapse" : "Expand"}</span>
                {isExpanded ? (
                  <FaChevronUp className="h-3 w-3" />
                ) : (
                  <FaChevronDown className="h-3 w-3" />
                )}
              </div>
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
              <div className="p-5 border-t border-slate-200">
                <BasicBars
                  xAxis={[
                    {
                      data: products.map((p) => p.name),
                      scaleType: "band",
                      tickLabelStyle: {
                        fontSize: 11,
                        fill: '#64748b'
                      }
                    },
                  ]}
                  series={[
                    {
                      data: products.map((p) => p.cost_price),
                      label: "Cost Price",
                      color: "#f43f5e", // Rose 500
                      valueFormatter: (v) => formatCurrency(v),
                    },
                    {
                      data: products.map((p) => p.base_price),
                      label: "Base Price",
                      color: "#0ea5e9", // Sky 500
                      valueFormatter: (v) => formatCurrency(v),
                    },
                    {
                      data: products.map((p) => p.net_profit),
                      label: "Net Profit",
                      color: "#14b8a6", // Teal 500
                      valueFormatter: (v) => formatCurrency(v),
                    },
                  ]}
                  height={300}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProductDetailsBar;
