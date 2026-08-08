import React, { useState, useEffect } from 'react';
import { leavesService, scheduleService, employeesService, structureService } from '../services';

/* ─── Constants ─── */
const LEAVE_TYPES = [
  { id: 'annual', label: { ar: 'اعتيادي', en: 'Annual' }, days: 21, color: '#1565C0', bg: '#DBEAFE', border: '#BFDBFE' },
  { id: 'sick', label: { ar: 'مرضية', en: 'Sick' }, days: 14, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
  { id: 'urgent', label: { ar: 'عارضة', en: 'Urgent' }, days: 7, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  { id: 'maternity', label: { ar: 'وضع', en: 'Maternity' }, days: 120, color: '#BE185D', bg: '#FCE7F3', border: '#FBCFE8', womenOnly: true },
  { id: 'compensatory', label: { ar: 'بدل راحة', en: 'Compensatory' }, days: 0, color: '#6B21A8', bg: '#EDE9FE', border: '#DDD6FE' },
  { id: 'grant', label: { ar: 'منحة', en: 'Grant' }, days: 0, color: '#166534', bg: '#DCFCE7', border: '#BBF7D0' },
  { id: 'unpaid', label: { ar: 'بدون راتب', en: 'Unpaid' }, days: 0, color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
];

const STATUS = {
  pending: { label: { ar: 'معلق', en: 'Pending' }, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  approved: { label: { ar: 'موافق', en: 'Approved' }, color: '#166534', bg: '#DCFCE7', border: '#BBF7D0' },
  rejected: { label: { ar: 'مرفوض', en: 'Rejected' }, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
};

const ADMIN_DEPTS = [
  { id: 'HR', name: 'الموارد البشرية', nameEn: 'Human Resources', collegeId: 'admin' },
  { id: 'FIN', name: 'الشؤون المالية', nameEn: 'Finance', collegeId: 'admin' },
  { id: 'IT', name: 'تقنية المعلومات', nameEn: 'IT Department', collegeId: 'admin' },
  { id: 'SEC', name: 'الشؤون الأكاديمية', nameEn: 'Academic Affairs', collegeId: 'admin' },
  { id: 'STU', name: 'شؤون الطلاب', nameEn: 'Student Affairs', collegeId: 'admin' },
];

/* ─── Reusable components ─── */
function Badge({ color, bg, border, children }) {
  return <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>{children}</span>;
}

function Modal({ open, onClose, title, subtitle, width = 560, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: width, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.18)', fontFamily: 'Cairo,sans-serif', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{subtitle}</div>}
          </div>
          <button onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
            style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontFamily: 'Cairo', fontWeight: '700', transition: 'all .15s' }}>✕</button>
        </div>
        <div style={{ padding: '22px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function Leaves({ t, lang, user }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);

  const EMPLOYEES = employees;
  const DEPARTMENTS = departments;
  const COLLEGES = colleges;
  const [mainTab, setMainTab] = useState('leaves');   // leaves | grant | schedule
  const [activeTab, setActiveTab] = useState('all');
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantStep, setGrantStep] = useState(1);
  const [grantError, setGrantError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedDepts, setExpandedDepts] = useState({});

  useEffect(() => {
    async function loadAll() {
      try {
        const [leaveData, schedData, empData, deptData, colData] = await Promise.all([
          leavesService.getLeaves().catch(() => []),
          scheduleService.getSchedules().catch(() => []),
          employeesService.getEmployees().catch(() => []),
          structureService.getDepartments().catch(() => []),
          structureService.getColleges().catch(() => [])
        ]);
        setLeaves(Array.isArray(leaveData) ? leaveData.map(normalizeLeave) : []);
        setSchedules(Array.isArray(schedData) ? schedData : []);
        setEmployees(Array.isArray(empData) ? empData : []);
        setDepartments(Array.isArray(deptData) ? deptData : []);
        setColleges(Array.isArray(colData) ? colData : []);
      } catch (e) {
        console.error(e);
      }
    }
    loadAll();
  }, []);

  // Normalize backend leave field names to frontend conventions
  function normalizeLeave(l) {
    const statusRaw = l.status ?? l.Status;
    let status = 'pending';
    if (statusRaw === 1 || statusRaw === '1' || String(statusRaw).toLowerCase() === 'approved') status = 'approved';
    else if (statusRaw === 2 || statusRaw === '2' || String(statusRaw).toLowerCase() === 'rejected') status = 'rejected';
    else if (statusRaw === 0 || statusRaw === '0' || String(statusRaw).toLowerCase() === 'pending') status = 'pending';
    else status = String(statusRaw || 'pending').toLowerCase();
    return {
      ...l,
      status,
      id: l.id || l.Id || '',
      from: l.from || l.fromDate || l.FromDate || '',
      to: l.to || l.toDate || l.ToDate || '',
      days: l.days || l.daysCount || l.DaysCount || 0,
      type: l.type || l.leaveType || l.LeaveType || l.leaveTypeId || '',
      employeeId: l.employeeId || l.EmployeeId || '',
      employeeName: l.employeeName || l.EmployeeName || '',
      reason: l.reason || l.Reason || '',
    };
  }

  /* Grant form */
  const emptyGrant = { scope: 'employee', empSearch: '', employeeId: '', empType: '', collegeId: '', deptIds: [], deptSelections: {}, from: '', to: '', reason: '' };
  const [grantForm, setGrantForm] = useState(emptyGrant);
  const resetGrant = () => { setGrantForm(emptyGrant); setGrantStep(1); setGrantError(''); setExpandedDepts({}); };

  /* Schedule */
  const [schedules, setSchedules] = useState([]);
  const [schedError, setSchedError] = useState('');
  const [schedSuccess, setSchedSuccess] = useState('');
  const [schedType, setSchedType] = useState('all');     // all|academic|admin|dept
  const [schedEmpType, setSchedEmpType] = useState('academic');// academic|admin
  const [schedCollegeId, setSchedCollegeId] = useState('');
  const [schedDeptId, setSchedDeptId] = useState('');
  const [schedEmpIds, setSchedEmpIds] = useState([]);
  const [timeMode, setTimeMode] = useState('fixed');
  const [schedForm, setSchedForm] = useState({ checkIn: '08:00', checkOut: '16:00', daysPerWeek: 5, flexHours: 8 });

  const ALL_DEPTS = schedEmpType === 'academic'
    ? departments.filter(d => !d.deptType || d.deptType === 'academic').filter(d => !schedCollegeId || d.collegeId === schedCollegeId)
    : departments.filter(d => d.deptType === 'admin' || d.collegeId === 'admin' || !d.collegeId);

  function computeHours(inn, out) { if (!inn || !out) return 0; const [ih, im] = inn.split(':').map(Number); const [oh, om] = out.split(':').map(Number); return Math.max(0, (oh * 60 + om - ih * 60 - im) / 60); }

  async function saveSchedule() {
    setSchedError('');
    if (schedType === 'dept' && !schedDeptId) { setSchedError(lang === 'ar' ? 'اختر القسم' : 'Select dept'); return; }
    const ALL_D = departments;
    const d = ALL_D.find(x => x.id === schedDeptId);
    const targetLabel = schedType === 'all' ? { ar: 'كل الجامعة', en: 'All University' } : schedType === 'academic' ? { ar: 'كل الأكاديميين', en: 'All Academic' } : schedType === 'admin' ? { ar: 'كل الإداريين', en: 'All Admin' } : { ar: d?.name || '', en: d?.nameEn || '' };
    const ALL_EMP = employees;
    const affected = schedEmpIds.length > 0 ? schedEmpIds.map(id => ALL_EMP.find(e => e.id === id)).filter(Boolean) : schedType === 'dept' ? ALL_EMP.filter(e => e.departmentId === schedDeptId) : [];

    const newSchedPayload = {
      title: targetLabel.en,
      timeMode,
      checkInTime: timeMode === 'fixed' ? schedForm.checkIn : null,
      checkOutTime: timeMode === 'fixed' ? schedForm.checkOut : null,
      hoursPerDay: timeMode === 'fixed' ? computeHours(schedForm.checkIn, schedForm.checkOut) : schedForm.flexHours,
      daysPerWeek: schedForm.daysPerWeek,
      targetScope: schedType
    };

    try {
      const res = await scheduleService.createSchedule(newSchedPayload).catch(() => null);
      const created = res?.data || { id: Date.now(), targetLabel, timeMode, ...newSchedPayload, affected };
      setSchedules(p => [created, ...p]);
      setSchedSuccess(lang === 'ar' ? `✓ تم حفظ الجدول لـ "${targetLabel.ar}"` : `✓ Schedule saved for "${targetLabel.en}"`);
      setTimeout(() => setSchedSuccess(''), 4000);
      setSchedDeptId(''); setSchedCollegeId(''); setSchedEmpIds([]);
    } catch (err) {
      console.error(err);
      setSchedError(err.message || 'Failed to save schedule');
    }
  }

  async function deleteSchedule(id) {
    try {
      await scheduleService.deleteSchedule(id).catch(() => { });
      setSchedules(p => p.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  /* Leave operations */
  const myEmpId = user.employeeId || user.EmployeeId || '';
  const myLeaves = leaves.filter(l => user.role === 'admin' || user.role === 'hr' ? true : l.employeeId === myEmpId);
  const filtered = activeTab === 'all' ? myLeaves : myLeaves.filter(l => l.status === activeTab);
  const pending = myLeaves.filter(l => l.status === 'pending').length;
  const approved = myLeaves.filter(l => l.status === 'approved').length;

  async function approveLeave(id) {
    try {
      await leavesService.updateLeaveStatus(id, 'approved');
      setLeaves(p => p.map(l => l.id === id ? { ...l, status: 'approved' } : l));
      setSuccessMsg(lang === 'ar' ? '✓ تمت الموافقة على الإجازة' : '✓ Leave approved');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error('approveLeave error:', e);
      alert(e.message || (lang === 'ar' ? 'فشل الموافقة على الإجازة' : 'Failed to approve leave'));
    }
  }

  async function rejectLeave(id) {
    try {
      await leavesService.updateLeaveStatus(id, 'rejected');
      setLeaves(p => p.map(l => l.id === id ? { ...l, status: 'rejected' } : l));
      setSuccessMsg(lang === 'ar' ? '✓ تم رفض الإجازة' : '✓ Leave rejected');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error('rejectLeave error:', e);
      alert(e.message || (lang === 'ar' ? 'فشل رفض الإجازة' : 'Failed to reject leave'));
    }
  }

  async function submitGrant() {
    if (!grantForm.from || !grantForm.to) { setGrantError(lang === 'ar' ? 'اختر التواريخ' : 'Select dates'); return; }
    if (!grantForm.reason.trim()) { setGrantError(lang === 'ar' ? 'اكتب السبب' : 'Enter reason'); return; }
    let targets = [];
    const ALL_EMP = employees;
    if (grantForm.scope === 'employee') { if (!grantForm.employeeId) { setGrantError(lang === 'ar' ? 'اختر الموظف' : 'Select employee'); return; } targets = [grantForm.employeeId]; }
    else if (grantForm.scope === 'dept') { if (!grantForm.deptIds.length) { setGrantError(lang === 'ar' ? 'اختر قسماً' : 'Select dept'); return; } grantForm.deptIds.forEach(dId => { const sel = grantForm.deptSelections[dId]; if (!sel || sel === 'all') { ALL_EMP.filter(e => e.departmentId === dId).forEach(e => { if (!targets.includes(e.id)) targets.push(e.id); }); } else sel.forEach(id => { if (!targets.includes(id)) targets.push(id); }); }); }
    else targets = ALL_EMP.map(e => e.id);
    if (!targets.length) { setGrantError(lang === 'ar' ? 'لا يوجد موظفون' : 'No employees'); return; }

    try {
      await leavesService.grantLeave({ fromDate: grantForm.from, toDate: grantForm.to, reason: grantForm.reason, targetEmployeeIds: targets }).catch(() => null);
      const days = Math.max(1, Math.round((new Date(grantForm.to) - new Date(grantForm.from)) / (86400000)) + 1);
      setLeaves(p => { let n = [...p]; targets.forEach(id => { n = [...n, { id: 'LEV' + String(n.length + 1).padStart(3, '0'), employeeId: id, type: 'grant', from: grantForm.from, to: grantForm.to, days, status: 'approved', reason: grantForm.reason.trim(), note: lang === 'ar' ? 'ممنوحة من الإدارة' : 'Granted by admin' }]; }); return n; });
      setShowGrantForm(false); resetGrant();
      setSuccessMsg(lang === 'ar' ? `✓ تم منح الإجازة لـ ${targets.length} موظف` : `✓ Granted to ${targets.length} employee(s)`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setGrantError(err.message || 'Grant failed');
    }
  }

  function exportExcel() {
    const rows = [[lang === 'ar' ? 'الاسم' : 'Name', lang === 'ar' ? 'النوع' : 'Type', lang === 'ar' ? 'من' : 'From', lang === 'ar' ? 'إلى' : 'To', lang === 'ar' ? 'الأيام' : 'Days', lang === 'ar' ? 'الحالة' : 'Status'], ...filtered.map(l => { const e = employees.find(x => x.id === l.employeeId); const lt = LEAVE_TYPES.find(x => x.id === l.type); return [lang === 'en' ? e?.nameEn : e?.name, lt?.label[lang], l.from || l.fromDate, l.to || l.toDate, l.days || l.daysCount, STATUS[l.status]?.label[lang]]; })];
    const XLSX = window.XLSX;
    if (!XLSX) { const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `leaves_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); return; }
    const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'الإجازات' : 'Leaves'); XLSX.writeFile(wb, `leaves_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /* Style helpers */
  const inp = { width: '100%', padding: '10px 13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box', color: '#0F172A', transition: 'border-color .15s' };
  const lbl = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '7px' };
  const thS = { background: '#F8FAFC', padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
  const tdS = (x = {}) => ({ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', ...x });

  /* ─── Scope depts logic ─── */
  const ADMIN_DEPTS_LIVE = departments.filter(d => d.deptType === 'admin' || d.collegeId === 'admin' || !d.collegeId);
  const grantDepts = grantForm.collegeId === 'admin' ? ADMIN_DEPTS_LIVE.length ? ADMIN_DEPTS_LIVE : departments : grantForm.collegeId ? departments.filter(d => d.collegeId === grantForm.collegeId) : [];

  return (
    <div className="page-pad" style={{ fontFamily: 'Cairo,sans-serif', direction: dir, background: '#F1F5F9', minHeight: '100%' }}>

      {/* ── Hero header ── */}
      <div style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '18px', boxShadow: '0 4px 20px rgba(13,59,122,.15)' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D3B7A, #1565C0, #1E88E5)', padding: '24px 26px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: '190px', height: '190px', borderRadius: '50%', background: 'rgba(255,255,255,.06)', top: '-80px', [dir === 'rtl' ? 'left' : 'right']: '-50px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,.05)', bottom: '-55px', [dir === 'rtl' ? 'right' : 'left']: '28%', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,.14)', border: '1.5px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🗓️</div>
              <div>
                <h1 style={{ margin: 0, fontSize: '21px', fontWeight: '800', color: 'white' }}>{lang === 'ar' ? 'تنظيم مواعيد العمل والمنح' : 'Work Schedule & Leave Management'}</h1>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.75)', fontSize: '13px' }}>{lang === 'ar' ? 'تنظيم أوقات الحضور والانصراف ومنح الإجازات للموظفين' : 'Organize attendance schedules and leave grants for employees'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {user.role === 'admin' && mainTab !== 'schedule' && (
                <button onClick={() => { setShowGrantForm(true); resetGrant(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#166534', color: 'white', border: 'none', borderRadius: '11px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 14px rgba(0,0,0,.2)', transition: 'all .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#14532D'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#166534'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                  {lang === 'ar' ? 'منح إجازة' : 'Grant Leave'}
                </button>
              )}
              <button onClick={exportExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'rgba(255,255,255,.14)', color: 'white', border: '1px solid rgba(255,255,255,.3)', borderRadius: '11px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .18s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.26)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: user.role === 'admin' ? 'repeat(5,1fr)' : 'repeat(4,1fr)', background: 'white' }}>
          {[
            { v: myLeaves.length, l: { ar: 'إجمالي الطلبات', en: 'Total Requests' }, c: '#1565C0' },
            { v: pending, l: { ar: 'معلقة', en: 'Pending' }, c: '#B45309' },
            { v: approved, l: { ar: 'موافق عليها', en: 'Approved' }, c: '#166534' },
            { v: myLeaves.filter(l => l.status === 'rejected').length, l: { ar: 'مرفوضة', en: 'Rejected' }, c: '#991B1B' },
            ...(user.role === 'admin' ? [{ v: schedules.length, l: { ar: 'جداول محفوظة', en: 'Schedules' }, c: '#0891B2' }] : []),
          ].map((s, i, arr) => (
            <div key={i} style={{ textAlign: 'center', padding: '14px 8px', borderInlineEnd: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: s.c, lineHeight: 1, marginBottom: '4px' }}>{s.v}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{s.l[lang]}</div>
            </div>
          ))}
        </div>
      </div>

      {successMsg && <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>{successMsg}</div>}

      {/* ── Main tabs (admin only) ── */}
      {user.role === 'admin' && (
        <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '5px', borderRadius: '14px', border: '1px solid #E8EDF5', width: 'fit-content', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          {[
            { id: 'leaves', l: { ar: 'طلبات الإجازة', en: 'Leave Requests' } },
            { id: 'schedule', l: { ar: 'جداول العمل', en: 'Work Schedules' } },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMainTab(tab.id)}
              style={{
                padding: '10px 22px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .18s',
                background: mainTab === tab.id ? '#1565C0' : 'transparent',
                color: mainTab === tab.id ? 'white' : '#475569',
                boxShadow: mainTab === tab.id ? '0 3px 10px rgba(21,101,192,.25)' : 'none'
              }}>
              {tab.l[lang]}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════
          LEAVE REQUESTS TAB
      ══════════════════════════════ */}
      {(mainTab === 'leaves' || user.role !== 'admin') && (<>

        {/* Filter tabs */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E8EDF5', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9' }}>
            {[
              { id: 'all', l: { ar: 'الكل', en: 'All' }, count: myLeaves.length },
              { id: 'pending', l: { ar: 'معلقة', en: 'Pending' }, count: pending },
              { id: 'approved', l: { ar: 'موافق عليها', en: 'Approved' }, count: approved },
              { id: 'rejected', l: { ar: 'مرفوضة', en: 'Rejected' }, count: myLeaves.filter(l => l.status === 'rejected').length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '13px 10px', border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '14px', fontWeight: activeTab === tab.id ? '800' : '500',
                  background: activeTab === tab.id ? '#F0F9FF' : 'white',
                  color: activeTab === tab.id ? '#1565C0' : '#475569',
                  borderBottom: activeTab === tab.id ? '2px solid #1565C0' : '2px solid transparent',
                  transition: 'all .18s'
                }}>
                {tab.l[lang]}
                {tab.count > 0 && <span style={{ marginInlineStart: '6px', background: activeTab === tab.id ? '#1565C0' : '#F1F5F9', color: activeTab === tab.id ? 'white' : '#64748B', borderRadius: '999px', fontSize: '11px', padding: '1px 7px', fontWeight: '700' }}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ ...thS, textAlign: lang === 'ar' ? 'right' : 'left' }}>{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th style={thS}>{lang === 'ar' ? 'نوع الإجازة' : 'Type'}</th>
                <th style={thS}>{lang === 'ar' ? 'من' : 'From'}</th>
                <th style={thS}>{lang === 'ar' ? 'إلى' : 'To'}</th>
                <th style={thS}>{lang === 'ar' ? 'الأيام' : 'Days'}</th>
                <th style={thS}>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                {user.role === 'admin' && <th style={thS}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>}
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={user.role === 'admin' ? 7 : 6} style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{lang === 'ar' ? 'لا توجد طلبات' : 'No requests'}</div>
                  </td></tr>
                ) : filtered.map((l, idx) => {
                  const ALL_EMP = employees.length ? employees : EMPLOYEES;
                  const emp = ALL_EMP.find(e => e.id === l.employeeId || e.name === l.employeeName);
                  const typeStr = String(l.leaveType || l.type || 'annual').toLowerCase();
                  const lt = LEAVE_TYPES.find(x => x.id === typeStr || x.label.en.toLowerCase() === typeStr || x.label.ar === l.leaveType) || LEAVE_TYPES[0];

                  const stKey = (l.status === 0 || l.status === '0' || String(l.status).toLowerCase() === 'pending') ? 'pending'
                    : (l.status === 1 || l.status === '1' || String(l.status).toLowerCase() === 'approved') ? 'approved'
                      : (l.status === 2 || l.status === '2' || String(l.status).toLowerCase() === 'rejected') ? 'rejected' : 'pending';
                  const st = STATUS[stKey] || STATUS.pending;

                  const empName = (lang === 'en' ? (emp?.nameEn || l.employeeName) : (emp?.name || l.employeeName)) || l.employeeName || l.employeeId;
                  const fromDate = String(l.fromDate || l.from || '').slice(0, 10);
                  const toDate = String(l.toDate || l.to || '').slice(0, 10);
                  const daysCount = l.daysCount || l.days || 1;

                  return (
                    <tr key={l.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC', transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFBFC'}>
                      <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left' })}>
                        <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>{empName}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{l.reason}</div>
                      </td>
                      <td style={tdS()}><Badge color={lt?.color} bg={lt?.bg} border={lt?.border}>{lt?.label[lang]}</Badge></td>
                      <td style={tdS({ direction: 'ltr', color: '#64748B' })}>{fromDate}</td>
                      <td style={tdS({ direction: 'ltr', color: '#64748B' })}>{toDate}</td>
                      <td style={tdS({ fontWeight: '800', color: '#1565C0', fontSize: '16px' })}>{daysCount}</td>
                      <td style={tdS()}><Badge color={st?.color} bg={st?.bg} border={st?.border}>{st?.label[lang]}</Badge></td>
                      {user.role === 'admin' && (
                        <td style={tdS()}>
                          {stKey === 'pending' ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button onClick={() => approveLeave(l.id)}
                                style={{ padding: '5px 12px', background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#BBF7D0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#DCFCE7'}>
                                {lang === 'ar' ? 'موافقة' : 'Approve'}
                              </button>
                              <button onClick={() => rejectLeave(l.id)}
                                style={{ padding: '5px 12px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                                onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}>
                                {lang === 'ar' ? 'رفض' : 'Reject'}
                              </button>
                            </div>
                          ) : <span style={{ fontSize: '12px', color: '#94A3B8' }}>{lang === 'ar' ? 'تم البت' : 'Done'}</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {/* ══════════════════════════════
          SCHEDULE TAB
      ══════════════════════════════ */}
      {mainTab === 'schedule' && user.role === 'admin' && (
        <div className="rg-2-stack">

          {/* Form */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>{lang === 'ar' ? 'إعداد جدول عمل' : 'Set Work Schedule'}</div>

            {/* Scope */}
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>{lang === 'ar' ? 'تطبيق على:' : 'Apply to:'}</label>
              <div className="rg-4" style={{ gap: '8px' }}>
                {[
                  { id: 'all', l: { ar: 'الكل', en: 'All' } },
                  { id: 'academic', l: { ar: 'الأكاديميون', en: 'Academic' } },
                  { id: 'admin', l: { ar: 'الإداريون', en: 'Admin' } },
                  { id: 'dept', l: { ar: 'قسم محدد', en: 'Dept' } },
                ].map(s => {
                  const sel = schedType === s.id;
                  return (
                    <button key={s.id} onClick={() => { setSchedType(s.id); setSchedDeptId(''); setSchedCollegeId(''); setSchedEmpIds([]); }}
                      style={{
                        padding: '9px 6px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '12px', fontWeight: '700', textAlign: 'center',
                        border: `1.5px solid ${sel ? '#1565C0' : '#E2E8F0'}`,
                        background: sel ? '#1565C0' : 'white',
                        color: sel ? 'white' : '#475569',
                        transition: 'all .15s'
                      }}>
                      {s.l[lang]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dept sub-selection */}
            {schedType === 'dept' && (
              <div style={{ background: '#F0F7FF', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Step 1: academic/admin */}
                <div>
                  <label style={lbl}>{lang === 'ar' ? 'النوع:' : 'Type:'}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'academic', l: { ar: 'أكاديمي', en: 'Academic' } },
                      { id: 'admin', l: { ar: 'إداري', en: 'Admin' } },
                    ].map(t => {
                      const sel = schedEmpType === t.id;
                      return (
                        <button key={t.id} onClick={() => { setSchedEmpType(t.id); setSchedCollegeId(''); setSchedDeptId(''); setSchedEmpIds([]); }}
                          style={{
                            padding: '9px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '13px', fontWeight: '700',
                            border: `1.5px solid ${sel ? '#1565C0' : '#E2E8F0'}`,
                            background: sel ? '#1565C0' : 'white',
                            color: sel ? 'white' : '#475569',
                            transition: 'all .15s'
                          }}>
                          {t.l[lang]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: College (academic only) */}
                {schedEmpType === 'academic' && (
                  <div>
                    <label style={lbl}>{lang === 'ar' ? 'الكلية:' : 'College:'}</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {COLLEGES.map(c => {
                        const sel = schedCollegeId === c.id;
                        return (
                          <button key={c.id} onClick={() => { setSchedCollegeId(c.id); setSchedDeptId(''); setSchedEmpIds([]); }}
                            style={{
                              padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '12px', fontWeight: '700',
                              border: `1.5px solid ${sel ? '#1565C0' : '#E2E8F0'}`,
                              background: sel ? '#1565C0' : 'white',
                              color: sel ? 'white' : '#334155',
                              transition: 'all .15s'
                            }}>
                            {lang === 'en' ? c.nameEn : c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 3: Dept */}
                {(schedEmpType === 'admin' || schedCollegeId) && (
                  <div>
                    <label style={lbl}>{lang === 'ar' ? 'القسم:' : 'Department:'}</label>
                    <select value={schedDeptId} onChange={e => { setSchedDeptId(e.target.value); setSchedEmpIds([]); }}
                      onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                      style={inp}>
                      <option value="">{lang === 'ar' ? 'اختر القسم' : 'Select Dept'}</option>
                      {(schedEmpType === 'admin' ? ADMIN_DEPTS : DEPARTMENTS.filter(d => d.collegeId === schedCollegeId)).map(d => (
                        <option key={d.id} value={d.id}>{lang === 'en' ? d.nameEn : d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 4: Employees multi-select */}
                {schedDeptId && (() => {
                  const deptEmps = EMPLOYEES.filter(e => e.departmentId === schedDeptId);
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                        <label style={lbl}>{lang === 'ar' ? 'الموظفون (الكل بالافتراضي):' : 'Employees (all by default):'}</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => setSchedEmpIds([])} style={{ padding: '3px 9px', background: '#1565C0', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>{lang === 'ar' ? 'الكل' : 'All'}</button>
                          <button onClick={() => setSchedEmpIds(deptEmps.map(e => e.id))} style={{ padding: '3px 9px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>{lang === 'ar' ? 'تحديد' : 'Select'}</button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '5px', maxHeight: '130px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
                        {deptEmps.map(e => {
                          const sel = schedEmpIds.length === 0 || schedEmpIds.includes(e.id);
                          return (
                            <div key={e.id} onClick={() => setSchedEmpIds(p => { if (p.length === 0) return deptEmps.map(x => x.id).filter(id => id !== e.id); return p.includes(e.id) ? p.filter(x => x !== e.id) : [...p, e.id]; })}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 9px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', background: sel ? '#DBEAFE' : 'white', border: `1px solid ${sel ? '#BFDBFE' : '#E2E8F0'}`, color: sel ? '#1565C0' : '#475569', fontWeight: sel ? '600' : '400', transition: 'all .12s' }}>
                              <div style={{ width: '13px', height: '13px', borderRadius: '3px', border: `2px solid ${sel ? '#1565C0' : '#CBD5E1'}`, background: sel ? '#1565C0' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {sel && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                              </div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? e.nameEn : e.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Time mode */}
            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>{lang === 'ar' ? 'نوع الجدول:' : 'Schedule Type:'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'fixed', l: { ar: 'ثابت', en: 'Fixed' }, desc: { ar: 'وقت حضور وانصراف محدد', en: 'Fixed check-in/out time' } },
                  { id: 'flexible', l: { ar: 'ساعات محددة', en: 'Set Hours' }, desc: { ar: 'عدد ساعات يومية بدون وقت محدد', en: 'Daily hours, no fixed time' } },
                  { id: 'open', l: { ar: 'ساعات مرنة', en: 'Flexible Hours' }, desc: { ar: 'المهم التسجيل — بدون قيود ساعات', en: 'Just check-in — no hour limits' } },
                ].map(m => {
                  const sel = timeMode === m.id;
                  return (
                    <button key={m.id} onClick={() => setTimeMode(m.id)}
                      style={{
                        padding: '12px 10px', borderRadius: '11px', cursor: 'pointer', fontFamily: 'Cairo', textAlign: 'center',
                        border: `1.5px solid ${sel ? '#1565C0' : '#E2E8F0'}`,
                        background: sel ? '#EFF6FF' : 'white',
                        boxShadow: sel ? '0 4px 12px rgba(21,101,192,.14)' : 'none',
                        transition: 'all .15s'
                      }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: sel ? '#0D3B7A' : '#475569' }}>{m.l[lang]}</div>
                      <div style={{ fontSize: '10.5px', fontWeight: '600', color: sel ? '#3B82F6' : '#94A3B8', marginTop: '3px', lineHeight: 1.4 }}>{m.desc[lang]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {timeMode === 'open' && (
              <div style={{ marginBottom: '14px', padding: '12px 16px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1565C0' }}>{lang === 'ar' ? 'ساعات مرنة — بدون قيود' : 'Flexible Hours — No Restrictions'}</div>
                  <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>{lang === 'ar' ? 'يُحتسب الموظف حاضراً بمجرد تسجيل الحضور بصرف النظر عن الوقت' : 'Employee is marked present upon check-in regardless of time'}</div>
                </div>
              </div>
            )}
            {timeMode === 'fixed' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={lbl}>{lang === 'ar' ? 'وقت الحضور' : 'Check In'}</label>
                  <input type="time" value={schedForm.checkIn} onChange={e => setSchedForm(p => ({ ...p, checkIn: e.target.value }))} style={{ ...inp, direction: 'ltr' }} onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>
                <div>
                  <label style={lbl}>{lang === 'ar' ? 'وقت الانصراف' : 'Check Out'}</label>
                  <input type="time" value={schedForm.checkOut} onChange={e => setSchedForm(p => ({ ...p, checkOut: e.target.value }))} style={{ ...inp, direction: 'ltr' }} onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>
              </div>
            )}
            {timeMode === 'flexible' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>{lang === 'ar' ? 'ساعات العمل اليومية:' : 'Daily Hours:'}</label>
                <input type="number" min="1" max="12" value={schedForm.flexHours} onChange={e => setSchedForm(p => ({ ...p, flexHours: +e.target.value }))} style={{ ...inp, direction: 'ltr', width: '120px' }} onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label style={lbl}>{lang === 'ar' ? 'أيام العمل أسبوعياً:' : 'Days per Week:'}</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[5, 6].map(n => (
                  <button key={n} onClick={() => setSchedForm(p => ({ ...p, daysPerWeek: n }))}
                    style={{
                      padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '13px', fontWeight: '700',
                      border: `1.5px solid ${schedForm.daysPerWeek === n ? '#1565C0' : '#E2E8F0'}`,
                      background: schedForm.daysPerWeek === n ? '#1565C0' : 'white',
                      color: schedForm.daysPerWeek === n ? 'white' : '#475569',
                      transition: 'all .15s'
                    }}>
                    {n} {lang === 'ar' ? 'أيام' : 'days'}
                  </button>
                ))}
              </div>
            </div>

            {schedError && <div style={{ padding: '10px 14px', background: '#FEE2E2', borderRadius: '9px', color: '#DC2626', fontSize: '13px', fontWeight: '700', marginBottom: '14px', border: '1px solid #FECACA' }}>{schedError}</div>}
            {schedSuccess && <div style={{ padding: '10px 14px', background: '#DCFCE7', borderRadius: '9px', color: '#166534', fontSize: '13px', fontWeight: '700', marginBottom: '14px', border: '1px solid #BBF7D0' }}>{schedSuccess}</div>}

            {/* Live summary — اللي هيتطبق فعلياً */}
            {(() => {
              const ALL_D = [...DEPARTMENTS, ...ADMIN_DEPTS];
              const d = ALL_D.find(x => x.id === schedDeptId);
              const target = schedType === 'all' ? (lang === 'ar' ? 'كل الجامعة' : 'All University') : schedType === 'academic' ? (lang === 'ar' ? 'كل الأكاديميين' : 'All Academic') : schedType === 'admin' ? (lang === 'ar' ? 'كل الإداريين' : 'All Admin') : (d ? (lang === 'en' ? d.nameEn : d.name) : (lang === 'ar' ? '— اختر القسم' : '— select dept'));
              const typeL = timeMode === 'fixed' ? (lang === 'ar' ? 'ثابت' : 'Fixed') : timeMode === 'flexible' ? (lang === 'ar' ? 'ساعات محددة' : 'Set Hours') : (lang === 'ar' ? 'ساعات مرنة' : 'Flexible Hours');
              const timeL = timeMode === 'fixed' ? `${schedForm.checkIn} → ${schedForm.checkOut} (${computeHours(schedForm.checkIn, schedForm.checkOut)} ${lang === 'ar' ? 'ساعة' : 'hrs'})` : timeMode === 'flexible' ? `${schedForm.flexHours} ${lang === 'ar' ? 'ساعة يومياً' : 'hrs/day'}` : (lang === 'ar' ? 'تسجيل حضور فقط' : 'Check-in only');
              return (
                <div style={{ marginBottom: '14px', padding: '13px 16px', background: '#F8FAFC', borderRadius: '11px', border: '1.5px dashed #CBD5E1' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#94A3B8', marginBottom: '7px' }}>📌 {lang === 'ar' ? 'ملخص الجدول اللي هيتطبق:' : 'Schedule summary to apply:'}</div>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>👥 {target}</span>
                    <span style={{ background: '#F5F3FF', color: '#6B21A8', border: '1px solid #DDD6FE', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>📋 {typeL}</span>
                    <span style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', direction: 'ltr' }}>⏰ {timeL}</span>
                    <span style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>📅 {schedForm.daysPerWeek} {lang === 'ar' ? 'أيام/أسبوع' : 'days/wk'}</span>
                  </div>
                </div>
              );
            })()}

            <button onClick={saveSchedule}
              style={{ width: '100%', padding: '12px', background: '#1565C0', color: 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 12px rgba(21,101,192,.25)', transition: 'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1976D2'}
              onMouseLeave={e => e.currentTarget.style.background = '#1565C0'}>
              {lang === 'ar' ? 'حفظ الجدول' : 'Save Schedule'}
            </button>
          </div>

          {/* Saved schedules */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'الجداول المحفوظة' : 'Saved Schedules'}</span>
              <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', border: '1px solid #E8EDF5' }}>{schedules.length}</span>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '14px', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
              {schedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{lang === 'ar' ? 'لا توجد جداول بعد' : 'No schedules yet'}</div>
                </div>
              ) : schedules.map(s => {
                const labelText = (typeof s.targetLabel === 'object' && s.targetLabel)
                  ? (s.targetLabel[lang] || s.targetLabel.en || s.targetLabel.ar)
                  : (s.title || s.targetScope || (lang === 'ar' ? 'جدول عمل' : 'Work Schedule'));
                const tm = String(s.timeMode || 'fixed').toLowerCase();
                const checkInVal = s.checkIn || s.checkInTime;
                const checkOutVal = s.checkOut || s.checkOutTime;

                return (
                  <div key={s.id} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', border: '1px solid #E8EDF5', transition: 'all .18s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E8EDF5'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{labelText}</span>
                      <span style={{ background: tm === 'fixed' ? '#DBEAFE' : tm === 'open' ? '#ECFEFF' : '#EDE9FE', color: tm === 'fixed' ? '#1565C0' : tm === 'open' ? '#0891B2' : '#6B21A8', border: `1px solid ${tm === 'fixed' ? '#BFDBFE' : tm === 'open' ? '#A5F3FC' : '#DDD6FE'}`, padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>
                        {tm === 'open' ? (lang === 'ar' ? 'ساعات مرنة' : 'Flexible Hours') : tm === 'fixed' ? (lang === 'ar' ? 'ثابت' : 'Fixed') : (lang === 'ar' ? 'ساعات محددة' : 'Set Hours')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                      {tm === 'open' ? <span>{lang === 'ar' ? '⏰ تسجيل حضور فقط' : '⏰ Check-in only'}</span> : checkInVal && <span>⏰ {checkInVal} → {checkOutVal}</span>}
                      {tm !== 'open' && <span>🕐 {s.hoursPerDay || 8} {lang === 'ar' ? 'ساعة' : 'hrs'}</span>}
                      <span>📅 {s.daysPerWeek || 5} {lang === 'ar' ? 'أيام' : 'days'}</span>
                      {s.affected?.length > 0 && <span>👥 {s.affected.length} {lang === 'ar' ? 'موظف' : 'emp'}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          GRANT MODAL
      ══════════════════════════════ */}
      {showGrantForm && (
        <div onClick={() => { setShowGrantForm(false); resetGrant(); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.18)', fontFamily: 'Cairo,sans-serif', direction: dir, scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>

            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'منح إجازة' : 'Grant Leave'}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px' }}>{lang === 'ar' ? 'منح موافق عليها تلقائياً' : 'Auto-approved'}</div>
                </div>
              </div>
              <button onClick={() => { setShowGrantForm(false); resetGrant(); }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontFamily: 'Cairo', fontWeight: '700', transition: 'all .15s' }}>✕</button>
            </div>

            <div style={{ padding: '22px 24px' }}>

              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '22px' }}>
                {[{ n: 1, l: { ar: 'المستفيدون', en: 'Recipients' } }, { n: 2, l: { ar: 'التأكيد', en: 'Confirm' } }].map((s, i) => (
                  <React.Fragment key={s.n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800',
                        background: grantStep >= s.n ? '#166534' : '#F1F5F9', color: grantStep >= s.n ? 'white' : '#94A3B8', transition: 'all .3s'
                      }}>
                        {grantStep > s.n ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : s.n}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: grantStep === s.n ? '700' : '500', color: grantStep === s.n ? '#166534' : '#94A3B8' }}>{s.l[lang]}</span>
                    </div>
                    {i === 0 && <div style={{ flex: 1, height: '2px', background: grantStep > 1 ? '#166534' : '#E2E8F0', margin: '0 10px', transition: 'background .3s' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* ── STEP 1 ── */}
              {grantStep === 1 && (<>

                {/* Scope */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={lbl}>{lang === 'ar' ? 'منح الإجازة لـ:' : 'Grant to:'}</label>
                  <div className="rg-3" style={{ gap: '10px' }}>
                    {[
                      { val: 'employee', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>, l: { ar: 'موظف واحد', en: 'One Employee' } },
                      { val: 'dept', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, l: { ar: 'قسم أو أقسام', en: 'Department(s)' } },
                      { val: 'university', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>, l: { ar: 'كل الجامعة', en: 'All University' } },
                    ].map(opt => {
                      const sel = grantForm.scope === opt.val;
                      return (
                        <button key={opt.val} type="button"
                          onClick={() => setGrantForm(p => ({ ...p, scope: opt.val, employeeId: '', empSearch: '', deptIds: [], deptSelections: {}, collegeId: '' }))}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = '#BBF7D0'; }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          style={{
                            padding: '14px 8px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Cairo', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            border: `2px solid ${sel ? '#166534' : '#E2E8F0'}`,
                            background: sel ? '#F0FDF4' : 'white',
                            color: sel ? '#166534' : '#475569',
                            transition: 'all .15s', position: 'relative'
                          }}>
                          {sel && <div style={{ position: 'absolute', top: '6px', [lang === 'ar' ? 'left' : 'right']: '6px', width: '16px', height: '16px', borderRadius: '50%', background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>}
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: sel ? '#166534' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? 'white' : '#64748B', transition: 'all .15s' }}>{opt.icon}</div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>{opt.l[lang]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Employee search ── */}
                {grantForm.scope === 'employee' && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={lbl}>{lang === 'ar' ? 'ابحث عن الموظف:' : 'Search Employee:'} *</label>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <svg style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [lang === 'ar' ? 'right' : 'left']: '11px', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      <input value={grantForm.empSearch || ''} onChange={e => setGrantForm(p => ({ ...p, empSearch: e.target.value, employeeId: '' }))}
                        placeholder={lang === 'ar' ? 'اكتب الاسم أو الإيميل...' : 'Type name or email...'}
                        onFocus={e => e.target.style.borderColor = '#166534'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        style={{ ...inp, padding: lang === 'ar' ? '10px 36px 10px 12px' : '10px 12px 10px 36px' }} />
                    </div>
                    <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
                      {(() => {
                        const q = (grantForm.empSearch || '').trim();
                        const list = q ? EMPLOYEES.filter(e => (e.name || '').includes(q) || (e.nameEn || '').toLowerCase().includes(q.toLowerCase()) || (e.email || '').includes(q)) : EMPLOYEES;
                        if (!list.length) return <div style={{ padding: '18px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</div>;
                        return list.map((e, idx) => {
                          const sel = grantForm.employeeId === e.id;
                          const dept = DEPARTMENTS.find(d => d.id === e.departmentId);
                          return (
                            <div key={e.id} onClick={() => setGrantForm(p => ({ ...p, employeeId: e.id, empSearch: lang === 'en' ? e.nameEn : e.name }))}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: idx < list.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', background: sel ? '#F0FDF4' : 'white', transition: 'background .12s' }}
                              onMouseEnter={ev => { if (!sel) ev.currentTarget.style.background = '#F8FAFC'; }}
                              onMouseLeave={ev => { ev.currentTarget.style.background = sel ? '#F0FDF4' : 'white'; }}>
                              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: sel ? '#166534' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: sel ? 'white' : '#475569', flexShrink: 0 }}>
                                {(lang === 'en' ? e.nameEn : e.name)?.charAt(0)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: sel ? '#166534' : '#0F172A' }}>{lang === 'en' ? e.nameEn : e.name}</div>
                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{lang === 'en' ? dept?.nameEn : dept?.name} · {e.email}</div>
                              </div>
                              {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Dept: type → college → dept ── */}
                {grantForm.scope === 'dept' && (
                  <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Step A: academic / admin */}
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #E8EDF5' }}>
                      <label style={{ ...lbl, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1565C0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>1</span>
                        {lang === 'ar' ? 'نوع الجهة' : 'Section Type'}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[{ id: 'academic', l: { ar: 'أكاديمي', en: 'Academic' } }, { id: 'admin', l: { ar: 'إداري', en: 'Admin' } }].map(t => {
                          const sel = (grantForm.empType || 'academic') === t.id;
                          return (
                            <button key={t.id} type="button" onClick={() => setGrantForm(p => ({ ...p, empType: t.id, collegeId: '', deptIds: [], deptSelections: {} }))}
                              style={{
                                padding: '10px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '13px', fontWeight: '700',
                                border: `1.5px solid ${sel ? '#1565C0' : '#E2E8F0'}`, background: sel ? '#1565C0' : 'white', color: sel ? 'white' : '#475569', transition: 'all .15s'
                              }}>
                              {t.l[lang]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step B: College (academic only) */}
                    {(grantForm.empType || 'academic') === 'academic' && (
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #E8EDF5' }}>
                        <label style={{ ...lbl, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1565C0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>2</span>
                          {lang === 'ar' ? 'اختر الكلية' : 'Select College'} *
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {COLLEGES.map(c => {
                            const sel = grantForm.collegeId === c.id;
                            return (
                              <button key={c.id} type="button" onClick={() => setGrantForm(p => ({ ...p, collegeId: c.id, deptIds: [], deptSelections: {} }))}
                                style={{
                                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '13px', fontWeight: '700',
                                  border: `1.5px solid ${sel ? '#166534' : '#E2E8F0'}`, background: sel ? '#166534' : 'white', color: sel ? 'white' : '#334155', transition: 'all .15s'
                                }}>
                                {lang === 'en' ? c.nameEn : c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step C: Depts (after college selected OR admin) */}
                    {(grantForm.collegeId || (grantForm.empType === 'admin')) && (
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #E8EDF5' }}>
                        <label style={{ ...lbl, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#166534', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>{(grantForm.empType || 'academic') === 'admin' ? '2' : '3'}</span>
                          {lang === 'ar' ? 'اختر الأقسام' : 'Select Departments'} *
                        </label>
                        <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
                          {((grantForm.empType || 'academic') === 'admin' ? ADMIN_DEPTS : DEPARTMENTS.filter(d => d.collegeId === grantForm.collegeId)).map((dept, di, arr) => {
                            const deptEmps = EMPLOYEES.filter(e => e.departmentId === dept.id);
                            const isChecked = grantForm.deptIds.includes(dept.id);
                            const isExpanded = expandedDepts[dept.id];
                            const sel = grantForm.deptSelections[dept.id];
                            const selCount = sel && sel !== 'all' ? sel.length : deptEmps.length;
                            return (
                              <div key={dept.id} style={{ borderBottom: di < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: isChecked ? '#F0FDF4' : 'white', cursor: 'pointer', transition: 'background .12s' }}
                                  onClick={() => setGrantForm(p => ({ ...p, deptIds: isChecked ? p.deptIds.filter(x => x !== dept.id) : [...p.deptIds, dept.id], deptSelections: { ...p.deptSelections, [dept.id]: 'all' } }))}>
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${isChecked ? '#166534' : '#CBD5E1'}`, background: isChecked ? '#166534' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                    {isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                  </div>
                                  <div style={{ flex: 1, fontSize: '13px', fontWeight: isChecked ? '700' : '500', color: isChecked ? '#166534' : '#334155' }}>
                                    {lang === 'en' ? dept.nameEn : dept.name}
                                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '400', marginInlineStart: '6px' }}>({deptEmps.length} {lang === 'ar' ? 'موظف' : 'emp'})</span>
                                    {isChecked && <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600', marginInlineStart: '5px' }}>· {selCount} {lang === 'ar' ? 'مختار' : 'sel'}</span>}
                                  </div>
                                  {isChecked && deptEmps.length > 0 && (
                                    <button type="button" onClick={e => { e.stopPropagation(); setExpandedDepts(p => ({ ...p, [dept.id]: !p[dept.id] })); }}
                                      style={{ background: '#DCFCE7', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: '#166534', fontFamily: 'Cairo' }}>
                                      {isExpanded ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'الموظفون' : 'Emps')}
                                    </button>
                                  )}
                                </div>
                                {isChecked && isExpanded && (
                                  <div style={{ background: '#FAFBFC', borderTop: '1px solid #F1F5F9', padding: '8px 14px 10px 36px' }}>
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                                      <button type="button" onClick={() => setGrantForm(p => ({ ...p, deptSelections: { ...p.deptSelections, [dept.id]: 'all' } }))}
                                        style={{ padding: '3px 10px', borderRadius: '999px', border: 'none', background: (sel === 'all' || !sel) ? '#166534' : '#F1F5F9', color: (sel === 'all' || !sel) ? 'white' : '#475569', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                                        {lang === 'ar' ? 'الكل' : 'All'} ({deptEmps.length})
                                      </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '5px' }}>
                                      {deptEmps.map(emp => {
                                        const empSel = Array.isArray(sel) ? sel.includes(emp.id) : true;
                                        return (
                                          <div key={emp.id} onClick={e => { e.stopPropagation(); setGrantForm(p => { const cur = Array.isArray(p.deptSelections[dept.id]) ? p.deptSelections[dept.id] : deptEmps.map(x => x.id); const next = cur.includes(emp.id) ? cur.filter(x => x !== emp.id) : [...cur, emp.id]; return { ...p, deptSelections: { ...p.deptSelections, [dept.id]: next } }; }); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', background: empSel ? '#DCFCE7' : 'white', border: `1px solid ${empSel ? '#BBF7D0' : '#E2E8F0'}`, color: empSel ? '#166534' : '#475569', fontWeight: empSel ? '600' : '400', transition: 'all .12s' }}>
                                            <div style={{ width: '13px', height: '13px', borderRadius: '3px', border: `2px solid ${empSel ? '#166534' : '#CBD5E1'}`, background: empSel ? '#166534' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              {empSel && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </div>
                                            {lang === 'en' ? emp.nameEn : emp.name}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* University */}
                {grantForm.scope === 'university' && (
                  <div style={{ marginBottom: '18px', padding: '14px 16px', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>{lang === 'ar' ? 'كل موظفي الجامعة' : 'All University Employees'}</div>
                      <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '2px' }}>{EMPLOYEES.length} {lang === 'ar' ? 'موظف سيستلمون المنحة' : 'employees will receive'}</div>
                    </div>
                  </div>
                )}

                {/* Dates + Reason */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={lbl}>{lang === 'ar' ? 'من تاريخ' : 'From'} *</label>
                      <input type="date" value={grantForm.from} onChange={e => setGrantForm(p => ({ ...p, from: e.target.value }))}
                        onFocus={e => e.target.style.borderColor = '#166534'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        style={{ ...inp, direction: 'ltr' }} />
                    </div>
                    <div>
                      <label style={lbl}>{lang === 'ar' ? 'إلى تاريخ' : 'To'} *</label>
                      <input type="date" value={grantForm.to} onChange={e => setGrantForm(p => ({ ...p, to: e.target.value }))}
                        onFocus={e => e.target.style.borderColor = '#166534'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        style={{ ...inp, direction: 'ltr' }} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>{lang === 'ar' ? 'سبب المنحة' : 'Reason'} *</label>
                    <input value={grantForm.reason} onChange={e => setGrantForm(p => ({ ...p, reason: e.target.value }))}
                      placeholder={lang === 'ar' ? 'مثال: إجازة عيد الفطر...' : 'e.g. Eid holiday...'}
                      onFocus={e => e.target.style.borderColor = '#166534'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                      style={inp} />
                  </div>
                </div>

                {grantError && <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FEE2E2', borderRadius: '9px', color: '#DC2626', fontSize: '13px', fontWeight: '700', border: '1px solid #FECACA' }}>{grantError}</div>}

                <button onClick={() => {
                  setGrantError('');
                  if (!grantForm.from || !grantForm.to) { setGrantError(lang === 'ar' ? 'اختر التواريخ' : 'Select dates'); return; }
                  if (!grantForm.reason.trim()) { setGrantError(lang === 'ar' ? 'اكتب السبب' : 'Enter reason'); return; }
                  if (grantForm.scope === 'employee' && !grantForm.employeeId) { setGrantError(lang === 'ar' ? 'اختر الموظف' : 'Select employee'); return; }
                  if (grantForm.scope === 'dept' && !grantForm.deptIds.length) { setGrantError(lang === 'ar' ? 'اختر قسماً على الأقل' : 'Select at least one dept'); return; }
                  setGrantStep(2);
                }} style={{ marginTop: '18px', width: '100%', padding: '12px', background: '#166534', color: 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 12px rgba(22,101,52,.25)', transition: 'all .18s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#14532D'}
                  onMouseLeave={e => e.currentTarget.style.background = '#166534'}>
                  {lang === 'ar' ? 'التالي — مراجعة →' : 'Next — Review →'}
                </button>
              </>)}

              {/* ── STEP 2: Review ── */}
              {grantStep === 2 && (() => {
                let targets = [];
                if (grantForm.scope === 'employee') targets = [grantForm.employeeId];
                else if (grantForm.scope === 'university') targets = EMPLOYEES.map(e => e.id);
                else grantForm.deptIds.forEach(dId => { const sel = grantForm.deptSelections[dId]; const emps = EMPLOYEES.filter(e => e.departmentId === dId); if (!sel || sel === 'all') emps.forEach(e => { if (!targets.includes(e.id)) targets.push(e.id); }); else sel.forEach(id => { if (!targets.includes(id)) targets.push(id); }); });
                const days = grantForm.from && grantForm.to ? Math.max(1, Math.round((new Date(grantForm.to) - new Date(grantForm.from)) / 86400000) + 1) : 0;
                return (
                  <div>
                    <div style={{ background: '#F0FDF4', borderRadius: '14px', padding: '16px 18px', marginBottom: '16px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#166534', marginBottom: '12px' }}>{lang === 'ar' ? 'ملخص المنحة' : 'Grant Summary'}</div>
                      {[
                        { l: { ar: 'المستفيدون', en: 'Recipients' }, v: `${targets.length} ${lang === 'ar' ? 'موظف' : 'employees'}` },
                        { l: { ar: 'من', en: 'From' }, v: grantForm.from },
                        { l: { ar: 'إلى', en: 'To' }, v: grantForm.to },
                        { l: { ar: 'الأيام', en: 'Days' }, v: `${days} ${lang === 'ar' ? 'يوم' : 'days'}` },
                        { l: { ar: 'السبب', en: 'Reason' }, v: grantForm.reason },
                      ].map(row => (
                        <div key={row.l.ar} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #DCFCE7', fontSize: '13px' }}>
                          <span style={{ color: '#64748B', fontWeight: '600' }}>{row.l[lang]}</span>
                          <span style={{ color: '#166534', fontWeight: '700' }}>{row.v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>{lang === 'ar' ? 'المستفيدون:' : 'Recipients:'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '100px', overflowY: 'auto', marginBottom: '18px', scrollbarWidth: 'thin', scrollbarColor: '#94A3B8 #E2E8F0' }}>
                      {targets.map(id => { const e = EMPLOYEES.find(x => x.id === id); return e ? <span key={id} style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{lang === 'en' ? e.nameEn : e.name}</span> : null; })}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => { setGrantStep(1); setGrantError(''); }} style={{ padding: '11px 20px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                        {lang === 'ar' ? 'رجوع' : 'Back'}
                      </button>
                      <button onClick={submitGrant} style={{ flex: 1, padding: '11px', background: '#166534', color: 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 12px rgba(22,101,52,.25)', transition: 'all .18s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#14532D'}
                        onMouseLeave={e => e.currentTarget.style.background = '#166534'}>
                        {lang === 'ar' ? `تأكيد المنح لـ ${targets.length} موظف` : `Confirm Grant to ${targets.length}`}
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}