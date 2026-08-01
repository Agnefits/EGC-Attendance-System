import api from './api';

export const attendanceService = {
  getTodayAttendance: async (departmentId = null) => {
    const res = await api.get('/attendance/today', departmentId ? { departmentId } : null);
    return res?.data || null;
  },

  getAttendanceLogs: async (filters = {}) => {
    const res = await api.get('/attendance', filters);
    return res?.data || [];
  },

  getMyAttendance: async () => {
    const res = await api.get('/attendance/my');
    return res?.data || [];
  },

  checkIn: async ({ latitude, longitude, gpsAccuracy, resolutionMethod }) => {
    const res = await api.post('/attendance/checkin', {
      latitude,
      longitude,
      gpsAccuracy,
      resolutionMethod
    });
    return res;
  },

  checkOut: async (attendanceId) => {
    const res = await api.put(`/attendance/checkout/${attendanceId}`);
    return res;
  },
};

export default attendanceService;
