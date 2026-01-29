import { useState } from "react";
import { FaChevronUp, FaChevronDown, FaExpandAlt, FaCompressAlt } from "react-icons/fa";
import BasicBars from "@/features/analytics/components/charts/BasicBars";

function ProductDetailsBar({ Data = [] }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allExpanded, setAllExpanded] = useState(true);

  if (!Array.isArray(Data) || Data.length === 0) return null;

  // group by category
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

  // Initialize expanded state for all categories on first render
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

  // Check if all are expanded or collapsed
  const areAllExpanded = categories.every((cat) => isCategoryExpanded(cat));
  const areAllCollapsed = categories.every((cat) => !isCategoryExpanded(cat));

  return (
    <div className="space-y-4">
      {/* Expand/Collapse All Button */}
      <div className="flex justify-end">
        {areAllExpanded ? (
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FaCompressAlt className="text-gray-500" />
            Collapse All
          </button>
        ) : (
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FaExpandAlt className="text-gray-500" />
            Expand All
          </button>
        )}
      </div>

      {/* Category Charts */}
      {Object.entries(groupedByCategory).map(([category, products]) => {
        const isExpanded = isCategoryExpanded(category);
        return (
          <div
            key={category}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-300"
          >
            {/* Category Header - Clickable */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-gray-800">
                  Category: {category}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-sm">{isExpanded ? "Collapse" : "Expand"}</span>
                {isExpanded ? (
                  <FaChevronUp className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <FaChevronDown className="h-4 w-4 transition-transform duration-200" />
                )}
              </div>
            </button>

            {/* Chart Content - Collapsible */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
              <div className="p-4 border-t border-gray-100">
                <BasicBars
                  xAxis={[
                    {
                      data: products.map((p) => p.name),
                      scaleType: "band",
                    },
                  ]}
                  series={[
                    {
                      data: products.map((p) => p.cost_price),
                      label: "Cost Price",
                      color: "#ef4444",
                      valueFormatter: (v) => `₹${v}`,
                    },
                    {
                      data: products.map((p) => p.base_price),
                      label: "Base Price",
                      color: "#6366f1",
                      valueFormatter: (v) => `₹${v}`,
                    },
                    {
                      data: products.map((p) => p.net_profit),
                      label: "Net Profit",
                      color: "#10b981",
                      valueFormatter: (v) => `₹${v}`,
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
