import api from "@/services/api";

export const saleService = {
    getAll: () => api.get("/sale/"),
    create: (data) => api.post("/sale/", data),
    getById: (id) => api.get(`/sale/${id}/`),
    newSale: (sid, data) => api.post(`/sale/${sid}/new/`, data),
    // Add other endpoints as needed
};
