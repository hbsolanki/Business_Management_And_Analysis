import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import EChartRenderer from "@/components/charts/EChartRenderer";
import {
    FaArrowLeft,
    FaCodeBranch,
    FaCalendarAlt,
    FaChartLine,
    FaCheckCircle,
    FaExclamationTriangle,
    FaFilter,
    FaLayerGroup,
    FaPlay,
    FaRedoAlt,
    FaSearch,
    FaTimes,
    FaChevronDown
} from "react-icons/fa";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import api from "@/services/api";
import { branchService } from "@/features/business/services/branchService";
import {
    ANALYTICS_ENDPOINTS,
    getAnalyticsEndpoint,
    getDefaultFiltersForEndpoint,
    getFilterFieldOptions,
    getMonthLabel,
    SECTION_TO_ENDPOINT_ID,
    serializeFilters,
} from "./analyticsRegistry";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("en-IN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const CHART_COLORS = ["#0f766e", "#0ea5e9", "#3b82f6", "#16a34a", "#f59e0b", "#e11d48", "#7c3aed"];

function toLocalDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toLocalDateTimeValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function minTemporalValue(valueA, valueB) {
    if (!valueA) return valueB || "";
    if (!valueB) return valueA;
    return valueA <= valueB ? valueA : valueB;
}

function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
    return CURRENCY_FORMATTER.format(toNumber(value));
}

function formatInteger(value) {
    return NUMBER_FORMATTER.format(toNumber(value));
}

function formatPercent(value) {
    return PERCENT_FORMATTER.format(toNumber(value));
}

function safeDivide(numerator, denominator) {
    const den = toNumber(denominator);
    if (!den) return 0;
    return toNumber(numerator) / den;
}

function sumBy(rows, key) {
    return rows.reduce((sum, item) => sum + toNumber(item[key]), 0);
}

function normalizeRows(data) {
    if (!Array.isArray(data)) return [];
    return data.filter((row) => row && typeof row === "object");
}

function readRows(payload, arrayKey) {
    if (Array.isArray(payload)) return normalizeRows(payload);
    if (payload && Array.isArray(payload.results)) return normalizeRows(payload.results);
    if (arrayKey && payload && Array.isArray(payload[arrayKey])) return normalizeRows(payload[arrayKey]);
    return [];
}

function getResolvedEndpointId(routeId, searchParams, fallbackId = "month-breakdown") {
    if (routeId) return routeId;

    const section = searchParams.get("section");
    if (section && SECTION_TO_ENDPOINT_ID[section]) return SECTION_TO_ENDPOINT_ID[section];

    const queryApi = searchParams.get("api");
    if (queryApi) return queryApi;

    return fallbackId;
}

function toTitleCase(text) {
    if (!text) return "";
    return String(text)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildPeriodLabel(row, index) {
    if (!row || typeof row !== "object") return `Period ${index + 1}`;
    if (row.month && row.year && Number(row.month) >= 1 && Number(row.month) <= 12) {
        return `${getMonthLabel(row.month)} ${row.year}`;
    }
    if (row.month_name && row.year) return `${row.month_name} ${row.year}`;
    if (row.date) {
        const parsed = new Date(row.date);
        if (!Number.isNaN(parsed.getTime())) {
            return `${getMonthLabel(parsed.getMonth() + 1)} ${parsed.getFullYear()}`;
        }
    }
    return `Period ${index + 1}`;
}

function looksLikeMoneyKey(key = "") {
    const normalized = String(key).toLowerCase();
    return ["price", "cost", "profit", "revenue", "tax", "gst", "amount", "value", "spend"].some((token) =>
        normalized.includes(token)
    );
}

function formatCellValue(key, value) {
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return `${value.length} item(s)`;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);

    // Preserve mobile/phone numbers as plain strings (don't format as numbers)
    const lowerKey = String(key).toLowerCase();
    if (lowerKey.includes("mobile") || lowerKey.includes("phone")) {
        return String(value);
    }

    const parsed = toNumber(value);
    const isNumeric = typeof value === "number" || /^-?\d+(\.\d+)?$/.test(String(value));
    if (isNumeric) {
        if (looksLikeMoneyKey(key)) return formatCurrency(parsed);
        return NUMBER_FORMATTER.format(parsed);
    }

    return String(value);
}

function validateFilters(filters) {
    const now = new Date();
    const today = toLocalDateValue(now);
    const nowDateTime = toLocalDateTimeValue(now);

    const fromDate = filters.from_date;
    const toDate = filters.to_date;
    if (fromDate && fromDate > today) {
        return "From Date cannot be in the future.";
    }
    if (toDate && toDate > today) {
        return "To Date cannot be in the future.";
    }
    if (fromDate && toDate && fromDate > toDate) {
        return "From Date cannot be after To Date.";
    }

    const fromDateTime = filters.from_date_and_time;
    const toDateTime = filters.to_date_and_time;
    if (fromDateTime && fromDateTime > nowDateTime) {
        return "From Date & Time cannot be in the future.";
    }
    if (toDateTime && toDateTime > nowDateTime) {
        return "To Date & Time cannot be in the future.";
    }
    if (fromDateTime && toDateTime && fromDateTime > toDateTime) {
        return "From Date & Time cannot be after To Date & Time.";
    }

    const monthCurrentYearChecks = [
        { month: filters.month, year: filters.year, name: "Month/Year" },
        { month: filters.start_month, year: filters.start_year, name: "Start month/year" },
        { month: filters.end_month, year: filters.end_year, name: "End month/year" },
    ];
    for (const item of monthCurrentYearChecks) {
        if (!item.month || !item.year) continue;
        if (
            Number(item.year) === now.getFullYear() &&
            Number(item.month) > now.getMonth() + 1
        ) {
            return `${item.name} cannot be in the future.`;
        }
    }

    const hasRange =
        filters.start_year && filters.start_month && filters.end_year && filters.end_month;

    if (hasRange) {
        const startScore = Number(filters.start_year) * 100 + Number(filters.start_month);
        const endScore = Number(filters.end_year) * 100 + Number(filters.end_month);
        if (startScore > endScore) {
            return "Start month/year cannot be after End month/year.";
        }
    }

    return "";
}

function normalizeFutureFilterValue(key, value) {
    if (value === "" || value === null || value === undefined) return value;

    const now = new Date();
    const today = toLocalDateValue(now);
    const nowDateTime = toLocalDateTimeValue(now);

    if (key === "from_date" || key === "to_date") {
        return value > today ? today : value;
    }

    if (key === "from_date_and_time" || key === "to_date_and_time") {
        return value > nowDateTime ? nowDateTime : value;
    }

    return value;
}

function getErrorDetail(err) {
    return (
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        ""
    );
}

function isNoDataError(err) {
    const detail = String(getErrorDetail(err)).toLowerCase();
    return (
        detail.includes("no data") ||
        detail.includes("data not found") ||
        detail.includes("no records") ||
        detail.includes("no result") ||
        detail.includes("no sales") ||
        detail.includes("not found for")
    );
}

function baseDashboard() {
    return {
        cards: [],
        charts: [],
        summaryEntries: [],
        table: null,
        extraTables: [],
        detailObjects: [],
    };
}

function topRows(rows, key, limit = 10) {
    return [...rows].sort((a, b) => toNumber(b[key]) - toNumber(a[key])).slice(0, limit);
}

function resolveBranchLabel(row, branchNameById = {}) {
    if (!row || typeof row !== "object") return "";

    const branchValue = row.branch ?? row.branch_id ?? row.branchId ?? "";
    if (branchValue && typeof branchValue === "object") {
        const nestedId = branchValue.id ?? branchValue.branch_id;
        const nestedName = branchValue.branch_name || branchValue.name;
        if (nestedName) return nestedName;
        if (nestedId !== null && nestedId !== undefined && nestedId !== "") {
            return branchNameById[String(nestedId)] || `Branch ${nestedId}`;
        }
        return "";
    }

    if (branchValue === null || branchValue === undefined || branchValue === "") return "";
    const branchId = String(branchValue);
    return branchNameById[branchId] || `Branch ${branchId}`;
}

function buildProductDetailsDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();

    const totalCost = sumBy(rows, "cost_price");
    const totalBase = sumBy(rows, "base_price");
    const totalNet = sumBy(rows, "net_profit");

    dashboard.cards = [
        { label: "Products", value: formatInteger(rows.length), hint: "Catalog rows", tone: "slate" },
        { label: "Average Cost", value: formatCurrency(rows.length ? totalCost / rows.length : 0), hint: "Per product", tone: "sky" },
        { label: "Average Base", value: formatCurrency(rows.length ? totalBase / rows.length : 0), hint: "Per product", tone: "amber" },
        {
            label: "Total Net Margin",
            value: formatCurrency(totalNet),
            hint: `Margin ratio ${formatPercent(safeDivide(totalNet, totalBase || 1))}`,
            tone: totalNet >= 0 ? "emerald" : "rose",
        },
    ];

    const topMargin = topRows(rows, "net_profit", 10);
    if (topMargin.length > 0) {
        dashboard.charts.push({
            id: "product-details-margin",
            type: "line",
            title: "Top Net Margin Products",
            subtitle: "Highest net margin by product",
            labels: topMargin.map((item) => item.name || `Product ${item.id || ""}`),
            series: [{ label: "Net Margin", data: topMargin.map((item) => toNumber(item.net_profit)), color: "#8b5cf6" }],
            valueType: "currency",
        });
    }

    const compareRows = topRows(rows, "base_price", 8);
    if (compareRows.length > 0) {
        dashboard.charts.push({
            id: "product-details-compare",
            type: "bar",
            title: "Cost vs Base Price",
            subtitle: "Price comparison for top products",
            labels: compareRows.map((item) => item.name || `Product ${item.id || ""}`),
            series: [
                { label: "Cost Price", data: compareRows.map((item) => toNumber(item.cost_price)), color: "#2563eb" },
                { label: "Base Price", data: compareRows.map((item) => toNumber(item.base_price)), color: "#f97316" },
            ],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Product Details", rows };
    return dashboard;
}

function buildProductStockDashboard(payload, options = {}) {
    const { showBranchLabel = false, branchNameById = {} } = options;
    const rawRows = readRows(payload);
    const rows = rawRows.map((row) => {
        if (!showBranchLabel) return row;
        const branchLabel = resolveBranchLabel(row, branchNameById);
        if (!branchLabel) return row;
        return { ...row, branch_name: branchLabel };
    });
    const dashboard = baseDashboard();

    const totalStock = sumBy(rows, "stock_quantity");
    const lowStock = rows.filter((item) => toNumber(item.stock_quantity) < 10).length;

    const categoryTotals = rows.reduce((acc, row) => {
        const category = row.product_category || "Uncategorized";
        acc[category] = (acc[category] || 0) + toNumber(row.stock_quantity);
        return acc;
    }, {});

    const categoryRows = Object.entries(categoryTotals).map(([category, quantity]) => ({
        category,
        quantity,
    }));

    dashboard.cards = [
        { label: "Products", value: formatInteger(rows.length), hint: "Inventory items", tone: "slate" },
        { label: "Total Units", value: formatInteger(totalStock), hint: "Current stock", tone: "sky" },
        { label: "Low Stock", value: formatInteger(lowStock), hint: "Below 10 units", tone: lowStock > 0 ? "rose" : "emerald" },
        { label: "Categories", value: formatInteger(categoryRows.length), hint: "Stock groups", tone: "amber" },
    ];

    const topStockRows = topRows(rows, "stock_quantity", 12);
    if (topStockRows.length > 0) {
        dashboard.charts.push({
            id: "product-stock-top",
            type: "bar",
            title: "Stock by Product",
            subtitle: showBranchLabel ? "Top products by available units across branches" : "Top products by available units",
            labels: topStockRows.map((item) => {
                const productLabel = item.name || `Product ${item.id || ""}`;
                if (!showBranchLabel) return productLabel;
                const branchLabel = item.branch_name || resolveBranchLabel(item, branchNameById);
                return branchLabel ? `${productLabel} (${branchLabel})` : productLabel;
            }),
            series: [{ label: "Stock Units", data: topStockRows.map((item) => toNumber(item.stock_quantity)), color: "#3b82f6" }],
            valueType: "number",
        });
    }

    if (categoryRows.length > 0) {
        dashboard.charts.push({
            id: "product-stock-category",
            type: "pie",
            title: "Category Stock Share",
            subtitle: "Distribution by category",
            pieData: categoryRows.map((item, index) => ({
                id: item.category,
                label: item.category,
                value: item.quantity,
                color: CHART_COLORS[index % CHART_COLORS.length],
            })),
            valueType: "number",
        });
    }

    dashboard.table = { title: "Product Stock", rows };
    return dashboard;
}

function buildProductPerformanceDashboard(payload, options = {}) {
    const { branchNameById = {} } = options;
    const dashboard = baseDashboard();

    // The backend might return:
    // 1. Flattened list: payload.products (old)
    // 2. Nested list: payload.branch[].products (new)
    let rows = [];
    if (payload && Array.isArray(payload.branch)) {
        // New structure: Flatten products from all branches
        payload.branch.forEach(b => {
            if (Array.isArray(b.products)) {
                b.products.forEach(p => {
                    rows.push({
                        ...p,
                        branch_id: b.branch_id,
                        branch_name: branchNameById[String(b.branch_id)] || `Branch ${b.branch_id}`
                    });
                });
            }
        });
    } else {
        // Fallback to old structure or generic row reading
        rows = readRows(payload, "products");
    }

    // Extract Branch-level Summaries for Table and Chart
    const branchSummaries = [];
    if (payload && Array.isArray(payload.branch)) {
        payload.branch.forEach(b => {
            const bSum = b.summary || {};
            branchSummaries.push({
                branch_id: b.branch_id,
                branch_name: branchNameById[String(b.branch_id)] || `Branch ${b.branch_id}`,
                total_quantity_sold: toNumber(bSum.total_quantity_sold),
                total_revenue: toNumber(bSum.total_revenue),
                total_profit: toNumber(bSum.total_profit),
                total_cost: toNumber(bSum.total_cost)
            });
        });
    }

    const summary = payload && payload.summary ? payload.summary : {};
    const totalQuantity = summary.total_quantity_sold ?? sumBy(rows, "total_quantity_sold");
    const totalRevenue = summary.total_revenue ?? sumBy(rows, "total_revenue");
    const totalCost = summary.total_cost ?? sumBy(rows, "total_cost");
    const totalProfit = summary.total_profit ?? sumBy(rows, "total_profit");

    dashboard.cards = [
        { label: "Total Quantity", value: formatInteger(totalQuantity), hint: "Units sold", tone: "slate" },
        { label: "Total Revenue", value: formatCurrency(totalRevenue), hint: "Sales value", tone: "sky" },
        { label: "Total Cost", value: formatCurrency(totalCost), hint: "Product cost", tone: "amber" },
        { label: "Total Profit", value: formatCurrency(totalProfit), hint: "Net outcome", tone: totalProfit >= 0 ? "emerald" : "rose" },
    ];

    // Branch Comparison Chart
    if (branchSummaries.length > 1) {
        dashboard.charts.push({
            id: "branch-performance-revenue",
            type: "bar",
            title: "Revenue by Branch",
            subtitle: "Comparison of total sales across locations",
            labels: branchSummaries.map(b => b.branch_name),
            series: [
                { label: "Revenue", data: branchSummaries.map(b => b.total_revenue), color: "#0ea5e9" },
                { label: "Profit", data: branchSummaries.map(b => b.total_profit), color: "#16a34a" }
            ],
            valueType: "currency",
        });
    }

    const sorted = topRows(rows, "total_revenue", 10);
    if (sorted.length > 0) {
        dashboard.charts.push({
            id: "product-performance-revenue",
            type: "bar",
            title: "Revenue, Cost, and Profit",
            subtitle: "Product-level financial performance (Stacked)",
            labels: sorted.map((item) => item.product_name || `Product ${item.product_id || ""}`),
            series: [
                {
                    label: "Revenue",
                    data: sorted.map((item) => toNumber(item.total_revenue)),
                    color: "#0ea5e9",
                    stack: "financials"
                },
                {
                    label: "Cost",
                    data: sorted.map((item) => toNumber(item.total_cost)),
                    color: "#f59e0b",
                    stack: "financials"
                },
                {
                    label: "Profit",
                    data: sorted.map((item) => toNumber(item.total_profit)),
                    color: "#16a34a",
                    stack: "financials"
                },
            ],
            valueType: "currency",
        });

        dashboard.charts.push({
            id: "product-performance-quantity",
            type: "line",
            title: "Quantity Sold Trend",
            subtitle: "Units sold by product",
            labels: sorted.map((item) => item.product_name || `Product ${item.product_id || ""}`),
            series: [{ label: "Quantity Sold", data: sorted.map((item) => toNumber(item.total_quantity_sold)), color: "#2563eb" }],
            valueType: "number",
        });

        // Add scatter chart showing quantity vs revenue relationship
        dashboard.charts.push({
            id: "product-performance-scatter",
            type: "scatter",
            title: "Quantity vs Revenue Analysis",
            subtitle: "Product performance distribution",
            scatterData: sorted.map((item) => ({
                x: toNumber(item.total_quantity_sold),
                y: toNumber(item.total_revenue),
                id: item.product_id || item.product_name,
                label: item.product_name || `Product ${item.product_id || ""}`,
            })),
            xAxisLabel: "Quantity Sold",
            yAxisLabel: "Revenue",
            valueType: "currency",
        });

        // Add gauge chart showing profit margin
        const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
        dashboard.charts.push({
            id: "product-performance-gauge",
            type: "gauge",
            title: "Overall Profit Margin",
            subtitle: "Percentage of revenue retained as profit",
            gaugeValue: profitMargin,
            gaugeMax: 100,
            gaugeLabel: "Profit Margin %",
        });
    }

    if (branchSummaries.length > 0) {
        dashboard.extraTables.push({
            title: "Branch-wise Performance",
            rows: branchSummaries
        });
    }

    dashboard.table = { title: "Product Performance Rows", rows };
    return dashboard;
}

function buildCategoryPerformanceDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();

    const totalRevenue = sumBy(rows, "total_revenue");
    const totalProfit = sumBy(rows, "total_profit");
    const totalQuantity = sumBy(rows, "total_quantity_sold");

    dashboard.cards = [
        { label: "Categories", value: formatInteger(rows.length), hint: "Category count", tone: "slate" },
        { label: "Total Revenue", value: formatCurrency(totalRevenue), hint: "Across categories", tone: "sky" },
        { label: "Total Profit", value: formatCurrency(totalProfit), hint: "Across categories", tone: totalProfit >= 0 ? "emerald" : "rose" },
        { label: "Units Sold", value: formatInteger(totalQuantity), hint: "Total quantity", tone: "amber" },
    ];

    if (rows.length > 0) {
        dashboard.charts.push({
            id: "category-performance-financials",
            type: "bar",
            title: "Revenue vs Profit by Category",
            subtitle: "Category contribution comparison (Stacked)",
            labels: rows.map((item) => item.category_name || `Category ${item.category_id || ""}`),
            series: [
                {
                    label: "Revenue",
                    data: rows.map((item) => toNumber(item.total_revenue)),
                    color: "#0ea5e9",
                    stack: "financials"
                },
                {
                    label: "Profit",
                    data: rows.map((item) => toNumber(item.total_profit)),
                    color: "#16a34a",
                    stack: "financials"
                },
            ],
            valueType: "currency",
        });

        dashboard.charts.push({
            id: "category-performance-quantity",
            type: "funnel",
            title: "Units Sold and Product Count",
            subtitle: "Category volume ranked by units sold",
            labels: rows.map((item) => item.category_name || `Category ${item.category_id || ""}`),
            series: [
                {
                    label: "Units Sold",
                    data: rows.map((item) => toNumber(item.total_quantity_sold)),
                    color: "#3b82f6",
                },
                {
                    label: "Product Count",
                    data: rows.map((item) => toNumber(item.product_count)),
                    color: "#a855f7",
                },
            ],
            valueType: "number",
        });
    }

    dashboard.table = { title: "Category Performance", rows };
    return dashboard;
}

function buildMonthBreakdownDashboard(payload) {
    const dashboard = baseDashboard();
    const data = payload && typeof payload === "object" ? payload : {};
    const costRows = normalizeRows(data.cost_category_items).map((item) => ({
        category_name: item.category_name || item.cost_category?.name || "Uncategorized",
        cost: toNumber(item.cost),
    }));

    const salary = toNumber(data.salary_expenditure);
    const taxes = toNumber(data.taxes);
    const productsCost = toNumber(data.products_total_cost);
    const netProfit = toNumber(data.net_profit_after_tax);
    const monthValue = data.month || "";
    const yearValue = data.year || "";

    const totalCategoryCost = sumBy(costRows, "cost");
    const totalExpenses = salary + taxes + productsCost + totalCategoryCost;

    dashboard.cards = [
        { label: "Period", value: monthValue && yearValue ? `${getMonthLabel(monthValue)} ${yearValue}` : "-", hint: "Selected month", tone: "slate" },
        { label: "Total Expenses", value: formatCurrency(totalExpenses), hint: "All cost buckets", tone: "amber" },
        { label: "Net Profit", value: formatCurrency(netProfit), hint: "After tax", tone: netProfit >= 0 ? "emerald" : "rose" },
        { label: "Taxes", value: formatCurrency(taxes), hint: "Monthly taxes", tone: "sky" },
    ];

    const pieData = [];
    if (salary > 0) pieData.push({ id: "salary", label: "Salary", value: salary, color: CHART_COLORS[0] });
    if (taxes > 0) pieData.push({ id: "taxes", label: "Taxes", value: taxes, color: CHART_COLORS[1] });
    if (productsCost > 0) pieData.push({ id: "products", label: "Products Cost", value: productsCost, color: CHART_COLORS[2] });
    costRows.forEach((item, index) => {
        if (item.cost > 0) {
            pieData.push({
                id: `cost-${item.category_name}-${index}`,
                label: item.category_name,
                value: item.cost,
                color: CHART_COLORS[(index + 3) % CHART_COLORS.length],
            });
        }
    });

    if (pieData.length > 0) {
        dashboard.charts.push({
            id: "month-breakdown-pie",
            type: "pie",
            title: "Expense Distribution",
            subtitle: "Category-wise share of monthly costs",
            pieData,
            valueType: "currency",
        });
    }

    const topCostCategories = topRows(costRows, "cost", 10);
    if (topCostCategories.length > 0) {
        dashboard.charts.push({
            id: "month-breakdown-top-cost",
            type: "bar",
            title: "Top Cost Categories",
            subtitle: "Highest monthly cost contributors",
            labels: topCostCategories.map((item) => item.category_name),
            series: [{ label: "Cost", data: topCostCategories.map((item) => toNumber(item.cost)), color: "#0ea5e9" }],
            valueType: "currency",
        });

        // Add radar chart showing expense breakdown comparison
        const baseMetrics = ["Salary", "Taxes", "Products"];
        // Ensure no duplication and only pick top 3 additional categories
        const extraCategories = topCostCategories
            .filter(item => !baseMetrics.some(bm => bm.toLowerCase() === item.category_name.toLowerCase()))
            .slice(0, 3);

        const radarMetrics = [...baseMetrics, ...extraCategories.map(item => item.category_name)];
        const radarData = [
            salary,
            taxes,
            productsCost,
            ...extraCategories.map(item => toNumber(item.cost))
        ];

        dashboard.charts.push({
            id: "month-breakdown-radar",
            type: "radar",
            title: "Expense Category Comparison",
            subtitle: "Multi-dimensional view of monthly costs",
            radarMetrics,
            radarData: [{
                label: "Monthly Expenses",
                data: radarData,
            }],
            valueType: "currency",
        });

        // Add 3D bar chart for top cost categories
        dashboard.charts.push({
            id: "month-breakdown-3d",
            type: "bar3d",
            title: "Top Cost Categories - 3D View",
            subtitle: "Monthly expenses with visual depth",
            labels: topCostCategories.map((item) => item.category_name),
            series: [
                {
                    label: "Cost",
                    data: topCostCategories.map((item) => toNumber(item.cost)),
                    color: "#0ea5e9",
                },
            ],
            valueType: "currency",
        });
    }

    dashboard.summaryEntries = [
        ["salary_expenditure", salary],
        ["products_total_cost", productsCost],
        ["taxes", taxes],
        ["net_profit_after_tax", netProfit],
    ];
    dashboard.table = { title: "Cost Category Items", rows: costRows };
    return dashboard;
}

function buildNetProfitDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();

    const normalized = rows.map((item, index) => ({
        ...item,
        period: buildPeriodLabel(item, index),
        net_profit_after_tax: toNumber(item.net_profit_after_tax ?? item.net_profit ?? item.value),
    }));

    const totalNet = sumBy(normalized, "net_profit_after_tax");
    const avgNet = normalized.length ? totalNet / normalized.length : 0;
    const best = [...normalized].sort((a, b) => toNumber(b.net_profit_after_tax) - toNumber(a.net_profit_after_tax))[0];

    dashboard.cards = [
        { label: "Periods", value: formatInteger(normalized.length), hint: "Returned rows", tone: "slate" },
        { label: "Total Net Profit", value: formatCurrency(totalNet), hint: "After tax", tone: totalNet >= 0 ? "emerald" : "rose" },
        { label: "Average / Period", value: formatCurrency(avgNet), hint: "Period average", tone: "sky" },
        { label: "Best Period", value: best ? best.period : "-", hint: best ? formatCurrency(best.net_profit_after_tax) : "No data", tone: "amber" },
    ];

    if (normalized.length > 0) {
        dashboard.charts.push({
            id: "net-profit-trend",
            type: "line",
            title: "Net Profit Trend",
            subtitle: "Net profit after tax by period",
            labels: normalized.map((item) => item.period),
            series: [{ label: "Net Profit", data: normalized.map((item) => toNumber(item.net_profit_after_tax)), color: "#0f766e" }],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Net Profit Rows", rows: normalized };
    return dashboard;
}

function buildFinancialTrendDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();
    const normalized = rows.map((item, index) => ({
        ...item,
        period: buildPeriodLabel(item, index),
    }));

    const totalRevenue = sumBy(normalized, "revenue");
    const totalCost = sumBy(normalized, "total_cost");
    const totalNet = sumBy(normalized, "net_profit_after_tax");

    dashboard.cards = [
        { label: "Periods", value: formatInteger(normalized.length), hint: "Trend points", tone: "slate" },
        { label: "Total Revenue", value: formatCurrency(totalRevenue), hint: "Selected range", tone: "sky" },
        { label: "Total Cost", value: formatCurrency(totalCost), hint: "Selected range", tone: "amber" },
        { label: "Total Net Profit", value: formatCurrency(totalNet), hint: "After tax", tone: totalNet >= 0 ? "emerald" : "rose" },
    ];

    if (normalized.length > 0) {
        dashboard.charts.push({
            id: "financial-trend-line",
            type: "line",
            title: "Financial Trend",
            subtitle: "Revenue, cost, and net profit over time",
            labels: normalized.map((item) => item.period),
            series: [
                { label: "Revenue", data: normalized.map((item) => toNumber(item.revenue)), color: "#0ea5e9" },
                { label: "Total Cost", data: normalized.map((item) => toNumber(item.total_cost)), color: "#f59e0b" },
                { label: "Net Profit", data: normalized.map((item) => toNumber(item.net_profit_after_tax)), color: "#16a34a" },
            ],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Financial Trend Rows", rows: normalized };
    return dashboard;
}

function buildTaxAnalyticsDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();
    const normalized = rows.map((item, index) => ({
        ...item,
        period: buildPeriodLabel(item, index),
    }));

    const inputTotal = sumBy(normalized, "input_gst");
    const outputTotal = sumBy(normalized, "output_gst");
    const payableTotal = sumBy(normalized, "gst_payable");
    const taxesTotal = sumBy(normalized, "taxes");

    dashboard.cards = [
        { label: "Input GST", value: formatCurrency(inputTotal), hint: "Total input tax", tone: "sky" },
        { label: "Output GST", value: formatCurrency(outputTotal), hint: "Total output tax", tone: "amber" },
        { label: "GST Payable", value: formatCurrency(payableTotal), hint: "Net payable", tone: "rose" },
        { label: "Taxes", value: formatCurrency(taxesTotal), hint: "Total tax amount", tone: "slate" },
    ];

    if (normalized.length > 0) {
        dashboard.charts.push({
            id: "tax-analytics-bars",
            type: "bar",
            title: "GST Comparison",
            subtitle: "Input vs output GST and payable amount",
            labels: normalized.map((item) => item.period),
            series: [
                { label: "Input GST", data: normalized.map((item) => toNumber(item.input_gst)), color: "#0ea5e9" },
                { label: "Output GST", data: normalized.map((item) => toNumber(item.output_gst)), color: "#f59e0b" },
                { label: "GST Payable", data: normalized.map((item) => toNumber(item.gst_payable)), color: "#e11d48" },
            ],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Tax Analytics Rows", rows: normalized };
    return dashboard;
}

function buildProfitMarginsDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();
    const normalized = rows.map((item, index) => ({
        ...item,
        period: buildPeriodLabel(item, index),
        net_profit_margin: toNumber(item.net_profit_margin),
        gross_profit_margin: toNumber(item.gross_profit_margin),
    }));

    const avgNetMargin = normalized.length ? sumBy(normalized, "net_profit_margin") / normalized.length : 0;
    const avgGrossMargin = normalized.length ? sumBy(normalized, "gross_profit_margin") / normalized.length : 0;
    const totalRevenue = sumBy(normalized, "revenue");
    const totalNet = sumBy(normalized, "net_profit_after_tax");

    dashboard.cards = [
        { label: "Average Net Margin", value: formatPercent(avgNetMargin / 100), hint: "Across periods", tone: "emerald" },
        { label: "Average Gross Margin", value: formatPercent(avgGrossMargin / 100), hint: "Across periods", tone: "sky" },
        { label: "Total Revenue", value: formatCurrency(totalRevenue), hint: "Selected range", tone: "slate" },
        { label: "Total Net Profit", value: formatCurrency(totalNet), hint: "Selected range", tone: totalNet >= 0 ? "emerald" : "rose" },
    ];

    if (normalized.length > 0) {
        dashboard.charts.push({
            id: "profit-margins-line",
            type: "line",
            title: "Margin Trend",
            subtitle: "Net and gross profit margin by period",
            labels: normalized.map((item) => item.period),
            series: [
                { label: "Net Margin (%)", data: normalized.map((item) => toNumber(item.net_profit_margin)), color: "#0f766e" },
                { label: "Gross Margin (%)", data: normalized.map((item) => toNumber(item.gross_profit_margin)), color: "#7c3aed" },
            ],
            valueType: "percent",
        });
    }

    dashboard.table = { title: "Profit Margin Rows", rows: normalized };
    return dashboard;
}

function buildCustomerRevenueDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();

    const totalRevenue = sumBy(rows, "total_revenue");
    const avgOrderValue = rows.length ? sumBy(rows, "avg_order_value") / rows.length : 0;
    const top = [...rows].sort((a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue))[0];

    dashboard.cards = [
        { label: "Customers", value: formatInteger(rows.length), hint: "Leaderboard size", tone: "slate" },
        { label: "Revenue Tracked", value: formatCurrency(totalRevenue), hint: "All listed customers", tone: "sky" },
        { label: "Avg Order Value", value: formatCurrency(avgOrderValue), hint: "Across leaderboard", tone: "amber" },
        { label: "Top Customer", value: top ? top.customer_name || "Customer" : "-", hint: top ? formatCurrency(top.total_revenue) : "No data", tone: "emerald" },
    ];

    const topRowsByRevenue = topRows(rows, "total_revenue", 10);
    if (topRowsByRevenue.length > 0) {
        dashboard.charts.push({
            id: "customer-revenue-bar",
            type: "bar",
            title: "Top Customer Revenue",
            subtitle: "Revenue by customer",
            labels: topRowsByRevenue.map((item) => item.customer_name || item.customer_mobile_number || `Customer ${item.customer_id || ""}`),
            series: [{ label: "Revenue", data: topRowsByRevenue.map((item) => toNumber(item.total_revenue)), color: "#0ea5e9" }],
            valueType: "currency",
        });

        dashboard.charts.push({
            id: "customer-revenue-orders",
            type: "line",
            title: "Average Order Value",
            subtitle: "Order value by customer",
            labels: topRowsByRevenue.map((item) => item.customer_name || item.customer_mobile_number || `Customer ${item.customer_id || ""}`),
            series: [{ label: "Avg Order Value", data: topRowsByRevenue.map((item) => toNumber(item.avg_order_value)), color: "#16a34a" }],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Customer Revenue Leaderboard", rows };
    return dashboard;
}

function buildCustomerRetentionDashboard(payload) {
    const dashboard = baseDashboard();
    const data = payload && typeof payload === "object" ? payload : {};

    const totalCustomers = toNumber(data.total_customers);
    const newCustomers = toNumber(data.new_customers);
    const returningCustomers = toNumber(data.returning_customers);
    const retentionRate = toNumber(data.retention_rate);
    const churnRate = toNumber(data.churn_rate);

    dashboard.cards = [
        { label: "Total Customers", value: formatInteger(totalCustomers), hint: "In selected range", tone: "slate" },
        { label: "Returning Customers", value: formatInteger(returningCustomers), hint: "Repeat buyers", tone: "emerald" },
        { label: "Retention Rate", value: formatPercent(retentionRate / 100), hint: "Returning share", tone: "sky" },
        { label: "Churn Rate", value: formatPercent(churnRate / 100), hint: "Drop-off share", tone: "rose" },
    ];

    const pieData = [];
    if (returningCustomers > 0) pieData.push({ id: "returning", label: "Returning", value: returningCustomers, color: "#0f766e" });
    if (newCustomers > 0) pieData.push({ id: "new", label: "New", value: newCustomers, color: "#0ea5e9" });

    if (pieData.length > 0) {
        dashboard.charts.push({
            id: "customer-retention-pie",
            type: "pie",
            title: "Customer Mix",
            subtitle: "Returning vs new customers",
            pieData,
            valueType: "number",
        });
    } else if (retentionRate || churnRate) {
        dashboard.charts.push({
            id: "customer-retention-rate",
            type: "pie",
            title: "Retention vs Churn Rate",
            subtitle: "Percentage distribution",
            pieData: [
                { id: "retention", label: "Retention", value: retentionRate, color: "#0f766e" },
                { id: "churn", label: "Churn", value: churnRate, color: "#e11d48" },
            ],
            valueType: "percent",
        });
    }

    dashboard.summaryEntries = Object.entries(data);
    dashboard.table = {
        title: "Retention Metrics",
        rows: [
            {
                total_customers: totalCustomers,
                new_customers: newCustomers,
                returning_customers: returningCustomers,
                retention_rate: retentionRate,
                churn_rate: churnRate,
            },
        ],
    };
    return dashboard;
}

function buildCustomerPreferencesDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();

    const totalQuantity = sumBy(rows, "quantity");
    const totalRevenue = sumBy(rows, "total_revenue");
    const uniqueCustomers = new Set(rows.map((item) => item.customer_id)).size;
    const top = [...rows].sort((a, b) => toNumber(b.quantity) - toNumber(a.quantity))[0];

    dashboard.cards = [
        { label: "Preference Rows", value: formatInteger(rows.length), hint: "Returned records", tone: "slate" },
        { label: "Total Quantity", value: formatInteger(totalQuantity), hint: "Preferred units", tone: "sky" },
        { label: "Total Revenue", value: formatCurrency(totalRevenue), hint: "From preferences", tone: "amber" },
        { label: "Top Product", value: top ? top.product_name || "-" : "-", hint: top ? `${formatInteger(top.quantity)} units` : "No data", tone: "emerald" },
    ];

    const topByQuantity = topRows(rows, "quantity", 10);
    if (topByQuantity.length > 0) {
        dashboard.charts.push({
            id: "customer-preferences-quantity",
            type: "bar",
            title: "Most Preferred Products",
            subtitle: `Across ${formatInteger(uniqueCustomers)} customers`,
            labels: topByQuantity.map((item) => item.product_name || `Product ${item.product_id || ""}`),
            series: [{ label: "Quantity", data: topByQuantity.map((item) => toNumber(item.quantity)), color: "#0ea5e9" }],
            valueType: "number",
        });

        dashboard.charts.push({
            id: "customer-preferences-revenue",
            type: "bar",
            title: "Revenue by Preferred Products",
            subtitle: "Product contribution by revenue",
            labels: topByQuantity.map((item) => item.product_name || `Product ${item.product_id || ""}`),
            series: [{ label: "Revenue", data: topByQuantity.map((item) => toNumber(item.total_revenue)), color: "#16a34a" }],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Customer Product Preferences", rows };
    return dashboard;
}

function buildCustomerProductListDashboard(payload) {
    const customerRows = readRows(payload);
    const dashboard = baseDashboard();

    const flattened = customerRows.flatMap((customer) => {
        const products = normalizeRows(customer.products);
        return products.map((product) => ({
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            mobile_number: customer.mobile_number,
            product_id: product.product_id,
            product_name: product.product_name,
            quantity: toNumber(product.quantity),
            total_revenue: toNumber(product.total_revenue),
        }));
    });

    const totalQuantity = sumBy(flattened, "quantity");
    const totalRevenue = sumBy(flattened, "total_revenue");
    const uniqueProducts = new Set(flattened.map((row) => row.product_id)).size;
    const uniqueCustomers = new Set(flattened.map((row) => row.customer_id)).size;

    const productAgg = flattened.reduce((acc, row) => {
        const key = row.product_name || `Product ${row.product_id || ""}`;
        if (!acc[key]) {
            acc[key] = { product_name: key, quantity: 0, total_revenue: 0 };
        }
        acc[key].quantity += toNumber(row.quantity);
        acc[key].total_revenue += toNumber(row.total_revenue);
        return acc;
    }, {});

    const aggregatedProducts = Object.values(productAgg);
    const topProducts = topRows(aggregatedProducts, "total_revenue", 10);

    dashboard.cards = [
        { label: "Customers", value: formatInteger(uniqueCustomers), hint: "With purchases", tone: "slate" },
        { label: "Products", value: formatInteger(uniqueProducts), hint: "Unique purchased products", tone: "sky" },
        { label: "Total Quantity", value: formatInteger(totalQuantity), hint: "Across all lines", tone: "amber" },
        { label: "Total Revenue", value: formatCurrency(totalRevenue), hint: "Across all lines", tone: "emerald" },
    ];

    if (topProducts.length > 0) {
        dashboard.charts.push({
            id: "customer-product-list-revenue",
            type: "bar",
            title: "Top Products by Revenue",
            subtitle: "Aggregated from customer product list",
            labels: topProducts.map((item) => item.product_name),
            series: [{ label: "Revenue", data: topProducts.map((item) => toNumber(item.total_revenue)), color: "#0ea5e9" }],
            valueType: "currency",
        });

        dashboard.charts.push({
            id: "customer-product-list-quantity",
            type: "bar",
            title: "Top Products by Quantity",
            subtitle: "Aggregated units sold",
            labels: topProducts.map((item) => item.product_name),
            series: [{ label: "Quantity", data: topProducts.map((item) => toNumber(item.quantity)), color: "#16a34a" }],
            valueType: "number",
        });
    }

    dashboard.table = { title: "Customer Product Lines", rows: flattened };
    dashboard.extraTables = [{ title: "Aggregated Product Totals", rows: aggregatedProducts }];
    return dashboard;
}

function buildGstComplianceSummaryDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();
    
    // Sort by date to show trend correctly
    const sorted = [...rows].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    const latest = sorted[sorted.length - 1] || {};
    
    dashboard.cards = [
        { label: "Total Sales", value: formatCurrency(latest.total_sales), hint: "Latest period", tone: "slate" },
        { label: "Total Purchases", value: formatCurrency(latest.total_purchases), hint: "Latest period", tone: "sky" },
        { label: "Total Tax Collected", value: formatCurrency(latest.total_tax_collected), hint: "Output GST", tone: "amber" },
        { label: "Net GST Payable", value: formatCurrency(latest.net_gst_payable), hint: "After deductions", tone: latest.net_gst_payable >= 0 ? "rose" : "emerald" },
    ];

    if (sorted.length > 0) {
        dashboard.charts.push({
            id: "gst-compliance-bars",
            type: "bar",
            title: "Sales vs Purchases",
            subtitle: "Monthly tax-base comparison",
            labels: sorted.map(r => `${getMonthLabel(r.month)} ${r.year}`),
            series: [
                { label: "Sales", data: sorted.map(r => toNumber(r.total_sales)), color: "#0ea5e9" },
                { label: "Purchases", data: sorted.map(r => toNumber(r.total_purchases)), color: "#f59e0b" }
            ],
            valueType: "currency"
        });

        const collectionRatio = latest.total_sales > 0 ? (toNumber(latest.total_tax_collected) / toNumber(latest.total_sales)) * 100 : 0;
        dashboard.charts.push({
            id: "gst-efficiency-gauge",
            type: "gauge",
            title: "Tax Collection Intensity",
            subtitle: "Percentage of revenue captured as tax",
            gaugeValue: Math.round(collectionRatio),
            gaugeMax: 30, // GST usually maxes at 28%
            gaugeLabel: "Collection %"
        });
    }

    dashboard.table = { title: "Monthly Compliance Records", rows: sorted };
    return dashboard;
}

function buildCustomerSpendDashboard(payload) {
    const rows = readRows(payload);
    const dashboard = baseDashboard();

    const totalRevenue = sumBy(rows, "total_revenue");
    const top = [...rows].sort((a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue))[0];

    dashboard.cards = [
        { label: "Customers", value: formatInteger(rows.length), hint: "Spend records", tone: "slate" },
        { label: "Total Spend", value: formatCurrency(totalRevenue), hint: "Selected month/year", tone: "sky" },
        { label: "Average Spend", value: formatCurrency(rows.length ? totalRevenue / rows.length : 0), hint: "Per customer", tone: "amber" },
        { label: "Top Spender", value: top ? top.customer_name || "-" : "-", hint: top ? formatCurrency(top.total_revenue) : "No data", tone: "emerald" },
    ];

    const topSpenders = topRows(rows, "total_revenue", 12);
    if (topSpenders.length > 0) {
        dashboard.charts.push({
            id: "customer-spend-chart",
            type: "bar",
            title: "Customer Spend",
            subtitle: "Spend by customer",
            labels: topSpenders.map((item) => item.customer_name || item.mobile_number || `Customer ${item.customer_id || ""}`),
            series: [{ label: "Total Revenue", data: topSpenders.map((item) => toNumber(item.total_revenue)), color: "#0f766e" }],
            valueType: "currency",
        });
    }

    dashboard.table = { title: "Customer Spend Rows", rows };
    return dashboard;
}

function buildGenericDashboard(payload) {
    const dashboard = baseDashboard();
    if (payload === null || payload === undefined) return dashboard;

    if (Array.isArray(payload)) {
        dashboard.table = { title: "Rows", rows: normalizeRows(payload) };
        return dashboard;
    }

    if (typeof payload === "object") {
        const entries = Object.entries(payload);
        const primitiveEntries = entries.filter(
            ([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value)
        );
        const arrayEntries = entries.filter(([, value]) => Array.isArray(value));
        const objectEntries = entries.filter(
            ([key, value]) => key !== "summary" && value && typeof value === "object" && !Array.isArray(value)
        );

        const summary = payload.summary && typeof payload.summary === "object" ? payload.summary : null;
        if (summary) dashboard.summaryEntries = Object.entries(summary);
        if (primitiveEntries.length > 0) dashboard.summaryEntries = [...dashboard.summaryEntries, ...primitiveEntries];

        if (Array.isArray(payload.results)) {
            dashboard.table = { title: "Results", rows: normalizeRows(payload.results) };
        } else if (arrayEntries.length > 0) {
            const [firstKey, firstRows] = arrayEntries[0];
            dashboard.table = { title: toTitleCase(firstKey), rows: normalizeRows(firstRows) };
            dashboard.extraTables = arrayEntries.slice(1).map(([key, rows]) => ({
                title: toTitleCase(key),
                rows: normalizeRows(rows),
            }));
        }

        dashboard.detailObjects = objectEntries.map(([key, value]) => ({
            title: toTitleCase(key),
            data: value,
        }));
    }

    return dashboard;
}

function buildDashboardData(endpointId, payload, options = {}) {
    switch (endpointId) {
        case "product-details":
            return buildProductDetailsDashboard(payload);
        case "product-stock":
            return buildProductStockDashboard(payload, options);
        case "product-performance":
            return buildProductPerformanceDashboard(payload, options);
        case "category-performance":
            return buildCategoryPerformanceDashboard(payload);
        case "month-breakdown":
            return buildMonthBreakdownDashboard(payload);
        case "net-profit":
            return buildNetProfitDashboard(payload);
        case "financial-trend":
            return buildFinancialTrendDashboard(payload);
        case "tax-analytics":
            return buildTaxAnalyticsDashboard(payload);
        case "profit-margins":
            return buildProfitMarginsDashboard(payload);
        case "customer-revenue":
            return buildCustomerRevenueDashboard(payload);
        case "customer-retention":
            return buildCustomerRetentionDashboard(payload);
        case "customer-product-preferences":
            return buildCustomerPreferencesDashboard(payload);
        case "customer-product-list":
            return buildCustomerProductListDashboard(payload);
        case "customer-spend":
            return buildCustomerSpendDashboard(payload);
        case "gst-compliance-summary":
            return buildGstComplianceSummaryDashboard(payload);
        default:
            return buildGenericDashboard(payload);
    }
}

export default function AnalyticsEndpointView({ defaultApiId = "month-breakdown" }) {
    const navigate = useNavigate();
    const { apiId: routeApiId } = useParams();
    const [searchParams] = useSearchParams();

    const endpointId = useMemo(
        () => getResolvedEndpointId(routeApiId, searchParams, defaultApiId),
        [routeApiId, searchParams, defaultApiId]
    );
    const endpoint = useMemo(() => getAnalyticsEndpoint(endpointId), [endpointId]);

    const [filters, setFilters] = useState(() => getDefaultFiltersForEndpoint(endpointId));
    const [appliedFilters, setAppliedFilters] = useState(() => getDefaultFiltersForEndpoint(endpointId));
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [emptyMessage, setEmptyMessage] = useState("");

    const { profile } = useSelector((state) => state.user);

    // Branch state
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [fetchingBranches, setFetchingBranches] = useState(false);

    // Determines if the current user can switch branches (Owner)
    const roleStr = typeof profile?.role === 'object' ? profile.role.role : profile?.role;
    const isOwner = roleStr === "OWNER";

    // Initialize/Fetch Branches
    useEffect(() => {
        if (isOwner) {
            fetchBranches();
        } else {
            // For managers/employees, enforce their assigned branch
            const branchId = typeof profile?.branch === 'object' ? profile.branch.id : profile?.branch;
            setSelectedBranch(String(branchId || ""));
        }
    }, [profile]);

    const fetchBranches = async () => {
        try {
            setFetchingBranches(true);
            const res = await branchService.list();
            const branchList = res.data?.results || res.data || [];
            setBranches(branchList);
        } catch (err) {
            console.error("Failed to fetch branches", err);
        } finally {
            setFetchingBranches(false);
        }
    };

    const endpointIndex = useMemo(
        () => ANALYTICS_ENDPOINTS.findIndex((item) => item.id === endpointId),
        [endpointId]
    );

    const previousEndpoint = endpointIndex > 0 ? ANALYTICS_ENDPOINTS[endpointIndex - 1] : null;
    const nextEndpoint =
        endpointIndex >= 0 && endpointIndex < ANALYTICS_ENDPOINTS.length - 1
            ? ANALYTICS_ENDPOINTS[endpointIndex + 1]
            : null;

    const fetchEndpointData = async (currentEndpoint, currentFilters) => {
        try {
            setLoading(true);
            setError("");
            setEmptyMessage("");

            setEmptyMessage("");

            const query = serializeFilters(currentEndpoint, currentFilters);
            let url = query ? `${currentEndpoint.endpoint}?${query}` : currentEndpoint.endpoint;

            // Append branch filter if valid AND not the "product-details" endpoint
            if (selectedBranch && currentEndpoint.id !== "product-details") {
                const separator = url.includes("?") ? "&" : "?";
                url = `${url}${separator}branch=${selectedBranch}`;
            }

            const response = await api.get(url);
            setResult(response?.data ?? null);
        } catch (err) {
            console.error("Analytics module request failed", err);
            if (isNoDataError(err)) {
                setResult(null);
                setError("");
                setEmptyMessage("No data found for selected filters. Try changing month/date or removing filters.");
            } else {
                const detail = getErrorDetail(err) || "Failed to load analytics data. Please retry.";
                setError(detail);
                setEmptyMessage("");
                setResult(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!endpoint) {
            setLoading(false);
            setError("Analytics module not found.");
            return;
        }

        const defaults = getDefaultFiltersForEndpoint(endpoint.id);
        setFilters(defaults);
        setAppliedFilters(defaults);
        fetchEndpointData(endpoint, defaults);
    }, [endpoint]);

    const onFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: normalizeFutureFilterValue(key, value),
        }));
    };

    const handleApply = async () => {
        if (!endpoint) return;
        const validationMessage = validateFilters(filters);
        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        setAppliedFilters(filters);
        await fetchEndpointData(endpoint, filters);
    };

    const handleReset = async () => {
        if (!endpoint) return;

        const clean = endpoint.filters.reduce((acc, field) => {
            acc[field.key] = "";
            return acc;
        }, {});

        setFilters(clean);
        setAppliedFilters(clean);
        await fetchEndpointData(endpoint, clean);
    };

    const activeFilters = useMemo(() => {
        if (!endpoint) return [];

        return endpoint.filters
            .map((field) => ({
                label: field.label,
                value: appliedFilters[field.key],
                key: field.key,
            }))
            .filter((item) => item.value !== "" && item.value !== null && item.value !== undefined);
    }, [endpoint, appliedFilters]);

    if (!endpoint) {
        return (
            <div className="min-h-screen bg-transparent">
                <ProtectedHeader />
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                        <p className="font-semibold">Analytics module not found.</p>
                        <button
                            type="button"
                            onClick={() => navigate("/analytics")}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-300 bg-white text-sm font-semibold"
                        >
                            <FaArrowLeft /> Back to Analytics Index
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent">
            <ProtectedHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/analytics")}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <FaArrowLeft /> Back
                        </button>

                        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                disabled={!previousEndpoint}
                                onClick={() => previousEndpoint && navigate(`/analytics/view/${previousEndpoint.id}`)}
                                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 text-slate-500 hover:text-slate-900 hover:bg-white transition-all"
                            >
                                Previous Module
                            </button>
                            <button
                                type="button"
                                disabled={!nextEndpoint}
                                onClick={() => nextEndpoint && navigate(`/analytics/view/${nextEndpoint.id}`)}
                                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 text-slate-500 hover:text-slate-900 hover:bg-white transition-all"
                            >
                                Next Module
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">
                            {endpoint.group} Analytics
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{endpoint.title}</h1>
                        <p className="text-sm text-slate-500 font-medium max-w-3xl leading-relaxed">{endpoint.description}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 text-sm text-slate-600">
                        <FaLayerGroup className="text-slate-400" />
                        <span>Single-module analysis mode is active. This view calls one API at a time.</span>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-slate-800">
                            <FaFilter />
                            <h2 className="text-lg font-semibold">Filters</h2>
                        </div>

                        {/* Branch Selector for Owners */}
                        {isOwner && endpoint.id !== "product-details" && (
                            <div className="relative min-w-[200px]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaCodeBranch className="text-slate-400" />
                                </div>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
                                    disabled={fetchingBranches}
                                >
                                    <option value="">General (All Branches)</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.branch_name || b.name} {b.is_default ? "(Main)" : ""}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <FaChevronDown className="text-slate-400 text-xs" />
                                </div>
                            </div>
                        )}
                    </div>

                    {endpoint.filters.length === 0 ? (
                        <p className="text-sm text-slate-500">This module does not require filters.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {endpoint.filters.map((field) => (
                                <FilterInput
                                    key={field.key}
                                    field={field}
                                    value={filters[field.key] ?? ""}
                                    allFilters={filters}
                                    onChange={onFilterChange}
                                />
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleApply}
                            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm active:scale-95 transition-all"
                        >
                            <FaPlay size={10} /> Apply Filters
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                        >
                            <FaRedoAlt size={10} /> Reset Parameters
                        </button>
                    </div>

                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.map((item) => (
                                <span
                                    key={item.key}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
                                >
                                    {item.label}: {formatFilterBadgeValue(item.key, item.value)}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <FaChartLine className="text-slate-500" />
                        <h2 className="text-lg font-semibold text-slate-900">Analysis Dashboard</h2>
                    </div>

                    {loading ? (
                        <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
                            <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold uppercase tracking-widest">Compiling Analytics...</p>
                        </div>
                    ) : emptyMessage ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                            <p className="text-base font-semibold text-slate-800">No Data Found</p>
                            <p className="text-sm text-slate-500 mt-2">{emptyMessage}</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 text-rose-700">
                            <FaExclamationTriangle className="mt-0.5" />
                            <div>
                                <p className="font-semibold">Request failed</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <AnalyticsDashboard endpoint={endpoint} data={result} selectedBranch={selectedBranch} branches={branches} />
                    )}
                </section>
            </main>
        </div>
    );
}

function FilterInput({ field, value, allFilters, onChange }) {
    const pickerRef = useRef(null);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const todayDateValue = toLocalDateValue(new Date());
    const nowDateTimeValue = toLocalDateTimeValue(new Date());

    const options = getFilterFieldOptions(field);

    const inputClasses =
        "w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500 focus:bg-white";

    if (field.type === "month" || field.type === "year") {
        const linkedYearField =
            field.key === "month"
                ? "year"
                : field.key === "start_month"
                    ? "start_year"
                    : field.key === "end_month"
                        ? "end_year"
                        : null;

        const selectedYear = linkedYearField ? Number(allFilters[linkedYearField]) : null;
        const effectiveYear = selectedYear || currentYear;

        return (
            <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</span>
                <select
                    value={value}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    className={inputClasses}
                >
                    <option value="">Select {field.label}</option>
                    {options.map((item) => {
                        const isFutureMonth =
                            field.type === "month" &&
                            effectiveYear === currentYear &&
                            Number(item.value) > currentMonth;

                        return (
                            <option key={item.value} value={item.value} disabled={isFutureMonth}>
                                {item.label}
                            </option>
                        );
                    })}
                </select>
            </label>
        );
    }

    if (field.type === "date" || field.type === "datetime-local") {
        const isDateField = field.type === "date";
        const isFromField = field.key.startsWith("from_");
        const isToField = field.key.startsWith("to_");
        const linkedToKey = field.key.replace(/^from_/, "to_");
        const linkedFromKey = field.key.replace(/^to_/, "from_");

        let min = "";
        let max = isDateField ? todayDateValue : nowDateTimeValue;

        if (isToField) {
            min = allFilters[linkedFromKey] || "";
        }

        if (isFromField) {
            const linkedToValue = allFilters[linkedToKey] || "";
            if (linkedToValue) {
                max = minTemporalValue(max, linkedToValue);
            }
        }

        return (
            <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</span>
                <div className="group relative rounded-xl border border-slate-200 bg-slate-50 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15 focus-within:bg-white transition-all">
                    <input
                        ref={pickerRef}
                        type={field.type}
                        value={value}
                        max={max || undefined}
                        min={min || undefined}
                        onChange={(event) => onChange(field.key, event.target.value)}
                        className="analytics-calendar-input w-full bg-transparent border-0 rounded-xl px-3 py-2 pr-12 text-sm text-slate-800 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (pickerRef.current?.showPicker) {
                                pickerRef.current.showPicker();
                            } else {
                                pickerRef.current?.focus();
                            }
                        }}
                        className="absolute inset-y-1.5 right-1.5 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm hover:bg-slate-900 hover:border-slate-900 hover:text-white group-focus-within:bg-slate-900 group-focus-within:border-slate-900 group-focus-within:text-white transition-colors"
                        aria-label={`Open ${field.label}`}
                    >
                        <FaCalendarAlt className="h-3.5 w-3.5" />
                    </button>
                </div>
            </label>
        );
    }

    if (field.type === "product-lookup") {
        return (
            <ProductLookupField
                field={field}
                value={value}
                allFilters={allFilters}
                onChange={onChange}
            />
        );
    }

    if (field.type === "category-lookup") {
        return <CategoryLookupField field={field} value={value} onChange={onChange} />;
    }

    return (
        <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</span>
            <input
                type={field.type}
                value={value}
                placeholder={field.placeholder || ""}
                onChange={(event) => onChange(field.key, event.target.value)}
                className={inputClasses}
            />
        </label>
    );
}

function extractList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
}

async function searchProductsByNameSku(query, categoryId) {
    const categoryParam = categoryId ? `&product_category=${encodeURIComponent(categoryId)}` : "";
    const requests = [
        api.get(`/product/?name=${encodeURIComponent(query)}${categoryParam}`),
        api.get(`/product/?sku=${encodeURIComponent(query)}${categoryParam}`),
    ];

    const settled = await Promise.allSettled(requests);
    const productMap = new Map();

    settled.forEach((item) => {
        if (item.status !== "fulfilled") return;
        const rows = extractList(item.value?.data);
        rows.forEach((row) => {
            if (!row || row.id === undefined || row.id === null) return;
            if (!productMap.has(row.id)) {
                productMap.set(row.id, row);
            }
        });
    });

    return Array.from(productMap.values()).slice(0, 20);
}

function ProductLookupField({ field, value, allFilters, onChange }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const categoryId = allFilters.category_id || "";

    useEffect(() => {
        let isMounted = true;

        const loadSelected = async () => {
            if (!value) {
                if (isMounted) setSelectedProduct(null);
                return;
            }

            try {
                const response = await api.get(`/product/${value}/`);
                if (isMounted) setSelectedProduct(response?.data || null);
            } catch {
                if (isMounted) {
                    setSelectedProduct({ id: value, name: `Product #${value}`, sku: "" });
                }
            }
        };

        loadSelected();
        return () => {
            isMounted = false;
        };
    }, [value]);

    useEffect(() => {
        let isMounted = true;

        if (!query.trim()) {
            setResults([]);
            return () => {
                isMounted = false;
            };
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const rows = await searchProductsByNameSku(query.trim(), categoryId);
                if (isMounted) {
                    setResults(rows);
                    setIsOpen(true);
                }
            } catch {
                if (isMounted) setResults([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        }, 320);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [query, categoryId]);

    const clearSelection = () => {
        setSelectedProduct(null);
        setQuery("");
        setResults([]);
        setIsOpen(false);
        onChange(field.key, "");
    };

    return (
        <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{field.label}</span>
            <div className="space-y-2">
                <div className="relative">
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-brand-500/25 focus-within:border-brand-500 focus-within:shadow-md transition-all">
                        <FaSearch className="text-slate-400 flex-shrink-0" size={14} />
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={() => setIsOpen(true)}
                            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                            placeholder={selectedProduct ? "Search to change product..." : "Type product name or SKU..."}
                            className="w-full outline-none border-0 text-sm text-slate-800 placeholder-slate-400 bg-transparent font-medium"
                        />
                        {loading && (
                            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                        )}
                    </div>

                    {isOpen && results.length > 0 && (
                        <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                            {results.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setQuery("");
                                        setIsOpen(false);
                                        onChange(field.key, String(product.id));
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-brand-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                                >
                                    <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">{product.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        SKU: <span className="font-medium">{product.sku || "N/A"}</span>
                                        {product.product_category && (
                                            <span className="ml-2">• <span className="font-medium">{typeof product.product_category === 'object' ? product.product_category.name : product.product_category}</span></span>
                                        )}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-brand-200 bg-brand-50/50 px-4 py-2.5 shadow-sm">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{selectedProduct.name}</p>
                            <p className="text-xs text-slate-600 mt-0.5">SKU: <span className="font-medium">{selectedProduct.sku || "N/A"}</span></p>
                        </div>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-rose-500 transition-all flex-shrink-0"
                            title="Clear product"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                )}

                <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-400"></span>
                    Search by product name or SKU. Selected category filter is auto-applied.
                </p>
            </div>
        </label>
    );
}

function CategoryLookupField({ field, value, onChange }) {
    const [categories, setCategories] = useState([]);
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadCategories = async () => {
            setLoading(true);
            try {
                const response = await api.get("/product/category/");
                const rows = extractList(response?.data);
                if (isMounted) {
                    setCategories(Array.isArray(rows) ? rows : []);
                }
            } catch {
                if (isMounted) setCategories([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadCategories();
        return () => {
            isMounted = false;
        };
    }, []);

    const selectedCategory = categories.find((item) => String(item.id) === String(value)) || null;
    const filteredCategories = categories
        .filter((item) =>
            item?.name?.toLowerCase().includes(query.trim().toLowerCase())
        )
        .slice(0, 20);

    return (
        <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{field.label}</span>
            <div className="space-y-2">
                <div className="relative">
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-brand-500/25 focus-within:border-brand-500 focus-within:shadow-md transition-all">
                        <FaSearch className="text-slate-400 flex-shrink-0" size={14} />
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={() => setIsOpen(true)}
                            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                            placeholder={selectedCategory ? "Search to change category..." : "Type category name..."}
                            className="w-full outline-none border-0 text-sm text-slate-800 placeholder-slate-400 bg-transparent font-medium"
                        />
                        {loading && (
                            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                        )}
                    </div>

                    {isOpen && filteredCategories.length > 0 && (
                        <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                            {filteredCategories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(field.key, String(category.id));
                                        setQuery("");
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-brand-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                                >
                                    <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">{category.name}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedCategory && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-brand-200 bg-brand-50/50 px-4 py-2.5 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900 truncate flex-1">{selectedCategory.name}</p>
                        <button
                            type="button"
                            onClick={() => onChange(field.key, "")}
                            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-rose-500 transition-all flex-shrink-0"
                            title="Clear category"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                )}

                <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-400"></span>
                    Select category by name. Category ID is sent automatically to backend.
                </p>
            </div>
        </label>
    );
}

function formatFilterBadgeValue(key, value) {
    if (key.includes("month")) return getMonthLabel(value);
    return value;
}

function AnalyticsDashboard({ endpoint, data, selectedBranch, branches }) {
    const branchNameById = useMemo(
        () =>
            (branches || []).reduce((acc, branch) => {
                if (!branch || branch.id === null || branch.id === undefined) return acc;
                acc[String(branch.id)] = branch.branch_name || branch.name || `Branch ${branch.id}`;
                return acc;
            }, {}),
        [branches]
    );

    const dashboard = useMemo(
        () =>
            buildDashboardData(endpoint.id, data, {
                showBranchLabel: endpoint.id === "product-stock" && !selectedBranch,
                branchNameById,
            }),
        [endpoint.id, data, selectedBranch, branchNameById]
    );

    return (
        <div className="space-y-6">
            {dashboard.cards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {dashboard.cards.map((card) => (
                        <MetricCard key={`${card.label}-${card.value}`} card={card} />
                    ))}
                </div>
            )}

            {dashboard.charts.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {dashboard.charts.map((chart) => (
                        <ChartCard key={chart.id} chart={chart} />
                    ))}
                </div>
            ) : (
                <EmptyResult label="No chart data available for this response." />
            )}

            {dashboard.summaryEntries.length > 0 && (
                <KeyValueGrid title="Summary" entries={dashboard.summaryEntries} />
            )}

            {dashboard.table && <TableSection title={dashboard.table.title} rows={dashboard.table.rows} />}

            {dashboard.extraTables.map((table) => (
                <TableSection key={table.title} title={table.title} rows={table.rows} />
            ))}

            {dashboard.detailObjects.map((item) => (
                <NestedObjectSection key={item.title} title={item.title} data={item.data} />
            ))}
        </div>
    );
}

function MetricCard({ card }) {
    const toneMap = {
        slate: "border-slate-200 bg-slate-50 text-slate-700",
        sky: "border-sky-200 bg-sky-50 text-sky-700",
        amber: "border-amber-200 bg-amber-50 text-amber-700",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
        rose: "border-rose-200 bg-rose-50 text-rose-700",
    };
    const toneClass = toneMap[card.tone] || toneMap.slate;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="text-xl font-semibold text-slate-900 mt-1 break-words">{card.value}</p>
            <p className={`mt-3 inline-flex px-2 py-1 rounded-md text-[11px] font-semibold border ${toneClass}`}>
                {card.hint || "Analytics metric"}
            </p>
        </div>
    );
}

function ChartCard({ chart }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">{chart.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{chart.subtitle}</p>
            </div>
            <div className="p-0">
                <EChartRenderer
                    config={{
                        ...chart,
                        chart_type: chart.type === 'bar' ? 'vertical_bar' :
                            chart.type === 'line' ? 'line_chart' :
                                chart.type === 'pie' ? 'pie_chart' :
                                    chart.type === 'bar3d' ? 'vertical_bar' : chart.type,
                        datasets: chart.series,
                        title: "" // Title is already in the card header
                    }}
                    height="350px"
                />
            </div>
        </div>
    );
}

function formatChartValue(value, type) {
    if (type === "currency") return formatCurrency(value);
    if (type === "percent") return formatPercent(toNumber(value) / 100);
    return formatInteger(value);
}

// Removed legacy MUI chart panels

function EmptyResult({ label }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">{label}</p>
        </div>
    );
}

function KeyValueGrid({ title, entries }) {
    if (!entries || entries.length === 0) return null;

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
                <FaCheckCircle className="text-emerald-600" size={12} />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {entries.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {toTitleCase(key)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                            {formatCellValue(key, value)}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function TableSection({ title, rows }) {
    if (!rows || rows.length === 0) return <EmptyResult label={`No ${title.toLowerCase()} records.`} />;

    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
                <FaCheckCircle className="text-emerald-600" size={12} />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {columns.map((column) => (
                                    <th
                                        key={column}
                                        className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap"
                                    >
                                        {toTitleCase(column)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {rows.map((row, index) => (
                                <tr key={`${title}-${index}`} className="hover:bg-slate-50">
                                    {columns.map((column) => (
                                        <td key={`${column}-${index}`} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                            {formatCellValue(column, row[column])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

function NestedObjectSection({ title, data }) {
    const rows = Object.entries(data || {});
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                {rows.map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {toTitleCase(key)}
                        </span>
                        <span className="text-sm text-slate-800 text-right break-all">
                            {formatCellValue(key, value)}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
