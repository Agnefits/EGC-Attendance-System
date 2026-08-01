import api from './api';

export const structureService = {
  getColleges: async () => {
    const res = await api.get('/colleges');
    return res?.data || [];
  },

  createCollege: async (collegeData) => {
    const res = await api.post('/colleges', collegeData);
    return res;
  },

  updateCollege: async (id, collegeData) => {
    const res = await api.put(`/colleges/${id}`, collegeData);
    return res;
  },

  deleteCollege: async (id) => {
    const res = await api.delete(`/colleges/${id}`);
    return res;
  },

  getDepartments: async (collegeId = null) => {
    const res = await api.get('/departments', collegeId ? { collegeId } : null);
    return res?.data || [];
  },

  createDepartment: async (deptData) => {
    const res = await api.post('/departments', deptData);
    return res;
  },

  updateDepartment: async (id, deptData) => {
    const res = await api.put(`/departments/${id}`, deptData);
    return res;
  },

  deleteDepartment: async (id) => {
    const res = await api.delete(`/departments/${id}`);
    return res;
  },
};

export default structureService;
