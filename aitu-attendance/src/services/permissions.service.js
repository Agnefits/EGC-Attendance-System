import api from './api';

export const permissionsService = {
  getPermissions: async (filters = {}) => {
    const res = await api.get('/permissions', filters);
    return res?.data || [];
  },

  getMyPermissions: async () => {
    const res = await api.get('/permissions/my');
    return res?.data || [];
  },

  submitPermissionRequest: async (permData) => {
    const res = await api.post('/permissions/request', permData);
    return res;
  },

  updatePermissionStatus: async (id, status, rejectionNote = null) => {
    const approved = status === 'approved';
    const res = await api.put(`/permissions/${id}/approve`, {
      approved,
      rejectionNote: approved ? null : (rejectionNote || ''),
    });
    return res;
  },
};

export default permissionsService;
