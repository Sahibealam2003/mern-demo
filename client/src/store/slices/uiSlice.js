import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: localStorage.getItem('theme') || 'light',
    modalStack: [],   // array of { id, props }
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setTheme(state, action) {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    openModal(state, action) {
      // action.payload = { id, props }
      state.modalStack.push(action.payload);
    },
    closeModal(state, action) {
      // action.payload = id (optional; closes top if omitted)
      if (action.payload) {
        state.modalStack = state.modalStack.filter((m) => m.id !== action.payload);
      } else {
        state.modalStack.pop();
      }
    },
    closeAllModals(state) {
      state.modalStack = [];
    },
  },
});

export const {
  toggleSidebar, setSidebarOpen,
  setTheme,
  openModal, closeModal, closeAllModals,
} = uiSlice.actions;

export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectTheme = (state) => state.ui.theme;
export const selectModalStack = (state) => state.ui.modalStack;
export const selectTopModal = (state) => state.ui.modalStack[state.ui.modalStack.length - 1] ?? null;

export default uiSlice.reducer;
