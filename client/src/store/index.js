import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import workspaceReducer from './slices/workspaceSlice.js';
import notificationReducer from './slices/notificationSlice.js';
import uiReducer from './slices/uiSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    notification: notificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore socket instances stored outside Redux
        ignoredActions: ['auth/login/fulfilled'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
