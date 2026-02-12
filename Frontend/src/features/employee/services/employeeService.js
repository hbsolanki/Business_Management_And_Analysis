import api from "@/services/api";

export const employeeService = {
    getAll: () => api.get("/business/employee/"),
    getById: (id) => api.get(`/user/${id}/`),
    create: (data) => api.post("/business/employee/", data),
    update: (id, data) => {
        const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
        return api.patch(`/user/${id}/`, data, isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined);
    },
    delete: (id) => api.delete(`/user/${id}/`),
};
