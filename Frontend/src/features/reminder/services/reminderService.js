import api from "@/services/api";

/**
 * reminderService
 * ================
 * Centralised service for all reminder-related API calls.
 *
 * Entity type strings must match the backend ContentType format:
 *   "tasks.task" | "supplier.purchaseorder" | "supplier.salesorder" | "cost.monthlycostcategory"
 */

const ENTITY_ENDPOINT_MAP = {
    "tasks.task": (id) => `/task/${id}/create-reminder/`,
    "supplier.purchaseorder": (id) => `/purchase-order/${id}/create-reminder/`,
    "supplier.salesorder": (id) => `/sales-order/${id}/create-reminder/`,
    "cost.monthlycostcategory": (id) => `/cost/category/month/${id}/create-reminder/`,
    "invoice.invoice": (id) => `/invoice/${id}/create-reminder/`,
    "subscription.plan": (id) => `/subscription/${id}/create-reminder/`,
    "gst_management.monthlygstsummary": (id) => `/gst-management/${id}/create-reminder/`,
    "cost.expense": (id) => `/cost/expenses/${id}/create-reminder/`,
};

const reminderService = {
    // -----------------------------------------------------------------------
    // Generic (standalone) reminders
    // -----------------------------------------------------------------------

    /** Fetch all reminders for the current user. */
    getReminders: async (params = {}) => {
        const hasParams = Object.keys(params).length > 0;
        const response = await api.get("/notification/reminders/", hasParams ? { params } : undefined);
        return response.data;
    },

    /** Fetch a single reminder by ID. */
    getReminderById: async (id) => {
        const response = await api.get(`/notification/reminders/${id}/`);
        return response.data;
    },

    /** Create a standalone reminder (not linked to any entity). */
    createReminder: async (data) => {
        const response = await api.post("/notification/reminders/", data);
        return response.data;
    },

    /** Update a reminder by ID. */
    updateReminder: async (id, data) => {
        const response = await api.patch(`/notification/reminders/${id}/`, data);
        return response.data;
    },

    /** Delete a reminder by ID. */
    deleteReminder: async (id) => {
        await api.delete(`/notification/reminders/${id}/`);
        return true;
    },

    // -----------------------------------------------------------------------
    // Entity-linked reminders
    // -----------------------------------------------------------------------

    /**
     * Create a reminder and link it to a specific entity.
     *
     * @param {string} entityType - e.g. "tasks.task"
     * @param {number} entityId   - PK of the entity
     * @param {object} data       - { title, content?, remind_at, recurrence? }
     */
    createEntityReminder: async (entityType, entityId, data) => {
        const getEndpoint = ENTITY_ENDPOINT_MAP[entityType];
        if (!getEndpoint) {
            throw new Error(`Unknown entityType: "${entityType}". Add it to ENTITY_ENDPOINT_MAP.`);
        }
        const response = await api.post(getEndpoint(entityId), data);
        return response.data;
    },

    /**
     * Fetch all reminders linked to a specific entity.
     *
     * @param {string} entityType - e.g. "tasks.task"
     * @param {number} entityId   - PK of the entity
     */
    getEntityReminders: async (entityType, entityId) => {
        const response = await api.get("/notification/entity-reminders/", {
            params: { entity_type: entityType, entity_id: entityId },
        });
        return response.data;
    },

    /**
     * Remove a specific ReminderLink (without deleting the reminder itself).
     *
     * @param {number} reminderId - ID of the Reminder
     * @param {number} linkId     - ID of the ReminderLink
     */
    deleteEntityReminderLink: async (reminderId, linkId) => {
        await api.delete(`/notification/reminders/${reminderId}/links/${linkId}/`);
        return true;
    },
};

export default reminderService;
