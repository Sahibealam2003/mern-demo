import api from './axiosInstance.js';

const dashboardService = {
  getSummary: () =>
    api.get('/dashboard').then((r) => r.data),

  getProductivity: (params) =>
    api.get('/dashboard/productivity', { params }).then((r) => r.data),
};

export default dashboardService;
