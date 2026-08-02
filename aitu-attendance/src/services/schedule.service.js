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

  // ── Personal weekly sessions (each employee manages their own) ──
  getMySessions: async () => {
    const res = await api.get('/schedule/sessions/my');
    return res?.data || [];
  },

  createSession: async (sessionData) => {
    const res = await api.post('/schedule/sessions', sessionData);
    return res;
  },

  deleteSession: async (id) => {
    const res = await api.delete(`/schedule/sessions/${id}`);
    return res;
  },

  // ── Personal exams (each employee manages their own) ──
  getMyExams: async () => {
    const res = await api.get('/schedule/exams/my');
    return res?.data || [];
  },

  createExam: async (examData) => {
    const res = await api.post('/schedule/exams', examData);
    return res;
  },

  deleteExam: async (id) => {
    const res = await api.delete(`/schedule/exams/${id}`);
    return res;
  },
};

export default scheduleService;