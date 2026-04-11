import api from "@/services/api";

export const businessService = {
    create: (data) => api.post("/business/", data),
    list: (params = {}) => api.get("/business/", { params }),
    get: (id) => api.get(`/business/${id}/`),
    update: (id, data) => api.patch(`/business/${id}/`, data),
    delete: (id) => api.delete(`/business/${id}/`),
};
