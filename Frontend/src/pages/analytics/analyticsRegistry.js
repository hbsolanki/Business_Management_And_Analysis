const MONTH_OPTIONS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => currentYear - index);

const toLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getCurrentMonth = () => {
    const date = new Date();
    return {
        month: date.getMonth() + 1,
        year: date.getFullYear(),
    };
};

const getLast30DayDateRange = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    from.setHours(0, 0, 0, 0);

    return {
        from_date: toLocalDate(from),
        to_date: toLocalDate(to),
    };
};

const getLast30DayDateTimeRange = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    from.setHours(0, 0, 0, 0);

    return {
        from_date_and_time: toLocalDateTime(from),
        to_date_and_time: toLocalDateTime(to),
    };
};

const getLast30DayMonthRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    return {
        start_month: start.getMonth() + 1,
        start_year: start.getFullYear(),
        end_month: end.getMonth() + 1,
        end_year: end.getFullYear(),
    };
};

const getLastMonthDateTimeRange = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    return {
        from_date_and_time: toLocalDateTime(lastMonth),
        to_date_and_time: toLocalDateTime(lastMonthEnd),
    };
};

export const ANALYTICS_ENDPOINTS = [
    {
        id: "product-details",
        group: "Product",
        title: "Product Details",
        description: "Returns product pricing and net-profit values.",
        endpoint: "/analytics/product/details/",
        filters: [],
        tags: ["product", "details", "pricing", "profit"],
    },
    {
        id: "product-stock",
        group: "Product",
        title: "Product Stock",
        description: "Returns stock quantity by product.",
        endpoint: "/analytics/product/stock/",
        filters: [],
        tags: ["stock", "inventory", "product"],
    },
    {
        id: "product-performance",
        group: "Product",
        title: "Product Performance Report",
        description: "Summary + product-level revenue/cost/profit report.",
        endpoint: "/analytics/product/performance/report/",
        filters: [
            { key: "product_id", label: "Product", type: "product-lookup" },
            { key: "category_id", label: "Category", type: "category-lookup" },
            { key: "from_date_and_time", label: "From Date & Time", type: "datetime-local" },
            { key: "to_date_and_time", label: "To Date & Time", type: "datetime-local" },
        ],
        tags: ["product", "performance", "report"],
    },
    {
        id: "category-performance",
        group: "Product",
        title: "Category Performance",
        description: "Category-wise revenue, profit, and quantity sold.",
        endpoint: "/analytics/product/category/performance/",
        filters: [
            { key: "product_id", label: "Product", type: "product-lookup" },
            { key: "category_id", label: "Category", type: "category-lookup" },
            { key: "from_date_and_time", label: "From Date & Time", type: "datetime-local" },
            { key: "to_date_and_time", label: "To Date & Time", type: "datetime-local" },
        ],
        tags: ["category", "performance", "product", "funnel", "volume"],
    },
    {
        id: "month-breakdown",
        group: "Monthly",
        title: "Month Breakdown",
        description: "Monthly breakdown: tax, salary, product cost, and category costs.",
        endpoint: "/analytics/month/breakdown/",
        filters: [
            { key: "month", label: "Month", type: "month" },
            { key: "year", label: "Year", type: "year" },
        ],
        tags: ["month", "breakdown", "cost"],
    },
    {
        id: "net-profit",
        group: "Monthly",
        title: "Net Profit",
        description: "Net profit after tax for selected month/year.",
        endpoint: "/analytics/month/netprofit/",
        filters: [
            { key: "month", label: "Month", type: "month" },
            { key: "year", label: "Year", type: "year" },
        ],
        tags: ["net", "profit", "month"],
    },
    {
        id: "financial-trend",
        group: "Monthly",
        title: "Financial Trend",
        description: "Revenue, total cost, gross profit, and net profit trend by range.",
        endpoint: "/analytics/month/financial_trend/",
        filters: [
            { key: "start_month", label: "Start Month", type: "month" },
            { key: "start_year", label: "Start Year", type: "year" },
            { key: "end_month", label: "End Month", type: "month" },
            { key: "end_year", label: "End Year", type: "year" },
        ],
        tags: ["financial", "trend", "monthly"],
    },
    {
        id: "tax-analytics",
        group: "Monthly",
        title: "Tax Analytics",
        description: "Input/output GST, tax payable, and tax trend.",
        endpoint: "/analytics/month/tax_analytics/",
        filters: [
            { key: "start_month", label: "Start Month", type: "month" },
            { key: "start_year", label: "Start Year", type: "year" },
            { key: "end_month", label: "End Month", type: "month" },
            { key: "end_year", label: "End Year", type: "year" },
        ],
        tags: ["tax", "gst", "trend"],
    },
    {
        id: "profit-margins",
        group: "Monthly",
        title: "Profit Margins",
        description: "Net/gross margin percentages over a selected month range.",
        endpoint: "/analytics/month/profit_margins/",
        filters: [
            { key: "start_month", label: "Start Month", type: "month" },
            { key: "start_year", label: "Start Year", type: "year" },
            { key: "end_month", label: "End Month", type: "month" },
            { key: "end_year", label: "End Year", type: "year" },
        ],
        tags: ["profit", "margin", "trend"],
    },
    {
        id: "customer-revenue",
        group: "Customer",
        title: "Customer Revenue Leaderboard",
        description: "Customer ranking by revenue with order statistics.",
        endpoint: "/analytics/customer/leaderboard/revenue/",
        filters: [
            { key: "from_date", label: "From Date", type: "date" },
            { key: "to_date", label: "To Date", type: "date" },
            { key: "customer_id", label: "Customer ID", type: "number", placeholder: "Optional" },
            { key: "mobile_number", label: "Mobile Number", type: "text", placeholder: "Optional" },
        ],
        tags: ["customer", "revenue", "leaderboard"],
    },
    {
        id: "customer-retention",
        group: "Customer",
        title: "Customer Retention Metrics",
        description: "Retention/churn metrics for selected date range.",
        endpoint: "/analytics/customer/metrics/retention/",
        filters: [
            { key: "from_date", label: "From Date", type: "date" },
            { key: "to_date", label: "To Date", type: "date" },
        ],
        tags: ["customer", "retention", "churn"],
    },
    {
        id: "customer-product-preferences",
        group: "Customer",
        title: "Customer Product Preferences",
        description: "Preferred products by customer over a date range.",
        endpoint: "/analytics/customer/product/preferences/",
        filters: [
            { key: "from_date", label: "From Date", type: "date" },
            { key: "to_date", label: "To Date", type: "date" },
            { key: "customer_id", label: "Customer ID", type: "number", placeholder: "Optional" },
            { key: "mobile_number", label: "Mobile Number", type: "text", placeholder: "Optional" },
        ],
        tags: ["customer", "product", "preferences"],
    },
    {
        id: "customer-product-list",
        group: "Customer",
        title: "Customer Product List",
        description: "Products purchased by each customer with optional filters.",
        endpoint: "/analytics/customer/product/",
        filters: [
            { key: "from_date", label: "From Date", type: "date" },
            { key: "to_date", label: "To Date", type: "date" },
            { key: "customer_id", label: "Customer ID", type: "number", placeholder: "Optional" },
            { key: "mobile_number", label: "Mobile Number", type: "text", placeholder: "Optional" },
            { key: "product_id", label: "Product ID", type: "number", placeholder: "Optional" },
            { key: "category_id", label: "Category ID", type: "number", placeholder: "Optional" },
        ],
        tags: ["customer", "product", "list"],
    },
    {
        id: "customer-spend",
        group: "Customer",
        title: "Customer Spend Trend",
        description: "Customer spend by selected month and year.",
        endpoint: "/analytics/customer/spend/",
        filters: [
            { key: "month", label: "Month", type: "month" },
            { key: "year", label: "Year", type: "year" },
        ],
        tags: ["customer", "spend", "trend"],
    },
];

