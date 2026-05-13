import api from "@/services/api";

export const employeeService = {
    getAll: (params) => api.get("/user/", { params: { role: "EMPLOYEE", ...params } }),
    getById: (id) => api.get(`/user/${id}/`),
    create: (data) => api.post("/business/employee/", data),
    update: (id, data) => api.patch(`/user/${id}/`, data, { timeout: 120000 }),
    delete: (id) => api.delete(`/user/${id}/`),
};
