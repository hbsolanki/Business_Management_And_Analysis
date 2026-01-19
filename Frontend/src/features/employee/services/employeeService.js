import api from "@/services/api";

export const employeeService = {
    getAll: () => api.get("/user/employee/"),
    getById: (id) => api.get(`/user/${id}/`),
    create: (data) => api.post("/user/employee/create/", data),
    update: (id, data) => api.patch(`/user/${id}/`, data),
    delete: (id) => api.delete(`/user/${id}/`),
};
