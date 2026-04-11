import api from "@/services/api";

export const branchService = {
    list: (params) => api.get("/business/branch/", { params }),
    get: (id) => api.get(`/business/branch/${id}/`),
    create: (data) => api.post("/business/branch/", data),
    update: (id, data) => api.patch(`/business/branch/${id}/`, data),
    delete: (id) => api.delete(`/business/branch/${id}/`),
};
