import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import workspaceReducer from './slices/workspaceSlice.js';
import notificationReducer from './slices/notificationSlice.js';
import uiReducer from './slices/uiSlice.js';

const REDUX_STORE_KEY = '__TODO_APP_REDUX_STORE__';

let storeInstance;

export const getStore = () => {
  if (!storeInstance) {
    storeInstance = configureStore({
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

    if (typeof globalThis !== 'undefined') {
      globalThis[REDUX_STORE_KEY] = storeInstance;
    }
  }

  return storeInstance;
};

export const store = getStore();

export default store;
