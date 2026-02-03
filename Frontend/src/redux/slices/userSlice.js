import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';
import { tokenService } from '@/services/tokenService';

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
        profile: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearUserProfile: (state) => {
            state.profile = null;
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

export const { clearUserProfile, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
