import { publicApi, api } from './axiosInstance.js';

const authService = {
  register: (data) =>
    publicApi.post('/auth/register', data).then((r) => r.data),

  login: (data) =>
    publicApi.post('/auth/login', data).then((r) => r.data),

  logout: () =>
    api.post('/auth/logout').then((r) => r.data),

  refreshToken: () =>
    publicApi.post('/auth/refresh').then((r) => r.data),

  getMe: () =>
    api.get('/auth/me').then((r) => r.data),

  updateProfile: (data) =>
    api.put('/auth/profile', data).then((r) => r.data),

  uploadAvatar: (formData) =>
    api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  verifyEmail: (token) =>
    publicApi.get(`/auth/verify-email/${token}`).then((r) => r.data),

  resendVerification: () =>
    api.post('/auth/resend-verification').then((r) => r.data),

  forgotPassword: (data) =>
    publicApi.post('/auth/forgot-password', data).then((r) => r.data),

  resetPassword: (token, data) =>
    publicApi.post(`/auth/reset-password/${token}`, data).then((r) => r.data),

  changePassword: (data) =>
    api.post('/auth/change-password', data).then((r) => r.data),
};

export default authService;
