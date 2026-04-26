import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

// Async thunk to fetch user profile
export const fetchUserProfile = createAsyncThunk(
    'user/fetchUserProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/user/me/");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch profile");
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState: {
        profile: null, // No longer loading from localStorage on init
        loading: false,
        error: null,
    },
    reducers: {
        clearUserProfile: (state) => {
            state.profile = null;
            state.loading = false;
            state.error = null;
        },
        setUserProfile: (state, action) => {
            state.profile = action.payload;
            state.loading = false;
            state.error = null;
        },
        updateUserProfile: (state, action) => {
            state.profile = { ...state.profile, ...action.payload };
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
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearUserProfile, setUserProfile, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
