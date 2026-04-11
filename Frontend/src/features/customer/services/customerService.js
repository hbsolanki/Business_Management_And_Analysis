import api from "@/services/api";

const CUSTOMER_BASE_PATH = "/business/customer/";

export const customerService = {
    list: (params = {}) => api.get(CUSTOMER_BASE_PATH, { params }),
    getById: (id) => api.get(`${CUSTOMER_BASE_PATH}${id}/`),
    create: (data) => api.post(CUSTOMER_BASE_PATH, data),
    update: (id, data) => api.patch(`${CUSTOMER_BASE_PATH}${id}/`, data),
    delete: (id) => api.delete(`${CUSTOMER_BASE_PATH}${id}/`),
};
