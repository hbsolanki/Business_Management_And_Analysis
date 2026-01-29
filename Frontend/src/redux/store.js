import { configureStore } from '@reduxjs/toolkit';
import quickActionsReducer from './slices/quickActionsSlice';
import themeReducer from './slices/themeSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
    reducer: {
        quickActions: quickActionsReducer,
        theme: themeReducer,
        dashboard: dashboardReducer,
    },
});
