import api from "@/services/api";

const customerAnalyticsService = {
    // 1. Customer Leaderboard (Revenue)
    getLeaderboard: async ({
        from_date,
        to_date,
        start_date,
        end_date,
        customer_id,
        mobile_number,
        branch,
        cursor,
        signal,
    } = {}) => {
        // If a full cursor URL is provided (next link), use it directly
        if (cursor && cursor.startsWith("http")) {
            const response = await api.get(cursor, { signal });
            return response.data;
        }

        const fromDate = from_date || start_date;
        const toDate = to_date || end_date;
        const params = new URLSearchParams();
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
        if (customer_id) params.append("customer_id", customer_id);
        if (mobile_number) params.append("mobile_number", mobile_number);
        if (branch) params.append("branch", branch);
        if (cursor) params.append("cursor", cursor);

        const query = params.toString();
        const response = await api.get(`/analytics/customer/leaderboard/revenue/${query ? `?${query}` : ""}`, { signal });
        return response.data;
    },

    // 2. Customer Retention Metrics
    getRetentionMetrics: async ({ from_date, to_date, branch, signal } = {}) => {
        const params = new URLSearchParams();
        if (from_date) params.append("from_date", from_date);
        if (to_date) params.append("to_date", to_date);
        if (branch) params.append("branch", branch);

        const query = params.toString();
        const response = await api.get(`/analytics/customer/metrics/retention/${query ? `?${query}` : ""}`, { signal });
        return response.data;
    },

    // 3. Customer Products (List of products bought by a customer)
    getCustomerProducts: async ({
        from_date,
        to_date,
        start_date,
        end_date,
        customer_id,
        mobile_number,
        product_id,
        category_id,
        branch,
        page,
        limit,
        signal,
    } = {}) => {
        const fromDate = from_date || start_date;
        const toDate = to_date || end_date;
        const params = new URLSearchParams();
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
        if (customer_id) params.append("customer_id", customer_id);
        if (mobile_number) params.append("mobile_number", mobile_number);
        if (product_id) params.append("product_id", product_id);
        if (category_id) params.append("category_id", category_id);
        if (branch) params.append("branch", branch);
        if (page) params.append("page", page);
        if (limit) params.append("limit", limit);

        const query = params.toString();
        const response = await api.get(`/analytics/customer/product/${query ? `?${query}` : ""}`, { signal });
        return response.data;
    },

    // 4. Customer Product Preferences (Aggregated product data for customers)
    getProductPreferences: async ({
        from_date,
        to_date,
        start_date,
        end_date,
        customer_id,
        mobile_number,
        branch,
        cursor,
        signal,
    } = {}) => {
        // If a full cursor URL is provided (next link), use it directly
        if (cursor && cursor.startsWith("http")) {
            const response = await api.get(cursor, { signal });
            return response.data;
        }

        const fromDate = from_date || start_date;
        const toDate = to_date || end_date;
        const params = new URLSearchParams();
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
        if (customer_id) params.append("customer_id", customer_id);
        if (mobile_number) params.append("mobile_number", mobile_number);
        if (branch) params.append("branch", branch);
        if (cursor) params.append("cursor", cursor);

        const query = params.toString();
        const response = await api.get(`/analytics/customer/product/preferences/${query ? `?${query}` : ""}`, { signal });
        return response.data;
    },

    // 5. Customer Spend Trend
    getSpendTrend: async ({ month, year, branch, signal }) => {
        const params = new URLSearchParams();
        if (month) params.append("month", month);
        if (year) params.append("year", year);
        if (branch) params.append("branch", branch);

        const query = params.toString();
        const response = await api.get(`/analytics/customer/spend/${query ? `?${query}` : ""}`, { signal });
        return response.data;
    },
};

export default customerAnalyticsService;
