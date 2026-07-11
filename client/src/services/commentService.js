import api from './axiosInstance.js';

const commentService = {
  getAll: (workspaceId, todoId, params) =>
    api.get(`/workspaces/${workspaceId}/todos/${todoId}/comments`, { params }).then((r) => r.data),

  create: (workspaceId, todoId, data) =>
    api.post(`/workspaces/${workspaceId}/todos/${todoId}/comments`, data).then((r) => r.data),

  update: (workspaceId, todoId, id, data) =>
    api.put(`/workspaces/${workspaceId}/todos/${todoId}/comments/${id}`, data).then((r) => r.data),

  remove: (workspaceId, todoId, id) =>
    api.delete(`/workspaces/${workspaceId}/todos/${todoId}/comments/${id}`).then((r) => r.data),

  toggleReaction: (workspaceId, todoId, id, data) =>
    api.post(`/workspaces/${workspaceId}/todos/${todoId}/comments/${id}/reactions`, data).then((r) => r.data),
};

export default commentService;
