import api from "@/services/api";

export const managerService = {
    getAll: () => api.get("/user/manager/"),
    create: (data) => api.post("/user/manager/", data),
    getById: (id) => api.get(`/user/${id}/`),
    update: (id, data) => api.patch(`/user/${id}/`, data),
    delete: (id) => api.delete(`/user/${id}/`),
};
