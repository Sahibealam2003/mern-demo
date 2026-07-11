import api from './axiosInstance.js';

const notificationService = {
  getAll: (params) =>
    api.get('/notifications', { params }).then((r) => r.data),

  getUnreadCount: () =>
    api.get('/notifications/unread-count').then((r) => r.data),

  markRead: (id) =>
    api.put(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.put('/notifications/read-all').then((r) => r.data),

  remove: (id) =>
    api.delete(`/notifications/${id}`).then((r) => r.data),

  removeAllRead: () =>
    api.delete('/notifications/read').then((r) => r.data),
};

export default notificationService;
