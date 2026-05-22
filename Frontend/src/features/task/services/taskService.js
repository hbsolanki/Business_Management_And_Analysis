import api from "@/services/api";
import { tokenService } from "@/services/tokenService";

const taskService = {
    createTask: async (data) => {
        const response = await api.post("/task/", data);
        return response.data;
    },

    getTasks: async (params = {}) => {
        const hasParams = params && Object.keys(params).length > 0;
        const response = await api.get("/task/", hasParams ? { params } : undefined);
        return response.data;
    },

    getAssigneeTasks: async () => {
        const id = tokenService.getId();
        const response = await api.get("/task/", { params: { assignee: id } });
        return response.data;
    },

    getAssignedByTasks: async () => {
        const id = tokenService.getId();
        const response = await api.get("/task/", { params: { assigned_by: id } });
        return response.data;
    },

    updateTask: async (id, data) => {
        const response = await api.patch(`/task/${id}/`, data);
        return response.data;
    },

    deleteTask: async (id) => {
        await api.delete(`/task/${id}/`);
        return true;
    },

    getTaskById: async (id) => {
        const response = await api.get(`/task/${id}/`);
        return response.data;
    },

    createTaskReminder: async (id, data) => {
        const response = await api.post(`/task/${id}/create-reminder/`, data);
        return response.data;
    },
};

export default taskService;
