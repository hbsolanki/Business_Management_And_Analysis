import api from "@/services/api";

const customerAnalyticsService = {
    // 1. Customer Leaderboard (Revenue)
    getLeaderboard: async ({ start_date, end_date, customer_id, mobile_number, cursor, signal } = {}) => {
        // If a full cursor URL is provided (next link), use it directly
        if (cursor && cursor.startsWith("http")) {
            const response = await api.get(cursor, { signal });
            return response.data;
        }

        const params = new URLSearchParams();
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        if (customer_id) params.append("customer_id", customer_id);
        if (mobile_number) params.append("mobile_number", mobile_number);
        if (cursor) params.append("cursor", cursor);

        const response = await api.get(`/analytics/customer/leaderboard/revenue/?${params.toString()}`, { signal });
        return response.data;
    },

    // 2. Customer Retention Metrics
    getRetentionMetrics: async ({ from_date, to_date, signal } = {}) => {
        const params = new URLSearchParams();
        if (from_date) params.append("from_date", from_date);
        if (to_date) params.append("to_date", to_date);

        const response = await api.get(`/analytics/customer/metrics/retention/?${params.toString()}`, { signal });
        return response.data;
    },

    // 3. Customer Products (List of products bought by a customer)
    getCustomerProducts: async ({ start_date, end_date, customer_id, mobile_number, product_id, page, limit, signal } = {}) => {
        const params = new URLSearchParams();
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        if (customer_id) params.append("customer_id", customer_id);
        if (mobile_number) params.append("mobile_number", mobile_number);
        if (product_id) params.append("product_id", product_id);
        if (page) params.append("page", page);
        if (limit) params.append("limit", limit);

        const response = await api.get(`/analytics/customer/product/?${params.toString()}`, { signal });
        return response.data;
    },

    // 4. Customer Product Preferences (Aggregated product data for customers)
    getProductPreferences: async ({ start_date, end_date, customer_id, mobile_number, cursor, signal } = {}) => {
        // If a full cursor URL is provided (next link), use it directly
        if (cursor && cursor.startsWith("http")) {
            const response = await api.get(cursor, { signal });
            return response.data;
        }

        const params = new URLSearchParams();
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        if (customer_id) params.append("customer_id", customer_id);
        if (mobile_number) params.append("mobile_number", mobile_number);
        if (cursor) params.append("cursor", cursor);

        const response = await api.get(`/analytics/customer/product/preferences/?${params.toString()}`, { signal });
        return response.data;
    },

    // 5. Customer Spend Trend
    getSpendTrend: async ({ month, year, signal }) => {
        const params = new URLSearchParams();
        if (month) params.append("month", month);
        if (year) params.append("year", year);

        const response = await api.get(`/analytics/customer/spend/?${params.toString()}`, { signal });
        return response.data;
    },
};

export default customerAnalyticsService;
