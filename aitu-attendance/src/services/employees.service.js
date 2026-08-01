import api from './api';

export const employeesService = {
  getEmployees: async (filters = {}) => {
    const res = await api.get('/employees', filters);
    return res?.data || [];
  },

  getEmployeeById: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res?.data || null;
  },

  createEmployee: async (employeeData) => {
    const res = await api.post('/employees', employeeData);
    return res;
  },

  updateEmployee: async (id, employeeData) => {
    const res = await api.put(`/employees/${id}`, employeeData);
    return res;
  },

  deleteEmployee: async (id) => {
    const res = await api.delete(`/employees/${id}`);
    return res;
  },
};

export default employeesService;
