import { useState, useCallback, useEffect } from 'react';
import taskService from '../services/taskService';
import { toast } from 'react-hot-toast';

export const useTaskData = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchTasks = useCallback(async (type = 'assigned_to') => {
        try {
            setLoading(true);
            let data;
            if (type === 'assigned_by') {
                data = await taskService.getAssignedByTasks();
            } else {
                data = await taskService.getAssigneeTasks();
            }

            if (Array.isArray(data)) {
                setTasks(data);
            } else if (data && Array.isArray(data.results)) {
                setTasks(data.results);
            } else {
                setTasks([]);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
            // Don't toast on load error to avoid spamming user
        } finally {
            setLoading(false);
        }
    }, []);

    const createTask = useCallback(async (taskData) => {
        try {
            setCreating(true);
            const newTask = await taskService.createTask(taskData);
            // We assume if you create a task, you might want to see it in "assigned_by" list
            // or if we are in "assigned_to", we might not see it immediately unless we are assigned to ourselves.
            // For simplicity, we just trigger a toast. The UI should refresh or handle state.
            toast.success("Task created successfully");
            return true;
        } catch (error) {
            console.error("Failed to create task", error);
            toast.error("Failed to create task");
            return false;
        } finally {
            setCreating(false);
        }
    }, []);

    const updateTask = useCallback(async (id, updates) => {
        try {
            const updatedTask = await taskService.updateTask(id, updates);
            setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
            toast.success("Task updated");
            return true;
        } catch (error) {
            console.error("Failed to update task", error);
            toast.error("Failed to update task");
            return false;
        }
    }, []);

    const deleteTask = useCallback(async (id) => {
        try {
            await taskService.deleteTask(id);
            setTasks(prev => prev.filter(t => t.id !== id));
            toast.success("Task deleted");
            return true;
        } catch (error) {
            console.error("Failed to delete task", error);
            toast.error("Failed to delete task");
            return false;
        }
    }, []);

    return {
        tasks,
        loading,
        creating,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask
    };
};
