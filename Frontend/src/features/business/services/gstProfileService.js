import api from "@/services/api";

export const gstProfileService = {
    get: () => api.get("/business/gst-profile/"),
    create: (data) => api.post("/business/gst-profile/", data),
    update: (id, data) => api.patch(`/business/gst-profile/${id}/`, data),
};
