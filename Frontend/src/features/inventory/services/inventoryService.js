import api from "@/services/api";

export const inventoryService = {
    getStock: (query = "") => api.get(`/inventory/stock/${query}`),
    getById: (id) => api.get(`/inventory/${id}/`),
    getStockByUrl: (url) => api.get(url),

    getTransactions: (query = "") => api.get(`/inventory/transaction/${query}`),
    getTransactionsByUrl: (url) => api.get(url),

    createTransaction: (data) => api.post("/inventory/transaction/new/", data),
};
