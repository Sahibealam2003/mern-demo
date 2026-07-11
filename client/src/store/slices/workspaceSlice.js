import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import workspaceService from '../../services/workspaceService.js';

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await workspaceService.getAll();
      return data.data.workspaces;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch workspaces');
    }
  }
);

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const data = await workspaceService.getOne(id);
      return data.data.workspace;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch workspace');
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/create',
  async (workspaceData, { rejectWithValue }) => {
    try {
      const data = await workspaceService.create(workspaceData);
      return data.data.workspace;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create workspace');
    }
  }
);

export const updateWorkspace = createAsyncThunk(
  'workspace/update',
  async ({ id, data: updateData }, { rejectWithValue }) => {
    try {
      const data = await workspaceService.update(id, updateData);
      return data.data.workspace;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update workspace');
    }
  }
);

export const deleteWorkspace = createAsyncThunk(
  'workspace/delete',
  async (id, { rejectWithValue }) => {
    try {
      await workspaceService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete workspace');
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: {
    workspaces: [],
    currentWorkspace: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    setCurrentWorkspace(state, action) {
      state.currentWorkspace = action.payload;
    },
    clearWorkspaceError(state) {
      state.error = null;
    },
    updateWorkspaceMembersLocally(state, action) {
      const { workspaceId, members } = action.payload;
      const ws = state.workspaces.find((w) => w._id === workspaceId);
      if (ws) ws.members = members;
      if (state.currentWorkspace?._id === workspaceId) {
        state.currentWorkspace.members = members;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workspaces = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
        const idx = state.workspaces.findIndex((w) => w._id === action.payload._id);
        if (idx !== -1) state.workspaces[idx] = action.payload;
      })

      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.unshift(action.payload);
      })

      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const idx = state.workspaces.findIndex((w) => w._id === action.payload._id);
        if (idx !== -1) state.workspaces[idx] = action.payload;
        if (state.currentWorkspace?._id === action.payload._id) {
          state.currentWorkspace = action.payload;
        }
      })

      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        state.workspaces = state.workspaces.filter((w) => w._id !== action.payload);
        if (state.currentWorkspace?._id === action.payload) {
          state.currentWorkspace = null;
        }
      });
  },
});

export const { setCurrentWorkspace, clearWorkspaceError, updateWorkspaceMembersLocally } = workspaceSlice.actions;

export const selectWorkspaces = (state) => state.workspace.workspaces;
export const selectCurrentWorkspace = (state) => state.workspace.currentWorkspace;
export const selectWorkspaceLoading = (state) => state.workspace.isLoading;

export default workspaceSlice.reducer;
