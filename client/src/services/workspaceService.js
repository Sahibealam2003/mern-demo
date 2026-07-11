import api from './axiosInstance.js';

const workspaceService = {
  getAll: () =>
    api.get('/workspaces').then((r) => r.data),

  getOne: (id) =>
    api.get(`/workspaces/${id}`).then((r) => r.data),

  create: (data) =>
    api.post('/workspaces', data).then((r) => r.data),

  update: (id, data) =>
    api.put(`/workspaces/${id}`, data).then((r) => r.data),

  remove: (id) =>
    api.delete(`/workspaces/${id}`).then((r) => r.data),

  getStats: (id) =>
    api.get(`/workspaces/${id}/stats`).then((r) => r.data),

  getActivity: (id, params) =>
    api.get(`/workspaces/${id}/activity`, { params }).then((r) => r.data),

  // Members
  invite: (id, data) =>
    api.post(`/workspaces/${id}/invite`, data).then((r) => r.data),

  removeMember: (id, memberId) =>
    api.delete(`/workspaces/${id}/members/${memberId}`).then((r) => r.data),

  updateMemberRole: (id, memberId, data) =>
    api.put(`/workspaces/${id}/members/${memberId}/role`, data).then((r) => r.data),

  leave: (id) =>
    api.post(`/workspaces/${id}/leave`).then((r) => r.data),

  transferOwnership: (id, data) =>
    api.post(`/workspaces/${id}/transfer`, data).then((r) => r.data),

  // Invitations
  getPendingInvitations: () =>
    api.get('/workspaces/invitations/pending').then((r) => r.data),

  acceptInvitation: (token) =>
    api.post(`/workspaces/invitations/${token}/accept`).then((r) => r.data),

  rejectInvitation: (token) =>
    api.post(`/workspaces/invitations/${token}/reject`).then((r) => r.data),
};

export default workspaceService;
