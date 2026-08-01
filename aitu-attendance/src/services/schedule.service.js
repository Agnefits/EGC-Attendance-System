import api from './api';

export const scheduleService = {
  getSchedules: async () => {
    const res = await api.get('/schedule/work');
    return res?.data || [];
  },

  createSchedule: async (scheduleData) => {
    const res = await api.post('/schedule/work', scheduleData);
    return res;
  },

  updateSchedule: async (id, scheduleData) => {
    const res = await api.put(`/schedule/work/${id}`, scheduleData);
    return res;
  },

  deleteSchedule: async (id) => {
    const res = await api.delete(`/schedule/work/${id}`);
    return res;
  },
};

export default scheduleService;
