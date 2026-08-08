import useNotifications from './useNotifications';
import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService, employeesService, structureService, leavesService, permissionsService } from '../services';

const SM = {
  present: { l: { ar: 'حاضر', en: 'Present' }, c: '#166534', bg: '#DCFCE7', bd: '#BBF7D0' },
  late: { l: { ar: 'متأخر', en: 'Late' }, c: '#B45309', bg: '#FEF3C7', bd: '#FDE68A' },
  left: { l: { ar: 'انصرف', en: 'Left' }, c: '#1565C0', bg: '#DBEAFE', bd: '#BFDBFE' },
  absent: { l: { ar: 'غائب', en: 'Absent' }, c: '#991B1B', bg: '#FEE2E2', bd: '#FECACA' },
};

function Modal({ open, onClose, lang, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '900px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: 'Cairo,sans-serif', boxShadow: '0 32px 80px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{title}</span>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontFamily: 'Cairo', fontWeight: '700' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export default function HrDashboard({ lang, user, setActivePage }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const { notifs: NOTIFS, unread: notifUnread } = useNotifications({ user, lang });
  const [time, setTime] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = React.useRef(null);

  // 🔴 State for API data
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [permsList, setPermsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAttModal, setShowAttModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  React.useEffect(() => {
    const fn = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // 🔴 Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empData, attData, deptData, colData, leaveData, permData] = await Promise.all([
        employeesService.getEmployees().catch(() => []),
        attendanceService.getAttendanceLogs().catch(() => []),
        structureService.getDepartments().catch(() => []),
        structureService.getColleges().catch(() => []),
        leavesService.getLeaves().catch(() => []),
        permissionsService.getPermissions().catch(() => [])
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setAttendance(Array.isArray(attData) ? attData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setColleges(Array.isArray(colData) ? colData : []);
      // Normalize leave data
      const normalizedLeaves = Array.isArray(leaveData) ? leaveData.map(l => ({
        ...l,
        employeeId: l.employeeId ?? l.EmployeeId ?? '',
        type: l.leaveTypeId ?? l.LeaveTypeId ?? l.type ?? '',
        from: l.fromDate ?? l.FromDate ?? l.from ?? '',
        to: l.toDate ?? l.ToDate ?? l.to ?? '',
        days: l.daysCount ?? l.DaysCount ?? l.days ?? 0,
        status: String(l.status ?? l.Status ?? 'pending').toLowerCase(),
      })) : [];
      setLeavesList(normalizedLeaves);
      // Normalize permission data
      const normalizedPerms = Array.isArray(permData) ? permData.map(p => ({
        ...p,
        employeeId: p.employeeId ?? p.EmployeeId ?? '',
        type: p.permissionType ?? p.PermissionType ?? p.type ?? '',
        duration: p.durationMinutes ?? p.DurationMinutes ?? p.duration ?? 0,
        status: String(p.status ?? p.Status ?? 'pending').toLowerCase(),
      })) : [];
      setPermsList(normalizedPerms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })), 1000);
    setTime(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    return () => clearInterval(t);
  }, [lang]);

  /* ── Data ── */
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter(a => a.date === today);
  const totalEmps = employees.length;
  const maleEmps = employees.filter(e => e.gender === 'male' || e.gender === 1 || String(e.gender).toLowerCase() === 'male').length;
  const femaleEmps = employees.filter(e => e.gender === 'female' || e.gender === 2 || String(e.gender).toLowerCase() === 'female').length;
  const academicEmps = employees.filter(e => e.type === 'academic' || e.type === 1 || String(e.type).toLowerCase() === 'academic').length;
  const adminEmps = employees.filter(e => e.type === 'administrative' || e.type === 2 || String(e.type).toLowerCase() === 'administrative').length;

  const total = attendance.length || 1;
  const present = attendance.filter(a => a.status === 'present' || a.status === 'left').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.status === 'late').length;
  const leftC = attendance.filter(a => a.status === 'left').length;
  const attPct = Math.round(present / total * 100);

  const todayPresent = todayAtt.filter(a => a.status === 'present' || a.status === 'left').length;
  const todayAbsent = todayAtt.filter(a => a.status === 'absent').length;
  const todayLate = todayAtt.filter(a => a.status === 'late').length;

  const pendingLeaves = leavesList.filter(l => l.status === 'pending');
  const approvedLeaves = leavesList.filter(l => l.status === 'approved').length;
  const pendingPerms = permsList.filter(p => p.status === 'pending');

  const deptStats = departments.map(d => {
    const emps = employees.filter(e => e.departmentId === d.id || e.department === d.name);
    const atts = attendance.filter(a => emps.find(e => e.id === a.employeeId));
    const p = atts.filter(a => a.status === 'present' || a.status === 'left').length;
    return { ...d, count: emps.length, present: p, pct: atts.length ? Math.round(p / atts.length * 100) : 0 };
  }).filter(d => d.count > 0).sort((a, b) => b.pct - a.pct);

  const barC = p => p >= 80 ? '#16A34A' : p >= 60 ? '#D97706' : '#DC2626';
  const card = { background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', boxShadow: '0 2px 8px rgba(0,0,0,.04)' };
  const thS = { background: '#F8FAFC', padding: '11px 16px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
  const tdS = (x = {}) => ({ padding: '11px 16px', borderBottom: '1px solid #F8FAFC', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', ...x });

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Cairo,sans-serif', color: '#94A3B8' }}>
        {lang === 'ar' ? 'جاري تحميل البيانات...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="page-pad" style={{ fontFamily: 'Cairo,sans-serif', direction: dir, background: '#F1F5F9', minHeight: '100%' }}>
      {/* ══ HERO ══ */}
      <div style={{ borderRadius: '16px', marginBottom: '18px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(13,59,122,.15)' }}>
        <div style={{ background: 'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)', padding: '20px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: 'white', flexShrink: 0 }}>
              {(lang === 'en' ? user?.nameEn : user?.name)?.charAt(0) || 'H'}
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.55)', marginBottom: '3px' }}>{lang === 'ar' ? 'مرحباً بك في لوحة الموارد البشرية' : 'Welcome to HR Dashboard'}</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>{lang === 'en' ? user?.nameEn : user?.name}</div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.9)', border: '1px solid rgba(255,255,255,.2)', padding: '2px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: '600' }}>{lang === 'ar' ? 'موارد بشرية' : 'HR Manager'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '3px', letterSpacing: '.5px' }}>{lang === 'ar' ? 'الوقت' : 'TIME'}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', direction: 'ltr', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{time}</div>
            </div>
            <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,.2)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '3px', letterSpacing: '.5px' }}>{lang === 'ar' ? 'اليوم' : 'TODAY'}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            </div>
            <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,.2)' }} />
            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotif(p => !p)}
                style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all .15s', position: 'relative' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}>
                🔔
                {notifUnread > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '17px', height: '17px', borderRadius: '50%', background: '#DC2626', color: 'white', fontSize: '9px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1565C0' }}>
                    {notifUnread}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="notif-popup" style={{ top: '130px', [lang === 'ar' ? 'left' : 'right']: '16px', direction: dir }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFBFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                    <button onClick={() => setShowNotif(false)}
                      style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontSize: '12px', color: '#475569', fontFamily: 'Cairo', fontWeight: '700', transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}>✕</button>
                  </div>
                  {pendingLeaves.length > 0 && (
                    <div onClick={() => { setShowNotif(false); setShowLeaveModal(true); }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', background: '#FFFBEB', transition: 'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
                      onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📅</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#B45309' }}>{lang === 'ar' ? 'إجازات تنتظر الموافقة' : 'Leaves Awaiting Approval'}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{pendingLeaves.length} {lang === 'ar' ? 'طلب معلق' : 'pending requests'}</div>
                      </div>
                    </div>
                  )}
                  {pendingPerms.length > 0 && (
                    <div onClick={() => setShowNotif(false)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', transition: 'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🔖</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B21A8' }}>{lang === 'ar' ? 'أذونات تنتظر الموافقة' : 'Permissions Awaiting Approval'}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{pendingPerms.length} {lang === 'ar' ? 'طلب معلق' : 'pending requests'}</div>
                      </div>
                    </div>
                  )}
                  {pendingLeaves.length === 0 && pendingPerms.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>{lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Stats strip */}
        <div className="rg-6 stat-stripe" style={{ background: 'white' }}>
          {(() => {
            const hrAtt = attendance.filter(a => a.employeeId === user?.employeeId);
            const hrPres = hrAtt.filter(a => a.status === 'present' || a.status === 'left').length;
            const hrPct = hrAtt.length ? Math.round(hrPres / hrAtt.length * 100) : 0;
            const hrC = hrPct >= 80 ? '#166534' : hrPct >= 60 ? '#B45309' : '#991B1B';
            return [
              { v: totalEmps, l: { ar: 'إجمالي الموظفين', en: 'Employees' }, c: '#1565C0', bg: '#EFF6FF', onClick: () => setShowEmpModal(true) },
              { v: todayPresent, l: { ar: 'حاضر اليوم', en: 'Present' }, c: '#166534', bg: '#F0FDF4', onClick: () => setShowAttModal(true) },
              { v: todayLate, l: { ar: 'متأخر اليوم', en: 'Late' }, c: '#B45309', bg: '#FFFBEB', onClick: () => setShowAttModal(true) },
              { v: todayAbsent, l: { ar: 'غائب اليوم', en: 'Absent' }, c: '#991B1B', bg: '#FEF2F2', onClick: () => setShowAttModal(true) },
              { v: pendingLeaves.length, l: { ar: 'إجازات معلقة', en: 'Pending' }, c: '#6B21A8', bg: '#F5F3FF', onClick: () => setShowLeaveModal(true) },
              { v: `${hrPct}%`, l: { ar: 'حضوري', en: 'My Rate' }, c: hrC, bg: '#F8FAFC', onClick: () => setActivePage('hrMyAttendance') },
            ].map((s, i) => (
              <div key={i} onClick={s.onClick}
                style={{ textAlign: 'center', padding: '14px 8px', borderInlineEnd: i < 5 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = s.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '26px', fontWeight: '900', color: s.c, lineHeight: 1, marginBottom: '4px' }}>{s.v}</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>{s.l[lang]}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <div className="rg-3" style={{ marginBottom: '18px' }}>
        {[
          { icon: '👤', l: { ar: 'إضافة موظف', en: 'Add Employee' }, c: '#166534', bg: '#DCFCE7', bd: '#BBF7D0', page: 'addEmployee' },
          { icon: '📋', l: { ar: 'سجل الحضور', en: 'Attendance Log' }, c: '#1565C0', bg: '#DBEAFE', bd: '#BFDBFE', page: 'attendance' },
          { icon: '📊', l: { ar: 'التقارير', en: 'Reports' }, c: '#6B21A8', bg: '#EDE9FE', bd: '#DDD6FE', page: 'reports' },
          { icon: '👥', l: { ar: 'إدارة الموظفين', en: 'Employees' }, c: '#B45309', bg: '#FEF3C7', bd: '#FDE68A', page: 'employees' },
          { icon: '🌴', l: { ar: 'إجازاتي', en: 'My Leaves' }, c: '#BE185D', bg: '#FCE7F3', bd: '#FBCFE8', page: 'hrLeaves' },
          { icon: '🔖', l: { ar: 'أذوناتي', en: 'My Permissions' }, c: '#0891B2', bg: '#CFFAFE', bd: '#A5F3FC', page: 'hrPermissions' },
        ].map((a, i) => (
          <div key={i} onClick={() => setActivePage(a.page)}
            style={{ ...card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all .2s', borderInlineStart: `3px solid ${a.c}` }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${a.bd}66`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'; }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: a.bg, border: `1px solid ${a.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{a.icon}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: a.c }}>{a.l[lang]}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{lang === 'ar' ? 'اضغط للانتقال' : 'Tap to go'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ MAIN GRID ══ */}
      <div className="rg-aside" style={{ marginBottom: '18px' }}>

        {/* Attendance donut */}
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
            {lang === 'ar' ? 'نسبة الحضور الكلية' : 'Overall Attendance'}
          </div>
          {(() => {
            const R = 54, C = 2 * Math.PI * R;
            const sl = [{ v: present, c: '#16A34A' }, { v: late, c: '#D97706' }, { v: absent, c: '#DC2626' }, { v: leftC, c: '#1565C0' }];
            let cum = 0;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div style={{ position: 'relative', width: '124px', height: '124px' }}>
                  <svg width="124" height="124">
                    <circle cx="62" cy="62" r={R} fill="none" stroke="#F1F5F9" strokeWidth="13" />
                    {sl.map((s, i) => { const p = s.v / total, d = C * p, o = C / 4 - C * cum; cum += p; return s.v > 0 && <circle key={i} cx="62" cy="62" r={R} fill="none" stroke={s.c} strokeWidth="13" strokeDasharray={`${Math.max(d - 2, 0)} ${C}`} strokeDashoffset={o} style={{ transition: 'all 1.2s' }} />; })}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: barC(attPct), lineHeight: 1 }}>{attPct}%</span>
                    <span style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>{lang === 'ar' ? 'حضور' : 'rate'}</span>
                  </div>
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {[
                    { v: present, c: '#16A34A', l: { ar: 'حاضر', en: 'Present' } },
                    { v: late, c: '#D97706', l: { ar: 'متأخر', en: 'Late' } },
                    { v: absent, c: '#DC2626', l: { ar: 'غائب', en: 'Absent' } },
                    { v: leftC, c: '#1565C0', l: { ar: 'انصرف', en: 'Left' } },
                  ].map(s => {
                    const p = total ? Math.round(s.v / total * 100) : 0;
                    return (
                      <div key={s.l.ar} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.c, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600', minWidth: '42px' }}>{s.l[lang]}</span>
                        <div style={{ flex: 1, background: '#F1F5F9', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${p}%`, background: s.c, height: '100%', borderRadius: '999px', transition: 'width 1s' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: s.c, minWidth: '18px' }}>{s.v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: workforce + dept */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Workforce */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
              {lang === 'ar' ? 'تركيبة الموظفين' : 'Workforce Composition'}
            </div>
            <div className="rg-4" style={{ gap: '10px' }}>
              {[
                { l: { ar: 'رجل', en: 'Male' }, v: maleEmps, pct: Math.round(maleEmps / totalEmps * 100), c: '#1565C0', bg: '#DBEAFE', bd: '#BFDBFE' },
                { l: { ar: 'أنثى', en: 'Female' }, v: femaleEmps, pct: Math.round(femaleEmps / totalEmps * 100), c: '#BE185D', bg: '#FCE7F3', bd: '#FBCFE8' },
                { l: { ar: 'أكاديمي', en: 'Academic' }, v: academicEmps, pct: Math.round(academicEmps / totalEmps * 100), c: '#6B21A8', bg: '#EDE9FE', bd: '#DDD6FE' },
                { l: { ar: 'إداري', en: 'Admin' }, v: adminEmps, pct: Math.round(adminEmps / totalEmps * 100), c: '#B45309', bg: '#FEF3C7', bd: '#FDE68A' },
              ].map(g => (
                <div key={g.l.ar} style={{ background: g.bg, borderRadius: '12px', padding: '14px', border: `1px solid ${g.bd}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: g.c, lineHeight: 1 }}>{g.v}</div>
                  <div style={{ fontSize: '12px', color: g.c, fontWeight: '700', marginTop: '4px' }}>{g.l[lang]}</div>
                  <div style={{ fontSize: '13px', color: g.c, opacity: .7, marginTop: '2px' }}>{g.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dept attendance donut cards */}
          <div style={{ ...card, padding: '18px 20px', flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{lang === 'ar' ? 'حضور الأقسام' : 'Dept Attendance'}</span>
              <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>{deptStats.length} {lang === 'ar' ? 'قسم' : 'depts'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '10px' }}>
              {deptStats.map(d => {
                const R2 = 32, C2 = 2 * Math.PI * R2;
                const col = colleges.find(c => c.id === d.collegeId);
                const slices = [{ v: d.present, color: '#16A34A' }, { v: d.count - d.present, color: '#DC2626' }];
                let cum2 = 0;
                const pc = barC(d.pct);
                return (
                  <div key={d.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '12px', border: `1px solid ${pc}22`, background: 'white', transition: 'all .2s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 14px ${pc}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ position: 'relative', width: '72px', height: '72px' }}>
                      <svg width="72" height="72">
                        <circle cx="36" cy="36" r={R2} fill="none" stroke="#F1F5F9" strokeWidth="8" />
                        {d.count > 0 && slices.map((sl, i) => {
                          const p = sl.v / (d.count || 1), dash = C2 * p;
                          const offset = C2 / 4 - C2 * cum2; cum2 += p;
                          return sl.v > 0 && (
                            <circle key={i} cx="36" cy="36" r={R2} fill="none" stroke={sl.color} strokeWidth="8"
                              strokeDasharray={`${Math.max(dash - 2, 0)} ${C2}`} strokeDashoffset={offset}
                              style={{ transition: 'all 1.2s ease' }} />
                          );
                        })}
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: pc, lineHeight: 1 }}>{d.pct}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? d.nameEn : d.name}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? col?.nameEn : col?.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '999px', fontWeight: '700' }}>{d.present}</span>
                      <span style={{ fontSize: '12px', background: '#FEE2E2', color: '#991B1B', padding: '1px 6px', borderRadius: '999px', fontWeight: '700' }}>{d.count - d.present}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ ROW 3: Alerts + Leave donut ══ */}
      <div className="rg-2-stack" style={{ gap: '16px', marginBottom: '18px', marginTop: '18px' }}>

        {/* 1. Smart Alerts */}
        {(() => {
          const alerts = [];
          // Employees absent 2+ consecutive records
          employees.forEach(emp => {
            const empAtt = attendance.filter(a => a.employeeId === emp.id).sort((a, b) => b.date.localeCompare(a.date));
            let consec = 0;
            for (const a of empAtt) { if (a.status === 'absent') consec++; else break; }
            if (consec >= 2) alerts.push({ type: 'absent', emp, consec, c: '#991B1B', bg: '#FEE2E2', bd: '#FECACA', icon: '⚠️' });
          });
          // Leaves ending soon (within 3 days)
          const today2 = new Date(); const in3 = new Date(); in3.setDate(in3.getDate() + 3);
          leavesList.filter(l => l.status === 'approved').forEach(l => {
            const end = new Date(l.to);
            if (end >= today2 && end <= in3) {
              const emp = employees.find(e => e.id === l.employeeId);
              alerts.push({ type: 'leave_end', emp, l, c: '#B45309', bg: '#FEF3C7', bd: '#FDE68A', icon: '📅' });
            }
          });
          // Perms over 180 min this month
          const thisM = new Date().toISOString().slice(0, 7);
          employees.forEach(emp => {
            const used = permsList.filter(p => p.employeeId === emp.id && p.date?.startsWith(thisM) && p.status === 'approved').reduce((s, p) => s + (p.duration || 0), 0);
            if (used > 180) alerts.push({ type: 'perm', emp, used, c: '#6B21A8', bg: '#EDE9FE', bd: '#DDD6FE', icon: '🔖' });
          });
          return (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>🔔 {lang === 'ar' ? 'تنبيهات ذكية' : 'Smart Alerts'}</span>
                <span style={{ background: alerts.length > 0 ? '#FEE2E2' : '#DCFCE7', color: alerts.length > 0 ? '#DC2626' : '#166534', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', border: `1px solid ${alerts.length > 0 ? '#FECACA' : '#BBF7D0'}` }}>{alerts.length}</span>
              </div>
              {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{lang === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}</div>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
                    {alerts.map((al, i) => (
                      <div key={i} style={{ padding: '10px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', background: 'white', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = al.bg}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: al.bg, border: `1px solid ${al.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{al.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: al.c }}>
                            {al.type === 'absent' && `${lang === 'en' ? al.emp?.nameEn : al.emp?.name} — ${lang === 'ar' ? `غياب ${al.consec} أيام متتالية` : `Absent ${al.consec} consecutive days`}`}
                            {al.type === 'leave_end' && `${lang === 'en' ? al.emp?.nameEn : al.emp?.name} — ${lang === 'ar' ? `إجازة تنتهي ${al.l.to}` : `Leave ends ${al.l.to}`}`}
                            {al.type === 'perm' && `${lang === 'en' ? al.emp?.nameEn : al.emp?.name} — ${lang === 'ar' ? `تجاوز ${al.used} د أذونات` : `${al.used} min permissions used`}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Summary stats */}
                  <div style={{ padding: '10px 18px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(() => {
                      const thisM3 = new Date().toISOString().slice(0, 7);
                      const mAbsent = attendance.filter(a => a.status === 'absent' && a.date?.startsWith(thisM3)).length;
                      const worstDept = deptStats.sort((a, b) => a.pct - b.pct)[0];
                      return (
                        <>
                          <div style={{ textAlign: 'center', padding: '8px', background: 'white', borderRadius: '9px', border: '1px solid #FEE2E2' }}>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#DC2626' }}>{mAbsent}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{lang === 'ar' ? 'غياب هذا الشهر' : 'Absences this month'}</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '8px', background: 'white', borderRadius: '9px', border: '1px solid #FDE68A' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#B45309', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? worstDept?.nameEn : worstDept?.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{lang === 'ar' ? 'أقل حضوراً' : 'Lowest attendance'} {worstDept?.pct}%</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* 2. Leave type donut */}
        {(() => {
          const thisM2 = new Date().toISOString().slice(0, 7);
          const mLeaves = leavesList.filter(l => l.from?.startsWith(thisM2));
          const types = [
            { id: 'annual', l: { ar: 'اعتيادي', en: 'Annual' }, c: '#1565C0' },
            { id: 'sick', l: { ar: 'مرضية', en: 'Sick' }, c: '#991B1B' },
            { id: 'urgent', l: { ar: 'عارضة', en: 'Urgent' }, c: '#B45309' },
            { id: 'maternity', l: { ar: 'وضع', en: 'Maternity' }, c: '#BE185D' },
            { id: 'grant', l: { ar: 'منحة', en: 'Grant' }, c: '#166534' },
          ];
          const tot2 = mLeaves.length || 1;
          const R3 = 46, C3 = 2 * Math.PI * R3;
          let cum3 = 0;
          return (
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                📋 {lang === 'ar' ? 'إجازات الشهر الحالي' : 'This Month Leaves'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <svg width="100" height="100">
                    <circle cx="50" cy="50" r={R3} fill="none" stroke="#F1F5F9" strokeWidth="10" />
                    {types.map((t, i) => {
                      const v = mLeaves.filter(l => l.type === t.id).length;
                      const p = v / tot2, dash = C3 * p;
                      const offset = C3 / 4 - C3 * cum3; cum3 += p;
                      return v > 0 && <circle key={i} cx="50" cy="50" r={R3} fill="none" stroke={t.c} strokeWidth="10"
                        strokeDasharray={`${Math.max(dash - 2, 0)} ${C3}`} strokeDashoffset={offset}
                        style={{ transition: 'all 1.2s' }} />;
                    })}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', lineHeight: 1 }}>{mLeaves.length}</span>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>{lang === 'ar' ? 'إجازة' : 'leaves'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {types.map(t => {
                  const v = mLeaves.filter(l => l.type === t.id).length;
                  if (!v) return null;
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: t.c, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600', flex: 1 }}>{t.l[lang]}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: t.c }}>{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══ ROW 4: Monthly chart + new employees + on leave today ══ */}
      <div className="rg-3-right" style={{ gap: '16px', marginBottom: '18px' }}>

        {/* 4. Monthly attendance chart */}
        {(() => {
          const months = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - 5 + i);
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const mAtt = attendance.filter(a => a.date?.startsWith(m));
            const mPres = mAtt.filter(a => a.status === 'present' || a.status === 'left').length;
            const pct = mAtt.length ? Math.round(mPres / mAtt.length * 100) : 0;
            return { m, label: d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' }), pct };
          });
          return (
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📈 {lang === 'ar' ? 'معدل الحضور الشهري (آخر 6 أشهر)' : 'Monthly Attendance Rate'}</span>
                <span style={{ fontSize: '13px', background: '#EFF6FF', color: '#1565C0', padding: '3px 10px', borderRadius: '999px', fontWeight: '700', border: '1px solid #BFDBFE' }}>
                  {lang === 'ar' ? 'الهدف: 80%' : 'Target: 80%'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingTop: '24px', position: 'relative' }}>
                {/* Goal line at 80% */}
                <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, height: '1.5px', background: '#BFDBFE', borderTop: '1.5px dashed #1565C0', marginTop: `${(1 - 0.8) * 86}px`, zIndex: 1, pointerEvents: 'none' }} />
                {months.map((m, i) => {
                  const isLast = i === months.length - 1;
                  const grad = m.pct >= 80 ? 'linear-gradient(180deg,#4ADE80,#16A34A)' : m.pct >= 60 ? 'linear-gradient(180deg,#FCD34D,#D97706)' : m.pct > 0 ? 'linear-gradient(180deg,#F87171,#DC2626)' : null;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {m.pct > 0
                        ? <span style={{ fontSize: '12px', fontWeight: '800', color: barC(m.pct) }}>{m.pct}%</span>
                        : <span style={{ fontSize: '12px', color: '#CBD5E1' }}>—</span>
                      }
                      <div style={{ width: '100%', background: '#F1F5F9', borderRadius: '6px', height: '72px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                        outline: isLast ? '2px solid #1565C0' : 'none', outlineOffset: '1px' }}>
                        {grad && <div style={{ width: '100%', background: grad, height: `${m.pct}%`, borderRadius: '4px', transition: 'height 1s ease', minHeight: '4px' }} />}
                      </div>
                      <span style={{ fontSize: '12px', color: isLast ? '#1565C0' : '#64748B', fontWeight: isLast ? '800' : '600' }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Summary */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', alignItems: 'center' }}>
                {(() => {
                  const valid = months.filter(m => m.pct > 0);
                  const avg = Math.round(valid.reduce((s, m) => s + m.pct, 0) / (valid.length || 1));
                  const best = valid.reduce((a, b) => a.pct > b.pct ? a : b, { pct: 0, label: '—' });
                  const worst = valid.reduce((a, b) => a.pct < b.pct ? a : b, { pct: 100, label: '—' });
                  const trend = valid.length >= 2 ? valid[valid.length - 1].pct - valid[valid.length - 2].pct : 0;
                  return (
                    <>
                      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                        {lang === 'ar' ? 'متوسط:' : 'Avg:'} <strong style={{ color: barC(avg) }}>{avg}%</strong>
                      </span>
                      <span style={{ fontSize: '13px', color: '#166534', fontWeight: '700', background: '#DCFCE7', padding: '2px 8px', borderRadius: '999px' }}>
                        ↑ {best.label} {best.pct}%
                      </span>
                      <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: '700', background: '#FEE2E2', padding: '2px 8px', borderRadius: '999px' }}>
                        ↓ {worst.label} {worst.pct}%
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', marginRight: 'auto',
                        color: trend > 0 ? '#166534' : trend < 0 ? '#991B1B' : '#64748B' }}>
                        {trend > 0 ? '↗' : '↘'} {lang === 'ar' ? 'مقارنة بالشهر السابق' : 'vs last month'} {trend > 0 ? '+' : ''}{trend}%
                      </span>
                    </>
                  );
                })()}
                <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginRight: 'auto' }}>
                  <span style={{ width: '14px', height: '2px', borderTop: '1.5px dashed #1565C0', display: 'inline-block' }} />
                  <span style={{ color: '#1565C0', fontWeight: '600' }}>{lang === 'ar' ? 'الهدف 80%' : '80% Target'}</span>
                </span>
              </div>
            </div>
          );
        })()}

        {/* 3. Latest added employees */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>🆕 {lang === 'ar' ? 'آخر الموظفين' : 'Latest Employees'}</span>
            <button onClick={() => setActivePage('employees')}
              style={{ fontSize: '13px', color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: '700' }}>
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
          </div>
          <div>
            {[...employees].slice(-5).reverse().map((emp, i) => {
              const dept = departments.find(d => d.id === emp.departmentId);
              return (
                <div key={emp.id} style={{ padding: '10px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#1565C0,#1E88E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>
                    {(lang === 'en' ? emp.nameEn : emp.name)?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? emp.nameEn : emp.name}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? dept?.nameEn : dept?.name}</div>
                  </div>
                  <span style={{ fontSize: '12px', background: emp.type === 'academic' ? '#EDE9FE' : '#FEF3C7', color: emp.type === 'academic' ? '#6B21A8' : '#B45309', padding: '2px 7px', borderRadius: '999px', fontWeight: '700', flexShrink: 0 }}>
                    {lang === 'ar' ? (emp.type === 'academic' ? 'أكاديمي' : 'إداري') : (emp.type === 'academic' ? 'Acad' : 'Admin')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. On leave today */}
        {(() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const onLeave = leavesList.filter(l => l.status === 'approved' && l.from <= todayStr && l.to >= todayStr);
          return (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>🌴 {lang === 'ar' ? 'في إجازة اليوم' : 'On Leave Today'}</span>
                <span style={{ marginRight: '8px', marginLeft: '8px', background: '#DBEAFE', color: '#1565C0', padding: '2px 8px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: '1px solid #BFDBFE' }}>{onLeave.length}</span>
              </div>
              {onLeave.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{lang === 'ar' ? 'لا أحد في إجازة' : 'No one on leave'}</div>
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
                  {onLeave.map((l, i) => {
                    const emp = employees.find(e => e.id === l.employeeId);
                    return (
                      <div key={l.id} style={{ padding: '9px 16px', borderBottom: '1px solid #F8FAFC', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', direction: 'ltr', marginTop: '1px' }}>{l.from} → {l.to}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ══ BOTTOM GRID ══ */}
      <div className="rg-2-stack" style={{ gap: '16px' }}>

        {/* Pending leaves */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>📅 {lang === 'ar' ? 'الإجازات المعلقة' : 'Pending Leaves'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', border: '1px solid #FDE68A' }}>{pendingLeaves.length}</span>
              <button onClick={() => setActivePage('attendance')}
                style={{ fontSize: '13px', color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: '700' }}>
                {lang === 'ar' ? 'عرض الكل' : 'View All'}
              </button>
            </div>
          </div>
          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{lang === 'ar' ? 'لا توجد إجازات معلقة' : 'No pending leaves'}</div>
            </div>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
              {pendingLeaves.slice(0, 8).map(l => {
                const emp = employees.find(e => e.id === l.employeeId);
                return (
                  <div key={l.id} style={{ padding: '11px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                      <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '1px', direction: 'ltr' }}>{l.from} → {l.to}</div>
                    </div>
                    <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 9px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' }}>{lang === 'ar' ? 'معلق' : 'Pending'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending permissions */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>🔖 {lang === 'ar' ? 'الأذونات المعلقة' : 'Pending Permissions'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#EDE9FE', color: '#6B21A8', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', border: '1px solid #DDD6FE' }}>{pendingPerms.length}</span>
              <button onClick={() => setActivePage('attendance')}
                style={{ fontSize: '13px', color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: '700' }}>
                {lang === 'ar' ? 'عرض الكل' : 'View All'}
              </button>
            </div>
          </div>
          {pendingPerms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{lang === 'ar' ? 'لا توجد أذونات معلقة' : 'No pending permissions'}</div>
            </div>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
              {pendingPerms.slice(0, 8).map(p => {
                const emp = employees.find(e => e.id === p.employeeId);
                return (
                  <div key={p.id} style={{ padding: '11px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                      <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '1px' }}>{p.duration} {lang === 'ar' ? 'دقيقة' : 'min'} · {p.date}</div>
                    </div>
                    <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 9px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' }}>{lang === 'ar' ? 'معلق' : 'Pending'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}
      <Modal open={showAttModal} onClose={() => setShowAttModal(false)} lang={lang} title={lang === 'ar' ? 'تفاصيل الحضور' : 'Attendance Details'}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {[lang === 'ar' ? 'الموظف' : 'Employee', lang === 'ar' ? 'القسم' : 'Dept', lang === 'ar' ? 'الحضور' : 'In', lang === 'ar' ? 'الانصراف' : 'Out', lang === 'ar' ? 'الحالة' : 'Status'].map(h => (
              <th key={h} style={thS}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {attendance.map((a, idx) => {
              const emp = employees.find(e => e.id === a.employeeId);
              const dept = departments.find(d => d.id === emp?.departmentId);
              const sm = SM[a.status];
              return (
                <tr key={a.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0F7FF'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFBFC'}>
                  <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left', fontWeight: '700', color: '#0F172A' })}>{lang === 'en' ? emp?.nameEn : emp?.name}</td>
                  <td style={tdS({ fontSize: '12px', color: '#64748B' })}>{lang === 'en' ? dept?.nameEn : dept?.name}</td>
                  <td style={tdS({ direction: 'ltr', color: '#166534', fontWeight: '700' })}>{a.checkIn || '—'}</td>
                  <td style={tdS({ direction: 'ltr', color: '#1565C0', fontWeight: '700' })}>{a.checkOut || '—'}</td>
                  <td style={tdS()}><span style={{ background: sm?.bg, color: sm?.c, border: `1px solid ${sm?.bd}`, padding: '2px 9px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' }}>{sm?.l[lang]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

      <Modal open={showEmpModal} onClose={() => setShowEmpModal(false)} lang={lang} title={lang === 'ar' ? 'قائمة الموظفين' : 'Employees List'}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {[lang === 'ar' ? 'الاسم' : 'Name', lang === 'ar' ? 'القسم' : 'Dept', lang === 'ar' ? 'النوع' : 'Type', lang === 'ar' ? 'الجنس' : 'Gender'].map(h => (
              <th key={h} style={thS}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {employees.map((e, idx) => {
              const dept = departments.find(d => d.id === e.departmentId);
              return (
                <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC' }}>
                  <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left', fontWeight: '700', color: '#0F172A' })}>{lang === 'en' ? e.nameEn : e.name}</td>
                  <td style={tdS({ fontSize: '12px', color: '#64748B' })}>{lang === 'en' ? dept?.nameEn : dept?.name}</td>
                  <td style={tdS()}><span style={{ background: e.type === 'academic' ? '#EDE9FE' : '#FEF3C7', color: e.type === 'academic' ? '#6B21A8' : '#B45309', padding: '2px 9px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' }}>{lang === 'ar' ? (e.type === 'academic' ? 'أكاديمي' : 'إداري') : (e.type === 'academic' ? 'Academic' : 'Admin')}</span></td>
                  <td style={tdS()}>{lang === 'ar' ? (e.gender === 'male' ? 'رجل' : 'أنثى') : (e.gender === 'male' ? 'Male' : 'Female')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} lang={lang} title={lang === 'ar' ? 'الإجازات المعلقة' : 'Pending Leaves'}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {[lang === 'ar' ? 'الموظف' : 'Employee', lang === 'ar' ? 'النوع' : 'Type', lang === 'ar' ? 'من' : 'From', lang === 'ar' ? 'إلى' : 'To', lang === 'ar' ? 'أيام' : 'Days'].map(h => (
              <th key={h} style={thS}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pendingLeaves.map((l, idx) => {
              const emp = employees.find(e => e.id === l.employeeId);
              return (
                <tr key={l.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC' }}>
                  <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left', fontWeight: '700', color: '#0F172A' })}>{lang === 'en' ? emp?.nameEn : emp?.name}</td>
                  <td style={tdS()}>{l.type}</td>
                  <td style={tdS({ direction: 'ltr' })}>{l.from}</td>
                  <td style={tdS({ direction: 'ltr' })}>{l.to}</td>
                  <td style={tdS({ fontWeight: '800', color: '#1565C0' })}>{l.days}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

    </div>
  );
}