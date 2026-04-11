import api from "@/services/api";

export const productService = {
    getAll: (url) => api.get(url), // url includes query params
    getById: (id) => api.get(`/product/${id}/`),
    create: (data) => api.post("/product/", data),
    update: (id, data) => api.patch(`/product/${id}/`, data),
    delete: (id) => api.delete(`/product/${id}/`),

    getCategories: (url = "/product/category/") => api.get(url),
    deleteCategory: (id) => api.delete(`/product/category/${id}/`),
};
