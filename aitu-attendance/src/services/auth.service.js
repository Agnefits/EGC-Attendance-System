import api, { setToken, setStoredUserData, clearAuth, getStoredUserData, getToken } from './api';

function normalizeRole(role) {
  if (role === null || role === undefined) return 'employee';
  if (role === 1 || role === '1' || String(role).toLowerCase() === 'admin') return 'admin';
  if (role === 2 || role === '2' || String(role).toLowerCase() === 'hr') return 'hr';
  if (role === 3 || role === '3' || String(role).toLowerCase() === 'head') return 'head';
  if (role === 4 || role === '4' || String(role).toLowerCase() === 'employee') return 'employee';
  return String(role).toLowerCase();
}

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res?.success && res?.data) {
      const { token, ...userData } = res.data;
      const authToken = token || res.data.Token;
      setToken(authToken);
      
      // Fetch full user profile to get departmentId and collegeId
      try {
        const profileRes = await api.get('/auth/me');
        if (profileRes?.success && profileRes?.data) {
          const meData = profileRes.data;
          const normalizedUser = {
            id: meData.id,
            email: meData.email,
            role: normalizeRole(meData.role),
            employeeId: meData.employee?.id || meData.employeeId || userData.employeeId,
            name: meData.employee?.name || meData.employeeName || userData.employeeName || meData.email,
            nameEn: meData.employee?.nameEn,
            department: meData.employee?.department || userData.department,
            college: meData.employee?.college || userData.college,
            departmentId: meData.employee?.departmentId || meData.departmentId,
            collegeId: meData.employee?.collegeId || meData.collegeId,
            type: meData.employee?.type,
            roleClassification: meData.employee?.roleClassification,
          };
          setStoredUserData(normalizedUser);
          return normalizedUser;
        }
      } catch (err) {
        console.warn('Could not fetch full profile post login, using login payload', err);
      }

      const normalizedUser = {
        id: userData.userId || userData.UserId,
        email: userData.email || userData.Email,
        role: normalizeRole(userData.role || userData.Role),
        employeeId: userData.employeeId || userData.EmployeeId,
        name: userData.employeeName || userData.EmployeeName || userData.Email,
        department: userData.department || userData.Department,
        college: userData.college || userData.College,
      };
      setStoredUserData(normalizedUser);
      return normalizedUser;
    }
    throw new Error(res?.message || 'Login failed');
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      clearAuth();
    }
  },

  getCurrentUser: async () => {
    if (!getToken()) return null;
    try {
      const res = await api.get('/auth/me');
      if (res?.success && res?.data) {
        const meData = res.data;
        const normalizedUser = {
          id: meData.id,
          email: meData.email,
          role: normalizeRole(meData.role),
          employeeId: meData.employee?.id || meData.employeeId,
          name: meData.employee?.name || meData.employeeName || meData.email,
          nameEn: meData.employee?.nameEn,
          department: meData.employee?.department,
          college: meData.employee?.college,
          departmentId: meData.employee?.departmentId || meData.departmentId,
          collegeId: meData.employee?.collegeId || meData.collegeId,
          type: meData.employee?.type,
          roleClassification: meData.employee?.roleClassification,
        };
        setStoredUserData(normalizedUser);
        return normalizedUser;
      }
    } catch (e) {
      console.error('Session restore failed', e);
      clearAuth();
    }
    return null;
  },

  getStoredUser: () => getStoredUserData(),
};

export default authService;
