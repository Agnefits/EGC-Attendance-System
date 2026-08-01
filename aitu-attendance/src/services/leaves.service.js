import api from './api';

export const leavesService = {
  getLeaves: async (filters = {}) => {
    const res = await api.get('/leave/requests', filters);
    return res?.data || [];
  },

  getMyLeaves: async () => {
    const res = await api.get('/leave/requests/my');
    return res?.data || [];
  },

  submitLeaveRequest: async (leaveData) => {
    const res = await api.post('/leave/requests', leaveData);
    return res;
  },

  grantLeave: async (grantData) => {
    // POST /leave/grant — admin/HR only, bulk grant to specific employee IDs
    const payload = {
      fromDate: grantData.fromDate,
      toDate: grantData.toDate,
      reason: grantData.reason,
      targetEmployeeIds: grantData.targetEmployeeIds,
    };
    const res = await api.post('/leave/grant', payload);
    return res;
  },

  updateLeaveStatus: async (id, status, rejectionNote = null) => {
    // Backend has a single endpoint: PUT /leave/requests/{id}/approve
    // approved:true = approve, approved:false = reject
    const approved = status === 'approved';
    const res = await api.put(`/leave/requests/${id}/approve`, {
      approved,
      rejectionNote: approved ? null : (rejectionNote || ''),
      note: approved ? null : (rejectionNote || ''),
    });
    return res;
  },
};

export default leavesService;
