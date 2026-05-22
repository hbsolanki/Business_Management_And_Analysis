import { configureStore } from '@reduxjs/toolkit';
import quickActionsReducer from './slices/quickActionsSlice';
import quickSearchReducer from './slices/quickSearchSlice';
import themeReducer from './slices/themeSlice';

import userReducer from './slices/userSlice';

export const store = configureStore({
    reducer: {
        quickActions: quickActionsReducer,
        quickSearch: quickSearchReducer,
        theme: themeReducer,

        user: userReducer,
    },
});
