import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEYS = {
    header: 'header_quick_actions',
    dashboard: 'dashboard_quick_actions'
};

const loadState = (type) => {
    try {
        const key = STORAGE_KEYS[type];
        const serialized = localStorage.getItem(key);
        if (serialized === null) {
            return [];
        }
        const parsed = JSON.parse(serialized);
        // Ensure we only return strings (filter out any malformed objects from previous bugs)
        return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    } catch (err) {
        return [];
    }
};

const initialState = {
    headerActions: loadState('header'),
    dashboardActions: loadState('dashboard'),
    chatPreferredUserId: localStorage.getItem('chat_preferred_user_id') || null,
};

const quickActionsSlice = createSlice({
    name: 'quickActions',
    initialState,
    reducers: {
        toggleHeaderAction: (state, action) => {
            const id = action.payload;
            if (state.headerActions.includes(id)) {
                state.headerActions = state.headerActions.filter(actionId => actionId !== id);
            } else {
                state.headerActions.push(id);
            }
            localStorage.setItem(STORAGE_KEYS.header, JSON.stringify(state.headerActions));
        },
        toggleDashboardAction: (state, action) => {
            const id = action.payload;
            if (state.dashboardActions.includes(id)) {
                state.dashboardActions = state.dashboardActions.filter(actionId => actionId !== id);
            } else {
                state.dashboardActions.push(id);
            }
            localStorage.setItem(STORAGE_KEYS.dashboard, JSON.stringify(state.dashboardActions));
        },
        setChatPreferredUser: (state, action) => {
            state.chatPreferredUserId = action.payload;
            if (action.payload) {
                localStorage.setItem('chat_preferred_user_id', action.payload);
            } else {
                localStorage.removeItem('chat_preferred_user_id');
            }
        },
        // Kept for backward compatibility if needed, but should be avoided
        setQuickActions: (state, action) => {
            // Defaults to dashboard actions if not specified, but better to use specific setters
            state.dashboardActions = action.payload;
            localStorage.setItem(STORAGE_KEYS.dashboard, JSON.stringify(state.dashboardActions));
        }
    },
});

export const { toggleHeaderAction, toggleDashboardAction, setChatPreferredUser, setQuickActions } = quickActionsSlice.actions;
export default quickActionsSlice.reducer;
