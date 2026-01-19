import api from "@/services/api";

export const invoiceService = {
    getAll: (query = "") => api.get(`/invoice/${query}`), // query includes ?...
    getByUrl: (url) => api.get(url),
    create: (data) => api.post("/invoice/", data),

    checkCustomer: (mobile) => api.get(`/customer/mobile_number/?mobile_number=${mobile}`),
};
