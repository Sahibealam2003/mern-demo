import api from './axiosInstance.js';

const adminService = {
  getUsers: (params) =>
    api.get('/admin/users', { params }).then((r) => r.data),

  toggleBlockUser: (id, data) =>
    api.put(`/admin/users/${id}/block`, data).then((r) => r.data),

  deleteUser: (id) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),

  getWorkspaces: (params) =>
    api.get('/admin/workspaces', { params }).then((r) => r.data),

  getAnalytics: () =>
    api.get('/admin/analytics').then((r) => r.data),

  getActivities: (params) =>
    api.get('/admin/activities', { params }).then((r) => r.data),
};

export default adminService;
