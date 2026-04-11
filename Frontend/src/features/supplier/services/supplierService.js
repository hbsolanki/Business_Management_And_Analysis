import api from "@/services/api";

const VENDOR_BASE_PATH = "/supplier/vendor/";
// Backend contract currently uses "purchase-order" for CRUD endpoints.
const PURCHASE_ORDER_BASE_PATH = "/supplier/purchase-order/";
const SALE_ORDER_BASE_PATH = "/supplier/sales-order/";

export const supplierService = {
    // Vendor endpoints
    getVendors: (query = "") => api.get(`${VENDOR_BASE_PATH}${query}`),
    getVendorById: (id) => api.get(`${VENDOR_BASE_PATH}${id}/`),
    createVendor: (data) => api.post(VENDOR_BASE_PATH, data),
    updateVendor: (id, data) => api.patch(`${VENDOR_BASE_PATH}${id}/`, data),
    deleteVendor: (id) => api.delete(`${VENDOR_BASE_PATH}${id}/`),

    // Purchase order endpoints
    getPurchaseOrders: (query = "") => api.get(`${PURCHASE_ORDER_BASE_PATH}${query}`),
    getPurchaseOrderById: (id) => api.get(`${PURCHASE_ORDER_BASE_PATH}${id}/`),
    createPurchaseOrder: (data) => api.post(PURCHASE_ORDER_BASE_PATH, data),
    updatePurchaseOrder: (id, data) => api.patch(`${PURCHASE_ORDER_BASE_PATH}${id}/`, data),
    deletePurchaseOrder: (id) => api.delete(`${PURCHASE_ORDER_BASE_PATH}${id}/`),

    // Delivery endpoint for Purchase Orders
    deliverPurchaseOrder: (id, data = {}) => api.post(`/supplier/purchase-order/${id}/delivered/`, data),

    // Sale order endpoints
    getSaleOrders: (query = "") => api.get(`${SALE_ORDER_BASE_PATH}${query}`),
    getSaleOrderById: (id) => api.get(`${SALE_ORDER_BASE_PATH}${id}/`),
    createSaleOrder: (data) => api.post(SALE_ORDER_BASE_PATH, data),
    updateSaleOrder: (id, data) => api.patch(`${SALE_ORDER_BASE_PATH}${id}/`, data),
    deleteSaleOrder: (id) => api.delete(`${SALE_ORDER_BASE_PATH}${id}/`),
    deliverSaleOrder: (id, data = {}) => api.post(`/supplier/sales-order/${id}/deliver/`, data),

    // API Key reset
    resetVendorApiKey: (id) => api.post(`${VENDOR_BASE_PATH}${id}/reset-api-key/`),
};