export const SECTION_TO_ENDPOINT_ID = {
    "month-breakdown": "month-breakdown",
    "net-profit": "net-profit",
    "product-performance": "product-performance",
    "cost-profit": "product-details",
    "inventory-category": "product-stock",
};

export const FILTER_GROUPS = ["All", "Monthly", "Product", "Customer"];

export const getAnalyticsEndpoint = (id) =>
    ANALYTICS_ENDPOINTS.find((item) => item.id === id) || null;

export const getFilterFieldOptions = (field) => {
    if (field.type === "month") return MONTH_OPTIONS;
    if (field.type === "year") {
        return YEAR_OPTIONS.map((year) => ({
            value: year,
            label: year,
        }));
    }
    return [];
};

export const getDefaultFiltersForEndpoint = (endpointId) => {
    const endpoint = getAnalyticsEndpoint(endpointId);
    if (!endpoint) return {};

    const base = endpoint.filters.reduce((acc, field) => {
        acc[field.key] = "";
        return acc;
    }, {});

    if (["month-breakdown", "net-profit", "customer-spend"].includes(endpointId)) {
        const period = getCurrentMonth();
        return {
            ...base,
            month: period.month,
            year: period.year,
        };
    }

    if (["financial-trend", "tax-analytics", "profit-margins"].includes(endpointId)) {
        const period = getLast30DayMonthRange();
        return {
            ...base,
            ...period,
        };
    }

    if (["product-performance", "category-performance"].includes(endpointId)) {
        return {
            ...base,
            ...getLastMonthDateTimeRange(),
        };
    }

    if (
        [
            "customer-revenue",
            "customer-retention",
            "customer-product-preferences",
            "customer-product-list",
        ].includes(endpointId)
    ) {
        return {
            ...base,
            ...getLast30DayDateRange(),
        };
    }

    return base;
};

export const serializeFilters = (endpoint, filters) => {
    const params = new URLSearchParams();

    endpoint.filters.forEach((field) => {
        const raw = filters[field.key];
        if (raw === "" || raw === null || raw === undefined) return;

        if (field.type === "datetime-local" && typeof raw === "string") {
            const normalized = raw.length === 16 ? `${raw}:00` : raw;
            params.append(field.key, normalized);
            return;
        }

        params.append(field.key, raw);
    });

    return params.toString();
};

export const getMonthLabel = (monthValue) => {
    const month = Number(monthValue);
    const found = MONTH_OPTIONS.find((item) => item.value === month);
    return found ? found.label : String(monthValue ?? "");
};
