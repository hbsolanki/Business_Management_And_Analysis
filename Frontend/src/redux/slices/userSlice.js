import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';
import { tokenService } from '@/services/tokenService';

const USER_PROFILE_KEY = 'user_profile';

// Helper functions for localStorage
const loadUserFromStorage = () => {
    try {
        const stored = localStorage.getItem(USER_PROFILE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to load user profile from storage:', error);
        return null;
    }
};

const saveUserToStorage = (profile) => {
    try {
        if (profile) {
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
        } else {
            localStorage.removeItem(USER_PROFILE_KEY);
        }
    } catch (error) {
        console.error('Failed to save user profile to storage:', error);
    }
};

// Async thunk to fetch user profile
export const fetchUserProfile = createAsyncThunk(
    'user/fetchUserProfile',
    async (_, { rejectWithValue }) => {
        try {
            const id = tokenService.getId();
            if (!id) throw new Error("No user ID found");
            const response = await api.get(`/user/${id}/`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch profile");
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState: {
        profile: loadUserFromStorage(), // Load from localStorage on init
        loading: false,
        error: null,
    },
    reducers: {
        clearUserProfile: (state) => {
            state.profile = null;
            state.loading = false;
            state.error = null;
            saveUserToStorage(null); // Clear from localStorage
        },
        setUserProfile: (state, action) => {
            state.profile = action.payload;
            state.loading = false;
            state.error = null;
            saveUserToStorage(action.payload); // Save to localStorage
        },
        updateUserProfile: (state, action) => {
            state.profile = { ...state.profile, ...action.payload };
            saveUserToStorage(state.profile); // Update localStorage
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.profile = action.payload;
                saveUserToStorage(action.payload); // Save to localStorage
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearUserProfile, setUserProfile, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
