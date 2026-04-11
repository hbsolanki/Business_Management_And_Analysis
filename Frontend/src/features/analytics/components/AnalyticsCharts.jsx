import React, { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaDownload, FaExpand } from "react-icons/fa";
import { toPng } from "html-to-image";

import ProductStock from "./charts/ProductStock";
import ProductDetailsBar from "../utils/ProductDetailsBar";
import MonthlyBreakdownChart from "./MonthlyBreakdownChart";
import ProductPerformanceChart from "./ModernProductPerformanceChart";
import NetProfitChart from "./NetProfitChart";

const VISUAL_SECTIONS = [
    {
        id: "month-breakdown",
        title: "Monthly Cost Breakdown",
        description: "Category-wise monthly cost split with filterable month/year controls.",
    },
    {
        id: "net-profit",
        title: "Net Profit Analysis",
        description: "Net profit trend by month/year from monthly summary data.",
    },
    {
        id: "product-performance",
        title: "Product Performance Report",
        description: "Product-level revenue, cost, and profit with report filters.",
    },
    {
        id: "cost-profit",
        title: "Cost vs Profit Analysis",
        description: "Detailed product cost/base/profit bar analytics.",
    },
    {
        id: "inventory-category",
        title: "Inventory by Category",
        description: "Current stock grouped by category with expandable cards.",
    },
];

export default function AnalyticsCharts({ stockData, detailsData }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeSection = searchParams.get("section");

    const openSection = (sectionId) => {
        navigate(`/analytics/visual?section=${sectionId}`);
    };

    const goToList = () => {
        navigate("/analytics/visual", { replace: true });
    };

    if (!activeSection) {
        return (
            <div className="space-y-6 animate-fade-up">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-slate-900">Visual Analytics</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Choose one analytics section. Data is loaded one module at a time.
                    </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VISUAL_SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => openSection(section.id)}
                            className="text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
                        >
                            <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                            <p className="text-xs text-brand-600 font-semibold mt-4">Open Section</p>
                        </button>
                    ))}
                </section>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-up">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Visual Section</p>
                    <h2 className="text-xl font-semibold text-slate-900 mt-1">
                        {VISUAL_SECTIONS.find((s) => s.id === activeSection)?.title || "Analytics Section"}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={goToList}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                    Back to Visual Index
                </button>
            </section>

            {activeSection === "month-breakdown" && <MonthlyBreakdownChart />}
            {activeSection === "net-profit" && <NetProfitChart />}
            {activeSection === "product-performance" && <ProductPerformanceChart />}
            {activeSection === "cost-profit" && (
                detailsData && detailsData.length > 0 ? (
                    <CostProfitSection detailsData={detailsData} navigate={navigate} />
                ) : (
                    <NoSectionData text="No product details data found for cost vs profit analysis." />
                )
            )}
            {activeSection === "inventory-category" && (
                stockData && stockData.length > 0 ? (
                    <InventorySection stockData={stockData} navigate={navigate} />
                ) : (
                    <NoSectionData text="No stock data found for inventory category analytics." />
                )
            )}
            {!VISUAL_SECTIONS.some((s) => s.id === activeSection) && (
                <NoSectionData text="This section is not available." />
            )}
        </div>
    );
}

function NoSectionData({ text }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
            <p className="text-slate-600 font-medium">{text}</p>
        </div>
    );
}

function CostProfitSection({ detailsData, navigate }) {
    const chartRef = useRef(null);

    return (
        <ChartCard
            title="Cost vs Profit Analysis"
            description="Breakdown of cost, base price, and net profit per product"
            chartRef={chartRef}
            onView={() => navigate("/analytics/visual?section=cost-profit")}
            fileName="cost_profit_analysis.png"
        >
            <ProductDetailsBar Data={detailsData} />
        </ChartCard>
    );
}

function InventorySection({ stockData, navigate }) {
    const groupedData = stockData.reduce((acc, item) => {
        const category = item.product_category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});

    return <InventoryCategorySection groupedData={groupedData} navigate={navigate} />;
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                        >
                            {isExpanded ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </button>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500">{description}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={onView}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="View Full Page"
                    >
                        <FaExpand /> View
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Download Chart"
                    >
                        <FaDownload /> Download
                    </button>
                </div>
            </div>

            <div className={`p-4 sm:p-6 ${isExpanded === false ? "hidden" : "block"}`} ref={chartRef}>
                {children}
            </div>
        </div>
    );
}

function InventoryCategorySection({ groupedData, navigate }) {
    const allCategories = Object.keys(groupedData);
    const [expandedCategories, setExpandedCategories] = React.useState(
        allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
    );

    const toggleCategory = (category) => {
        setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
    };

    const expandAll = () => {
        const newState = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
        setExpandedCategories(newState);
    };

    const collapseAll = () => {
        const newState = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: false }), {});
        setExpandedCategories(newState);
    };

    const isAllExpanded = allCategories.every((cat) => expandedCategories[cat]);

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
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Inventory by Category</h2>
                    <p className="text-sm text-slate-500">Stock levels grouped by category</p>
                </div>
                <button
                    onClick={toggleGlobal}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors w-full sm:w-auto"
                >
                    {isAllExpanded ? "Collapse All" : "Expand All"}
                </button>
            </div>

            {Object.entries(groupedData).map(([category, items]) => (
                <CategoryStockChart
                    key={category}
                    category={category}
                    items={items}
                    onView={() => navigate("/analytics/visual?section=inventory-category")}
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
            description={`Stock distribution for ${category}`}
            chartRef={chartRef}
            onView={onView}
            fileName={`stock_levels_${category.toLowerCase().replace(/\s+/g, "_")}.png`}
            isExpanded={isExpanded}
            onToggle={onToggle}
        >
            {isExpanded && <ProductStock data={items} />}
        </ChartCard>
    );
}
