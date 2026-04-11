import api from "@/services/api";

export const managerService = {
    getAll: (params) => api.get("/user/", { params: { role: "MANAGER", ...params } }),
    create: (data) => api.post("/business/manager/", data),
    getById: (id) => api.get(`/user/${id}/`),
    update: (id, data) => {
        const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
        return api.patch(`/user/${id}/`, data, isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined);
    },
    delete: (id) => api.delete(`/user/${id}/`),
};
