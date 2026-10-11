import api from "@/services/api";

const taskGroupService = {
    getGroups: async (params = {}) => {
        const response = await api.get("/task/groups/", { params });
        return response.data;
    },

    createGroup: async (data) => {
        const response = await api.post("/task/groups/", data);
        return response.data;
    },

    updateGroup: async (id, data) => {
        const response = await api.patch(`/task/groups/${id}/`, data);
        return response.data;
    },

    deleteGroup: async (id) => {
        await api.delete(`/task/groups/${id}/`);
        return true;
    },

    getGroupById: async (id) => {
        const response = await api.get(`/task/groups/${id}/`);
        return response.data;
    }
};

export default taskGroupService;
