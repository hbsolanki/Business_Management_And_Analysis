import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'quick_actions_active_ids';

const loadState = () => {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (serialized === null) {
            return [];
        }
        return JSON.parse(serialized);
    } catch (err) {
        return [];
    }
};

const initialState = {
    activeActionIds: loadState(),
};

const quickActionsSlice = createSlice({
    name: 'quickActions',
    initialState,
    reducers: {
        toggleQuickAction: (state, action) => {
            const id = action.payload;
            if (state.activeActionIds.includes(id)) {
                state.activeActionIds = state.activeActionIds.filter(actionId => actionId !== id);
            } else {
                state.activeActionIds.push(id);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.activeActionIds));
        },
        setQuickActions: (state, action) => {
            state.activeActionIds = action.payload;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.activeActionIds));
        }
    },
});

export const { toggleQuickAction, setQuickActions } = quickActionsSlice.actions;
export default quickActionsSlice.reducer;
