import api from "@/services/api";

export const managerService = {
    getAll: () => api.get("/user/manager/"),
    create: (data) => api.post("/user/manager/create/", data),
    delete: (id) => api.delete(`/user/${id}/`),
};
