import api from './api';

export const notificationsService = {
  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res?.data || [];
  },

  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res;
  },
};

export default notificationsService;
