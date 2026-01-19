import api from "@/services/api";

export const businessService = {
    create: (data) => api.post("/business/", data),
    get: (id) => api.get(`/business/${id}/`),
    update: (id, data) => api.patch(`/business/${id}/`, data),
};
