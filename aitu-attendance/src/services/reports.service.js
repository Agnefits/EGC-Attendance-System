import api from './api';

export const reportsService = {
  getDashboardKpi: async () => {
    const res = await api.get('/dashboard/kpis');
    return res?.data || null;
  },

  getAttendanceReport: async (filters = {}) => {
    const res = await api.get('/reports/attendance', filters);
    return res?.data || null;
  },

  exportAttendanceExcel: async (filters = {}) => {
    const res = await api.get('/reports/export', filters);
    return res;
  },
};

export default reportsService;
