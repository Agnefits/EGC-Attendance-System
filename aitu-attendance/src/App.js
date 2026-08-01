import './App.css';
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Reports from './pages/Reports';
import Structure from './pages/Structure';
import AttendanceAdmin from './pages/AttendanceAdmin';
import EmployeeDashboard from './pages/Employeedashboard';
import EmployeeLeaves from './pages/Employeeleaves';
import Permissions from './pages/Permissions';
import HeadDashboard from './pages/Headdashboard';
import HRDashboard from './pages/HrDashboard';
import HrAttendance from './pages/HrAttendance';
import HeadLeaves from './pages/Headleaves';
import HeadPermissions from './pages/Headpermissions';
import { authService } from './services';

const translations = {
  ar: {
    dir: 'rtl',
    systemTitle: 'نظام الحضور والغياب',
    university: 'جامعة أسيوط التكنولوجية الدولية',
    dashboard: 'الصفحة الرئيسية',
    attendance: 'سجل الحضور',
    employees: 'إدارة الموظفين',
    leaves: 'المواعيد الأساسية والمنح',
    reports: 'التقارير والإحصائيات',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    loginBtn: 'دخول',
    wrongCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    totalEmployees: 'إجمالي الموظفين',
    present: 'الحاضرون اليوم',
    absent: 'الغائبون',
    late: 'المتأخرون',
    activeEmployee: 'موظف نشط',
    todayLog: 'سجل الحضور اليومي',
    name: 'الاسم',
    department: 'القسم',
    time: 'وقت الحضور',
    status: 'الحالة',
    present_badge: 'حاضر',
    late_badge: 'متأخر',
    left_badge: 'انصرف',
    absent_badge: 'غائب',
    permissions: 'طلب إذن',
    role_hr: 'موارد بشرية',
    employeeLeaves: 'طلب إجازة',
    headLeaves: 'إجازات القسم',
    headPermissions: 'أذونات القسم',
    role_admin: 'مدير النظام',
    role_head: 'رئيس القسم',
    role_manager: 'مدير قسم',
    role_employee: 'موظف',
  },
  en: {
    dir: 'ltr',
    systemTitle: 'Attendance System',
    university: 'Assiut International Technological University',
    dashboard: 'Home Page',
    attendance: 'Attendance Log',
    employees: 'Manage Employees',
    leaves: 'Schedules & Grants',
    reports: 'Reports & Statistics',
    logout: 'Logout',
    login: 'Login',
    email: 'Email',
    password: 'Password',
    loginBtn: 'Sign In',
    wrongCredentials: 'Wrong email or password',
    totalEmployees: 'Total Employees',
    present: 'Present Today',
    absent: 'Absent',
    late: 'Late',
    activeEmployee: 'Active employees',
    todayLog: "Today's Attendance",
    name: 'Name',
    department: 'Department',
    time: 'Check-in Time',
    status: 'Status',
    present_badge: 'Present',
    late_badge: 'Late',
    left_badge: 'Left',
    absent_badge: 'Absent',
    permissions: 'Permission',
    role_hr: 'HR Manager',
    employeeLeaves: 'Leave Request',
    headLeaves: 'Dept Leaves',
    headPermissions: 'Dept Permissions',
    role_admin: 'System Admin',
    role_head: 'Department Head',
    role_manager: 'Department Manager',
    role_employee: 'Employee',
  }
};

function App() {
  const [lang, setLang] = useState('ar');
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loadingSession, setLoadingSession] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    async function restoreSession() {
      const stored = authService.getStoredUser();
      if (stored) {
        setUser(stored);
        // Refresh profile in background
        try {
          const fresh = await authService.getCurrentUser();
          if (fresh) setUser(fresh);
        } catch (e) {
          // ignore
        }
      }
      setLoadingSession(false);
    }
    restoreSession();
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    setActivePage('dashboard');
  }

  async function handleLogout() {
    await authService.logout();
    setUser(null);
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} lang={lang} setLang={setLang} t={t} />;
  }

  return (
    <div className="app" dir={t.dir}>
      <Header lang={lang} setLang={setLang} t={t} user={user} onLogout={handleLogout} />
      <div className="layout">
        <Sidebar activePage={activePage} setActivePage={setActivePage} t={t} role={user.role} lang={lang} />
        <div className="main">
          {activePage === 'dashboard' && (
            user.role === 'employee' ? <EmployeeDashboard lang={lang} user={user} setActivePage={setActivePage} /> :
              user.role === 'head' ? <HeadDashboard lang={lang} user={user} setActivePage={setActivePage} /> :
                user.role === 'hr' ? <HRDashboard lang={lang} user={user} setActivePage={setActivePage} /> :
                  <Dashboard t={t} lang={lang} user={user} setActivePage={setActivePage} />
          )}
          {activePage === 'attendance' && user.role === 'admin' && <AttendanceAdmin lang={lang} />}
          {activePage === 'attendance' && user.role === 'hr' && <HrAttendance lang={lang} user={user} readOnly={true} />}
          {activePage === 'attendance' && user.role !== 'admin' && user.role !== 'hr' && <Attendance t={t} lang={lang} user={user} />}
          {activePage === 'employees' && <Employees t={t} lang={lang} user={user} showFormDefault={false} />}
          {activePage === 'addEmployee' && <Employees t={t} lang={lang} user={user} showFormDefault={true} />}
          {activePage === 'leaves' && (user.role === 'employee' ? <EmployeeLeaves lang={lang} user={user} /> : <Leaves t={t} lang={lang} user={user} />)}
          {activePage === 'permissions' && <Permissions lang={lang} user={user} />}
          {activePage === 'hrMyAttendance' && <Attendance t={t} lang={lang} user={user} />}
          {activePage === 'hrLeaves' && <EmployeeLeaves lang={lang} user={user} />}
          {activePage === 'hrPermissions' && <Permissions lang={lang} user={user} />}
          {activePage === 'headLeaves' && <HeadLeaves lang={lang} user={user} />}
          {activePage === 'headPermissions' && <HeadPermissions lang={lang} user={user} />}
          {activePage === 'reports' && <Reports t={t} lang={lang} user={user} />}
          {activePage === 'structure' && <Structure lang={lang} t={t} />}
        </div>
      </div>
    </div>
  );
}

export default App;