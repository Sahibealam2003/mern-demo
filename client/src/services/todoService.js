import api from './axiosInstance.js';

const todoService = {
  getAll: (workspaceId, params) =>
    api.get(`/workspaces/${workspaceId}/todos`, { params }).then((r) => r.data),

  getOne: (workspaceId, id) =>
    api.get(`/workspaces/${workspaceId}/todos/${id}`).then((r) => r.data),

  create: (workspaceId, data) =>
    api.post(`/workspaces/${workspaceId}/todos`, data).then((r) => r.data),

  update: (workspaceId, id, data) =>
    api.put(`/workspaces/${workspaceId}/todos/${id}`, data).then((r) => r.data),

  remove: (workspaceId, id) =>
    api.delete(`/workspaces/${workspaceId}/todos/${id}`).then((r) => r.data),

  restore: (workspaceId, id) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/restore`).then((r) => r.data),

  permanentDelete: (workspaceId, id) =>
    api.delete(`/workspaces/${workspaceId}/todos/${id}/permanent`).then((r) => r.data),

  duplicate: (workspaceId, id) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/duplicate`).then((r) => r.data),

  pin: (workspaceId, id) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/pin`).then((r) => r.data),

  favorite: (workspaceId, id) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/favorite`).then((r) => r.data),

  archive: (workspaceId, id, data) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/archive`, data).then((r) => r.data),

  assign: (workspaceId, id, data) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/assign`, data).then((r) => r.data),

  // Checklist
  addChecklistItem: (workspaceId, id, data) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/checklist`, data).then((r) => r.data),

  updateChecklistItem: (workspaceId, id, itemId, data) =>
    api.put(`/workspaces/${workspaceId}/todos/${id}/checklist/${itemId}`, data).then((r) => r.data),

  removeChecklistItem: (workspaceId, id, itemId) =>
    api.delete(`/workspaces/${workspaceId}/todos/${id}/checklist/${itemId}`).then((r) => r.data),

  // Attachments
  uploadAttachment: (workspaceId, id, formData) =>
    api.post(`/workspaces/${workspaceId}/todos/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  removeAttachment: (workspaceId, id, attachmentId) =>
    api.delete(`/workspaces/${workspaceId}/todos/${id}/attachments/${attachmentId}`).then((r) => r.data),
};

export default todoService;
