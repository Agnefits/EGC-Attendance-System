import React, { useState, useEffect, useCallback } from 'react';
import { permissionsService, employeesService, structureService } from '../services';

const PERM_TYPES = {
  morning: { icon: '🌅', label: { ar: 'صباحي', en: 'Morning' }, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  evening: { icon: '🌆', label: { ar: 'مسائي', en: 'Evening' }, color: '#0891B2', bg: '#CFFAFE', border: '#A5F3FC' },
  exceptional: { icon: '⚡', label: { ar: 'استثنائي', en: 'Exceptional' }, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
  nursing: { icon: '👶', label: { ar: 'رضاعة', en: 'Nursing' }, color: '#BE185D', bg: '#FCE7F3', border: '#FBCFE8' },
};

const STATUS_META = {
  pending: { label: { ar: 'معلق', en: 'Pending' }, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  approved: { label: { ar: 'موافق', en: 'Approved' }, color: '#14532D', bg: '#DCFCE7', border: '#BBF7D0' },
  rejected: { label: { ar: 'مرفوض', en: 'Rejected' }, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
};

const MONTHLY_BUDGET = 240;

export default function HeadPermissions({ lang, user }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('pending');
  const [modal, setModal] = useState(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const emptyCreateForm = { employeeId: '', type: 'morning', date: new Date().toISOString().slice(0, 10), duration: 60, reason: '' };
  const [createOpen, setCreateOpen] = useState(false);
  const [cForm, setCForm] = useState(emptyCreateForm);
  const [saving, setSaving] = useState(false);

  // Normalize backend field names (permissionType, durationMinutes, status)
  // to the shape the rest of this component expects (type, duration, status).
  const normalizePermission = (p) => ({
    ...p,
    id: p.id ?? p.Id ?? '',
    employeeId: p.employeeId ?? p.EmployeeId ?? '',
    employeeName: p.employeeName ?? p.EmployeeName ?? '',
    department: p.department ?? p.Department ?? '',
    type: String(p.type ?? p.permissionType ?? p.PermissionType ?? '').toLowerCase(),
    status: String(p.status ?? p.Status ?? 'pending').toLowerCase(),
    duration: Number(p.durationMinutes ?? p.DurationMinutes ?? p.duration ?? 0),
    date: p.date ?? p.Date ?? '',
    reason: p.reason ?? p.Reason ?? '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [permData, empData, deptData] = await Promise.all([
        permissionsService.getPermissions({ departmentId: user?.departmentId }).catch(() => []),
        employeesService.getEmployees().catch(() => []),
        structureService.getDepartments().catch(() => [])
      ]);
      setPermissions((Array.isArray(permData) ? permData : []).map(normalizePermission));
      setEmployees(Array.isArray(empData) ? empData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.departmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dept = departments.find(d => d.id === user?.departmentId || d.name === user?.department);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }
  function closeModal() { setModal(null); setRejectMode(false); setRejectNote(''); }

  function openCreate() { setCForm(emptyCreateForm); setCreateOpen(true); }
  function closeCreate() { setCreateOpen(false); setCForm(emptyCreateForm); }

  async function handleCreate() {
    if (!cForm.employeeId) { showToast(lang === 'ar' ? 'اختر الموظف أولاً' : 'Select an employee', 'error'); return; }
    if (!cForm.duration || Number(cForm.duration) <= 0) { showToast(lang === 'ar' ? 'المدة يجب أن تكون أكبر من صفر' : 'Duration must be greater than zero', 'error'); return; }
    try {
      setSaving(true);
      await permissionsService.createForEmployee(cForm.employeeId, {
        permissionType: cForm.type,
        date: cForm.date,
        durationMinutes: Number(cForm.duration),
        reason: cForm.reason || '',
      });
      showToast(lang === 'ar' ? '✅ تم منح الإذن' : '✅ Permission granted');
      closeCreate();
      loadData();
    } catch (e) {
      showToast(e?.message || (lang === 'ar' ? 'فشل منح الإذن' : 'Failed to grant permission'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const EMPLOYEES = employees;

  async function handleApprove(id) {
    try {
      await permissionsService.updatePermissionStatus(id, 'approved');
      showToast(lang==='ar' ? '✅ تمت الموافقة' : '✅ Approved');
      closeModal();
      loadData();
    } catch (e) {
      showToast(e.message || 'Action failed', 'error');
    }
  }

  async function handleReject(id) {
    if (!rejectNote.trim()) return;
    try {
      await permissionsService.updatePermissionStatus(id, 'rejected', rejectNote);
      showToast(lang==='ar' ? '❌ تم الرفض' : '❌ Rejected', 'error');
      closeModal();
      loadData();
    } catch (e) {
      showToast(e.message || 'Action failed', 'error');
    }
  }

  const approve = handleApprove;
  const reject = handleReject;

// Used minutes per employee this month (excluding exceptional & nursing)
function usedMins(empId) {
  return permissions.filter(p => p.employeeId === empId && p.status !== 'rejected' && p.type !== 'exceptional' && p.type !== 'nursing').reduce((s, p) => s + p.duration, 0);
}

const pendingList = permissions.filter(p => p.status === 'pending');
const approvedList = permissions.filter(p => p.status === 'approved');
const rejectedList = permissions.filter(p => p.status === 'rejected');

const filtered = (activeTab === 'all' ? permissions : permissions.filter(p => p.status === activeTab))
  .filter(p => { const e = EMPLOYEES.find(x => x.id === p.employeeId); return (((lang === 'en' ? e?.nameEn : e?.name) || p.employeeName) || '').toLowerCase().includes(search.toLowerCase()); });

const thS = { background: '#F8FAFC', padding: '11px 14px', textAlign: 'center', fontWeight: '700', color: '#64748B', fontSize: '12px', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const tdS = (x = {}) => ({ padding: '11px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', ...x });

return (
  <div className="page-pad" style={{ fontFamily: 'Cairo,sans-serif', direction: dir, minHeight: '100%', background: '#F8FAFC' }}>
    <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .pcard { animation: popIn .3s cubic-bezier(.34,1.56,.64,1) both; transition: all .22s cubic-bezier(.34,1.56,.64,1) !important; }
        .pcard:hover { transform: translateY(-5px) !important; box-shadow: 0 16px 36px rgba(0,0,0,.1) !important; }
      `}</style>

    {/* Toast */}
    {toast && <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#16A34A', color: 'white', padding: '12px 24px', borderRadius: '14px', zIndex: 9999, fontWeight: '800', fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,.2)', whiteSpace: 'nowrap', animation: 'slideUp .25s ease' }}>{toast.msg}</div>}
    {/* ══ HERO ══ */}
    <div style={{ borderRadius: '16px', marginBottom: '18px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(13,59,122,.12)' }}>
      <div style={{ background: 'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)', padding: '18px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⏱️</div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginBottom: '3px' }}>{lang === 'ar' ? 'رئيس القسم' : 'Department Head'}</div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white' }}>{lang === 'ar' ? 'أذونات القسم' : 'Dept Permissions'}</h1>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '3px' }}>{lang === 'en' ? dept?.nameEn : dept?.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
          {[
            { v: permissions.filter(p => p.status === 'pending').length, l: { ar: 'معلق', en: 'Pending' }, c: '#FCD34D' },
            { v: permissions.filter(p => p.status === 'approved').length, l: { ar: 'موافق', en: 'Approved' }, c: '#4ADE80' },
            { v: permissions.filter(p => p.status === 'rejected').length, l: { ar: 'مرفوض', en: 'Rejected' }, c: '#F87171' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)', marginTop: '2px', fontWeight: '600' }}>{s.l[lang]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Search */}
    <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: lang === 'ar' ? '10px' : 'auto', left: lang === 'ar' ? 'auto' : '10px', color: '#94A3B8', pointerEvents: 'none', fontSize: '14px' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={lang === 'ar' ? 'بحث باسم الموظف...' : 'Search employee...'}
          style={{ padding: lang === 'ar' ? '9px 34px 9px 12px' : '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', width: '220px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}
          onFocus={e => e.target.style.borderColor = '#1565C0'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{permissions.length} {lang === 'ar' ? 'طلب' : 'requests'}</span>
        <button onClick={openCreate}
          style={{ background: 'linear-gradient(135deg,#1565C0,#1E88E5)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 16px', fontFamily: 'Cairo', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(21,101,192,.28)', whiteSpace: 'nowrap' }}>
          + {lang === 'ar' ? 'منح إذن' : 'Grant permission'}
        </button>
      </div>
    </div>
    {/* ── Stats ── */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
      {[
        { id: 'all', icon: '📊', label: { ar: 'الكل', en: 'Total' }, v: permissions.length, c: '#334155', bg: '#F1F5F9', b: '#CBD5E1' },
        { id: 'pending', icon: '⏳', label: { ar: 'معلقة', en: 'Pending' }, v: pendingList.length, c: '#B45309', bg: '#FEF3C7', b: '#FDE68A' },
        { id: 'approved', icon: '✅', label: { ar: 'موافق', en: 'Approved' }, v: approvedList.length, c: '#14532D', bg: '#DCFCE7', b: '#BBF7D0' },
        { id: 'rejected', icon: '❌', label: { ar: 'مرفوضة', en: 'Rejected' }, v: rejectedList.length, c: '#991B1B', bg: '#FEE2E2', b: '#FECACA' },
      ].map(s => (
        <div key={s.id} onClick={() => setActiveTab(s.id)}
          style={{ background: activeTab === s.id ? s.bg : 'white', borderRadius: '16px', padding: '16px 18px', border: `1.5px solid ${activeTab === s.id ? s.c : s.b}`, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: activeTab === s.id ? `0 4px 16px ${s.b}88` : '0 2px 6px rgba(0,0,0,.04)', transition: 'all .2s' }}
          onMouseEnter={e => { if (activeTab !== s.id) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${s.b}55`; } }}
          onMouseLeave={e => { if (activeTab !== s.id) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,.04)'; } }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: activeTab === s.id ? 'white' : s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{s.label[lang]}</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: s.c, lineHeight: 1 }}>{s.v}</div>
          </div>
        </div>
      ))}
    </div>

    {/* ── Pending alert ── */}
    {pendingList.length > 0 && activeTab !== 'pending' && (
      <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FFFBEB)', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('pending')}>
        <span style={{ fontSize: '24px' }}>⏳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#B45309' }}>{lang === 'ar' ? `${pendingList.length} طلب إذن في انتظار مراجعتك` : `${pendingList.length} permission requests pending`}</div>
          <div style={{ fontSize: '12px', color: '#92400E', marginTop: '1px' }}>{lang === 'ar' ? 'اضغط للمراجعة' : 'Click to review'}</div>
        </div>
        <span style={{ background: '#B45309', color: 'white', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>{lang === 'ar' ? 'مراجعة →' : 'Review →'}</span>
      </div>
    )}

    {/* ── Pending Cards ── */}
    {activeTab === 'pending' && (
      filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8EDF5', padding: '56px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎉</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>{lang === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>{lang === 'ar' ? 'أنجزت جميع الطلبات 👏' : 'All done 👏'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px' }}>
          {filtered.map((p, idx) => {
            const emp = EMPLOYEES.find(e => e.id === p.employeeId)
              || { name: p.employeeName, nameEn: p.employeeName, email: '' };
            const pt = PERM_TYPES[p.type];
            const used = usedMins(p.employeeId);
            const rem = Math.max(0, MONTHLY_BUDGET - used);
            const isDeducted = p.type !== 'exceptional' && p.type !== 'nursing';
            const lowBalance = isDeducted && rem < 60;
            return (
              <div key={p.id} className="pcard" onClick={() => setModal(p)}
                style={{ background: 'white', borderRadius: '16px', border: `1.5px solid ${pt?.border}`, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.06)', animationDelay: `${idx * 0.07}s` }}>
                <div style={{ height: '4px', background: `linear-gradient(to ${lang === 'ar' ? 'left' : 'right'},${pt?.color},${pt?.color}88)` }}></div>
                <div style={{ padding: '16px' }}>
                  {/* Row 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `linear-gradient(135deg,${pt?.color},${pt?.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '18px', flexShrink: 0 }}>
                      {(lang === 'en' ? emp?.nameEn : emp?.name)?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{emp?.email}</div>
                    </div>
                    <span style={{ background: pt?.bg, color: pt?.color, border: `1px solid ${pt?.border}`, padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{pt?.icon}</span>
                  </div>

                  {/* Row 2: date + duration */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '9px 12px', background: '#F8FAFC', borderRadius: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B', direction: 'ltr', flex: 1 }}>{p.date}</span>
                    <span style={{ background: pt?.bg, color: pt?.color, border: `1px solid ${pt?.border}`, padding: '2px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>{p.duration} {lang === 'ar' ? 'د' : 'm'}</span>
                  </div>

                  {/* Row 3: reason */}
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {p.reason}</div>

                  {/* Row 4: balance bar (only for morning/evening) */}
                  {isDeducted && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{lang === 'ar' ? 'رصيد الأذونات' : 'Perm balance'}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: lowBalance ? '#B45309' : '#14532D' }}>{rem}/{MONTHLY_BUDGET} {lang === 'ar' ? 'د' : 'm'} {lowBalance && '⚠️'}</span>
                      </div>
                      <div style={{ background: '#E8EDF5', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(rem / MONTHLY_BUDGET * 100)}%`, background: lowBalance ? '#D97706' : '#16A34A', height: '100%', borderRadius: '999px' }}></div>
                      </div>
                    </div>
                  )}
                  {!isDeducted && (
                    <div style={{ marginBottom: '12px', padding: '7px 10px', background: pt?.bg, borderRadius: '8px', border: `1px solid ${pt?.border}`, fontSize: '11px', color: pt?.color, fontWeight: '600' }}>
                      ✓ {lang === 'ar' ? 'لا يخصم من رصيد الأذونات الشهري' : 'Does not deduct from monthly balance'}
                    </div>
                  )}

                  {/* Row 5: actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button onClick={e => { e.stopPropagation(); approve(p.id); }}
                      onMouseEnter={e => e.currentTarget.style.background = '#14532D'}
                      onMouseLeave={e => e.currentTarget.style.background = '#166634'}
                      style={{ padding: '10px', background: '#166634', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 3px 8px rgba(22,101,52,.3)', transition: 'background .18s' }}>
                      ✅ {lang === 'ar' ? 'موافقة' : 'Approve'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setModal(p); setRejectMode(true); }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      style={{ padding: '10px', background: 'white', color: '#991B1B', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'background .18s' }}>
                      ✕ {lang === 'ar' ? 'رفض' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )
    )}

    {/* ── Table ── */}
    {activeTab !== 'pending' && (
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏱️</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{lang === 'ar' ? 'لا توجد طلبات' : 'No requests'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '440px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ ...thS, textAlign: lang === 'ar' ? 'right' : 'left' }}>{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th style={thS}>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                <th style={thS}>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th style={thS}>{lang === 'ar' ? 'المدة' : 'Duration'}</th>
                <th style={thS}>{lang === 'ar' ? 'الرصيد' : 'Balance'}</th>
                <th style={thS}>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr></thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const emp = EMPLOYEES.find(e => e.id === p.employeeId)
                    || { name: p.employeeName, nameEn: p.employeeName, email: '' };
                  const pt = PERM_TYPES[p.type];
                  const sm = STATUS_META[p.status];
                  const used = usedMins(p.employeeId);
                  const rem = Math.max(0, MONTHLY_BUDGET - used);
                  const isDeducted = p.type !== 'exceptional' && p.type !== 'nursing';
                  const low = isDeducted && rem < 60;
                  return (
                    <tr key={p.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC', cursor: 'pointer', transition: 'background .15s' }}
                      onClick={() => setModal(p)}
                      onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFBFC'}>
                      <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left' })}>
                        <div style={{ fontWeight: '700', color: '#0F172A' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                        {p.rejectNote && <div style={{ fontSize: '10px', color: '#991B1B', marginTop: '2px' }}>↳ {p.rejectNote}</div>}
                      </td>
                      <td style={tdS()}>
                        <span style={{ background: pt?.bg, color: pt?.color, border: `1px solid ${pt?.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{pt?.icon} {pt?.label[lang]}</span>
                      </td>
                      <td style={tdS({ direction: 'ltr', color: '#64748B', fontSize: '12px' })}>{p.date}</td>
                      <td style={tdS({ fontWeight: '800', color: '#334155' })}>{p.duration} {lang === 'ar' ? 'د' : 'm'}</td>
                      <td style={tdS()}>
                        {isDeducted ? <span style={{ background: low ? '#FEF3C7' : '#DCFCE7', color: low ? '#B45309' : '#14532D', border: `1px solid ${low ? '#FDE68A' : '#BBF7D0'}`, padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{rem}د {low && '⚠️'}</span> : <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>}
                      </td>
                      <td style={tdS()}>
                        <span style={{ background: sm?.bg, color: sm?.color, border: `1px solid ${sm?.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{sm?.label[lang]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    {/* ── Modal ── */}
    {modal && (() => {
      const emp = EMPLOYEES.find(e => e.id === modal.employeeId)
        || { name: modal.employeeName, nameEn: modal.employeeName, email: '' };
      const pt = PERM_TYPES[modal.type];
      const used = usedMins(modal.employeeId);
      const rem = Math.max(0, MONTHLY_BUDGET - used);
      const isDeducted = modal.type !== 'exceptional' && modal.type !== 'nursing';
      const low = isDeducted && rem < 60;
      return (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.3)', direction: dir, fontFamily: 'Cairo,sans-serif', animation: 'popIn .28s cubic-bezier(.34,1.56,.64,1)' }}>

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg,${pt?.color},${pt?.color}cc)`, padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '22px', border: '2px solid rgba(255,255,255,.35)' }}>
                  {(lang === 'en' ? emp?.nameEn : emp?.name)?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: 'white' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                  <span style={{ background: 'rgba(255,255,255,.2)', color: 'white', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', marginTop: '4px', display: 'inline-block' }}>{pt?.icon} {pt?.label[lang]}</span>
                </div>
              </div>
              <button onClick={closeModal}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,.15)', cursor: 'pointer', color: 'white', fontSize: '16px', transition: 'all .15s' }}>✕</button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              {/* Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {[
                  { icon: '📅', l: { ar: 'التاريخ', en: 'Date' }, v: modal.date, d: 'ltr' },
                  { icon: '⏱', l: { ar: 'المدة', en: 'Duration' }, v: `${modal.duration} ${lang === 'ar' ? 'دقيقة' : 'min'}`, bold: true },
                  { icon: '💬', l: { ar: 'السبب', en: 'Reason' }, v: modal.reason, full: true },
                ].map(r => (
                  <div key={r.l.ar} style={{ gridColumn: r.full ? '1 / -1' : 'auto', background: '#F8FAFC', borderRadius: '12px', padding: '11px 13px', border: '1px solid #E8EDF5' }}>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', marginBottom: '3px' }}>{r.icon} {r.l[lang]}</div>
                    <div style={{ fontSize: '13px', fontWeight: r.bold ? '900' : '600', color: r.bold ? pt?.color : '#0F172A', direction: r.d || 'inherit' }}>{r.v}</div>
                  </div>
                ))}
              </div>

              {/* Balance */}
              {isDeducted && (
                <div style={{ background: low ? '#FEF9C3' : '#DCFCE7', borderRadius: '12px', padding: '11px 14px', marginBottom: '14px', border: `1px solid ${low ? '#FDE68A' : '#BBF7D0'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{low ? '⚠️' : '✅'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: low ? '#B45309' : '#14532D', marginBottom: '4px' }}>
                      {lang === 'ar' ? `رصيد الأذونات المتبقي: ${rem} / ${MONTHLY_BUDGET} دقيقة` : `Permission balance: ${rem} / ${MONTHLY_BUDGET} min`}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(rem / MONTHLY_BUDGET * 100)}%`, background: low ? '#D97706' : '#16A34A', height: '100%', borderRadius: '999px' }}></div>
                    </div>
                  </div>
                </div>
              )}
              {!isDeducted && (
                <div style={{ background: pt?.bg, borderRadius: '12px', padding: '11px 14px', marginBottom: '14px', border: `1px solid ${pt?.border}`, fontSize: '12px', color: pt?.color, fontWeight: '600' }}>
                  ✓ {lang === 'ar' ? 'هذا الإذن لا يخصم من الرصيد الشهري' : 'This permission does not deduct from monthly balance'}
                </div>
              )}

              {/* Reject textarea */}
              {rejectMode && (
                <div style={{ marginBottom: '14px', animation: 'slideUp .2s ease' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#991B1B', marginBottom: '6px' }}>⚠️ {lang === 'ar' ? 'سبب الرفض (مطلوب)' : 'Rejection Reason (required)'}</label>
                  <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} autoFocus rows={3}
                    placeholder={lang === 'ar' ? 'اكتب سبب الرفض بوضوح...' : 'Write a clear rejection reason...'}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #FECACA', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', resize: 'none', background: '#FFF5F5', boxSizing: 'border-box' }} />
                </div>
              )}

              {/* Buttons */}
              {!rejectMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => approve(modal.id)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#14532D'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#166634'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    style={{ padding: '13px', background: '#166634', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 14px rgba(22,101,52,.3)', transition: 'all .2s' }}>
                    ✅ {lang === 'ar' ? 'موافقة' : 'Approve'}
                  </button>
                  <button onClick={() => setRejectMode(true)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    style={{ padding: '13px', background: 'white', color: '#991B1B', border: '1.5px solid #FECACA', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .2s' }}>
                    ✕ {lang === 'ar' ? 'رفض' : 'Reject'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => reject(modal.id)} disabled={!rejectNote.trim()}
                    style={{ flex: 1, padding: '13px', background: rejectNote.trim() ? '#991B1B' : '#E2E8F0', color: rejectNote.trim() ? 'white' : '#94A3B8', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: rejectNote.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Cairo', transition: 'all .18s', boxShadow: rejectNote.trim() ? '0 4px 12px rgba(153,27,27,.3)' : 'none' }}>
                    {lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}
                  </button>
                  <button onClick={() => { setRejectMode(false); setRejectNote(''); }}
                    style={{ padding: '13px 18px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                    {lang === 'ar' ? 'رجوع' : 'Back'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── Create (grant) permission modal ── */}
    {createOpen && (
      <div onClick={closeCreate} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.3)', direction: dir, fontFamily: 'Cairo,sans-serif', animation: 'popIn .28s cubic-bezier(.34,1.56,.64,1)' }}>

          <div style={{ background: 'linear-gradient(135deg,#0D3B7A,#1565C0)', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '17px', fontWeight: '900', color: 'white' }}>➕ {lang === 'ar' ? 'منح إذن لموظف' : 'Grant permission'}</div>
            <button onClick={closeCreate}
              style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,.15)', cursor: 'pointer', color: 'white', fontSize: '16px' }}>✕</button>
          </div>

          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Employee */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>{lang === 'ar' ? 'الموظف' : 'Employee'}</label>
              <select value={cForm.employeeId} onChange={e => setCForm(f => ({ ...f, employeeId: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="">{lang === 'ar' ? '— اختر الموظف —' : '— Select employee —'}</option>
                {EMPLOYEES.map(e => (
                  <option key={e.id} value={e.id}>{lang === 'en' ? (e.nameEn || e.name) : (e.name || e.nameEn)}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>{lang === 'ar' ? 'نوع الإذن' : 'Permission type'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.entries(PERM_TYPES).map(([key, t]) => (
                  <button key={key} onClick={() => setCForm(f => ({ ...f, type: key }))}
                    style={{ padding: '9px 10px', borderRadius: '10px', border: `1.5px solid ${cForm.type === key ? t.color : '#E2E8F0'}`, background: cForm.type === key ? t.bg : 'white', color: cForm.type === key ? t.color : '#475569', fontFamily: 'Cairo', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textAlign: 'start' }}>
                    {t.icon} {t.label[lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                <input type="date" value={cForm.date} onChange={e => setCForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>{lang === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)'}</label>
                <input type="number" min="1" value={cForm.duration} onChange={e => setCForm(f => ({ ...f, duration: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>{lang === 'ar' ? 'السبب' : 'Reason'}</label>
              <textarea value={cForm.reason} onChange={e => setCForm(f => ({ ...f, reason: e.target.value }))} rows={2}
                placeholder={lang === 'ar' ? 'اختياري...' : 'Optional...'}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={handleCreate} disabled={saving}
                style={{ flex: 1, padding: '13px', background: saving ? '#94A3B8' : 'linear-gradient(135deg,#1565C0,#1E88E5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 14px rgba(21,101,192,.3)' }}>
                {saving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'منح الإذن' : 'Grant')}
              </button>
              <button onClick={closeCreate}
                style={{ padding: '13px 18px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}