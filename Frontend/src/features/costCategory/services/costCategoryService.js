import api from "@/services/api";

const costCategoryService = {
    getAll: () => api.get("/cost-category/"),
    create: (data) => api.post("/cost-category/", data),
    update: (id, data) => api.patch(`/cost-category/${id}/`, data),
    delete: (id) => api.delete(`/cost-category/${id}/`),
};

export default costCategoryService;
