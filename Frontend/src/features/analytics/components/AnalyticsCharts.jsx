import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaDownload, FaExpand } from "react-icons/fa";
import { toPng } from "html-to-image";

import ProductStock from "./charts/ProductStock";
import ProductDetailsBar from "../utils/ProductDetailsBar";
import MonthlyBreakdownChart from "./MonthlyBreakdownChart";
import ProductPerformanceChart from "./ProductPerformanceChart";
import NetProfitChart from "./NetProfitChart";

export default function AnalyticsCharts({ stockData, detailsData }) {
    const navigate = useNavigate();
    const stockRef = useRef(null);
    const detailsRef = useRef(null);
    const breakdownRef = useRef(null);
    const performanceRef = useRef(null);
    const netProfitRef = useRef(null);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Monthly Breakdown Pie Chart */}
            <div ref={breakdownRef}>
                <MonthlyBreakdownChart />
            </div>

            {/* Net Profit Chart */}
            <div ref={netProfitRef}>
                <NetProfitChart />
            </div>

            {/* Product Performance Chart */}
            <div ref={performanceRef}>
                <ProductPerformanceChart />
            </div>

            {/* Product Details Chart */}
            {detailsData && detailsData.length > 0 && (
                <ChartCard
                    title="Cost vs Profit Analysis"
                    description="Breakdown of cost, base price, and net profit per product"
                    chartRef={detailsRef}
                    onView={() => navigate("/analytics/product_stats")}
                    fileName="cost_profit_analysis.png"
                >
                    <ProductDetailsBar Data={detailsData} />
                </ChartCard>
            )}

            {/* Product Stock Charts by Category */}
            {stockData && stockData.length > 0 && (() => {
                // Group data by product_category once to get keys
                const groupedData = stockData.reduce((acc, item) => {
                    const category = item.product_category || "Uncategorized";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(item);
                    return acc;
                }, {});

                const allCategories = Object.keys(groupedData);

                // State logic (using React.useState in a loop is bad, but this is an IIFE)
                // Wait, I cannot use hooks inside an IIFE inside render. 
                // I must refactor the logic to be outside or use a separate component.
                // Refactoring to a separate component `InventoryCategorySection`.

                return (
                    <InventoryCategorySection
                        groupedData={groupedData}
                        navigate={navigate}
                    />
                );
            })()}
        </div>
    );
}


function ChartCard({ title, description, children, chartRef, onView, fileName, isExpanded, onToggle }) {
    const handleDownload = () => {
        if (!chartRef?.current) return;

        toPng(chartRef.current, { backgroundColor: "white" })
            .then((dataUrl) => {
                const link = document.createElement("a");
                link.download = fileName;
                link.href = dataUrl;
                link.click();
            })
            .catch(console.error);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        >
                            {isExpanded ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </button>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={onView}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Full Page"
                    >
                        <FaExpand /> View
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Download Chart"
                    >
                        <FaDownload /> Download
                    </button>
                </div>
            </div>

            {/* Chart Content */}
            <div className={`p-3 sm:p-6 transition-all duration-300 ease-in-out ${isExpanded === false ? 'hidden' : 'block'}`} ref={chartRef}>
                {children}
            </div>
        </div>
    );
}



function InventoryCategorySection({ groupedData, navigate }) {
    const allCategories = Object.keys(groupedData);
    // Initialize expanded state for all categories (default true)
    const [expandedCategories, setExpandedCategories] = React.useState(
        allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
    );

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const expandAll = () => {
        const newState = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
        setExpandedCategories(newState);
    };

    const collapseAll = () => {
        const newState = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: false }), {});
        setExpandedCategories(newState);
    };

    const isAllExpanded = allCategories.every(cat => expandedCategories[cat]);

    const toggleGlobal = () => {
        if (isAllExpanded) {
            collapseAll();
        } else {
            expandAll();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">Inventory by Category</h2>
                <button
                    onClick={toggleGlobal}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm w-full sm:w-auto"
                >
                    {isAllExpanded ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Collapse All
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Expand All
                        </>
                    )}
                </button>
            </div>

            {Object.entries(groupedData).map(([category, items]) => (
                <CategoryStockChart
                    key={category}
                    category={category}
                    items={items}
                    onView={() => navigate("/analytics/product_stock")}
                    isExpanded={!!expandedCategories[category]}
                    onToggle={() => toggleCategory(category)}
                />
            ))}
        </div>
    );
}

function CategoryStockChart({ category, items, onView, isExpanded, onToggle }) {
    const chartRef = useRef(null);

    return (
        <ChartCard
            title={`Stock Levels: ${category}`}
            description={`Data for ${category}`} // Shortened description for mobile
            chartRef={chartRef}
            onView={onView}
            fileName={`stock_levels_${category.toLowerCase().replace(/\s+/g, '_')}.png`}
            isExpanded={isExpanded}
            onToggle={onToggle}
        >
            {isExpanded && <ProductStock data={items} />}
        </ChartCard>
    );
}

