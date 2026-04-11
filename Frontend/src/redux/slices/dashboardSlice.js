import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'dashboard_layouts';

const loadLayouts = () => {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (serialized === null) {
            return {
                owner: [],
                manager: [],
                employee: []
            };
        }
        return JSON.parse(serialized);
    } catch {
        return {
            owner: [],
            manager: [],
            employee: []
        };
    }
};

const initialState = {
    layouts: loadLayouts(),
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        updateLayout: (state, action) => {
            const { role, layout } = action.payload; // role: 'owner' | 'manager' | 'employee'
            state.layouts[role] = layout;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layouts));
        },
        resetLayout: (state, action) => {
            const { role } = action.payload;
            state.layouts[role] = [];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layouts));
        }
    },
});

export const { updateLayout, resetLayout } = dashboardSlice.actions;
export default dashboardSlice.reducer;
