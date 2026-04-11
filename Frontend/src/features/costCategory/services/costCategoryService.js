import api from "@/services/api";

const costCategoryService = {
    getAll: (branchId) => {
        let url = "/cost/category/";
        if (branchId) {
            url += `?branch_id=${encodeURIComponent(branchId)}`;
        }
        return api.get(url);
    },
    create: (data) => api.post("/cost/category/", data),
    update: (id, data) => api.patch(`/cost/category/${id}/`, data),
    delete: (id) => api.delete(`/cost/category/${id}/`),
};

export default costCategoryService;
