import api from "@/services/api";

const taskService = {
    createTask: async (data) => {
        try {
            const response = await api.post("/task/", data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getAssigneeTasks: async (params = {}) => {
        try {
            const hasParams = params && Object.keys(params).length > 0;
            const response = await api.get("/task/assignee/", hasParams ? { params } : undefined);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getAssignedByTasks: async (params = {}) => {
        try {
            const hasParams = params && Object.keys(params).length > 0;
            const response = await api.get("/task/assigned_by/", hasParams ? { params } : undefined);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateTask: async (id, data) => {
        try {
            const response = await api.patch(`/task/${id}/`, data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteTask: async (id) => {
        try {
            await api.delete(`/task/${id}/`);
            return true;
        } catch (error) {
            throw error;
        }
    },

    getTaskById: async (id) => {
        try {
            const response = await api.get(`/task/${id}/`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default taskService;
