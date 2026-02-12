import api from "@/services/api";

const costService = {
    // Get monthly cost summary
    getMonthlyCosts: () => api.get("/cost/category/month/"),

    // Get monthly financial summary with optional filters (month, year, from_date, to_date)
    getMonthlyFinancialSummary: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.month) queryParams.append("month", params.month);
        if (params.year) queryParams.append("year", params.year);
        if (params.from_date) queryParams.append("from_date", params.from_date);
        if (params.to_date) queryParams.append("to_date", params.to_date);

        const queryString = queryParams.toString();
        return api.get(`/cost/month/${queryString ? `?${queryString}` : ""}`);
    },

    // Add new monthly costs (batch)
    addCost: (data) => api.post("/cost/category/month/", data),

    // Update a specific monthly cost entry
    updateCost: (id, data) => api.patch(`/cost/category/month/${id}/`, data),

    // Delete a specific monthly cost entry
    deleteCost: (id) => api.delete(`/cost/category/month/${id}/`),
};

export default costService;
