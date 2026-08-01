import React, { useState, useEffect, useCallback } from 'react';
import { leavesService, employeesService, structureService } from '../services';

const LEAVE_TYPES = [
  { id: 'annual', icon: '🏖️', label: { ar: 'اعتيادي', en: 'Annual' }, days: 21, color: '#1565C0', bg: '#DBEAFE', border: '#BFDBFE' },
  { id: 'sick', icon: '🏥', label: { ar: 'مرضية', en: 'Sick' }, days: 14, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
  { id: 'urgent', icon: '⚡', label: { ar: 'عارضة', en: 'Urgent' }, days: 7, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  { id: 'compensatory', icon: '🔄', label: { ar: 'بدل راحة', en: 'Comp' }, days: 0, color: '#0891B2', bg: '#CFFAFE', border: '#A5F3FC' },
  { id: 'grant', icon: '🎁', label: { ar: 'منحة', en: 'Grant' }, days: 0, color: '#14532D', bg: '#DCFCE7', border: '#BBF7D0' },
  { id: 'maternity', icon: '🤱', label: { ar: 'وضع', en: 'Maternity' }, days: 120, color: '#BE185D', bg: '#FCE7F3', border: '#FBCFE8' },
  { id: 'unpaid', icon: '📋', label: { ar: 'بدون راتب', en: 'Unpaid' }, days: 0, color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
];

const STATUS_META = {
  pending: { label: { ar: 'معلق', en: 'Pending' }, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  approved: { label: { ar: 'موافق', en: 'Approved' }, color: '#14532D', bg: '#DCFCE7', border: '#BBF7D0' },
  rejected: { label: { ar: 'مرفوض', en: 'Rejected' }, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
};

export default function HeadLeaves({ lang, user }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('pending');
  const [modal, setModal] = useState(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leaveData, empData, deptData] = await Promise.all([
        leavesService.getLeaves({ departmentId: user?.departmentId }).catch(() => []),
        employeesService.getEmployees().catch(() => []),
        structureService.getDepartments().catch(() => [])
      ]);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
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

  const EMPLOYEES = employees;
  const DEPARTMENTS = departments;

  async function approve(id) {
    try {
      await leavesService.updateLeaveStatus(id, 'approved');
      showToast(lang==='ar'?'✅ تمت الموافقة على الإجازة':'✅ Leave approved');
      closeModal();
      loadData();
    } catch (e) {
      showToast(e.message || 'Action failed', 'error');
    }
  }

  async function handleReject(id) {
    if (!rejectNote.trim()) return;
    try {
      await leavesService.updateLeaveStatus(id, 'rejected', rejectNote);
      showToast(lang==='ar'?'❌ تم رفض الإجازة':'❌ Leave rejected', 'error');
      closeModal();
      loadData();
    } catch (e) {
      showToast(e.message || 'Action failed', 'error');
    }
  }
  const reject = handleReject;

  function getBalance(empId, typeId, days) {
    if (!days) return null;
    const used = leaves.filter(l => l.employeeId === empId && l.type === typeId && l.status === 'approved').reduce((s, l) => s + l.days, 0);
    return Math.max(0, days - used);
  }

  const pendingList = leaves.filter(l => l.status === 'pending');
  const approvedList = leaves.filter(l => l.status === 'approved');
  const rejectedList = leaves.filter(l => l.status === 'rejected');

  const filtered = (activeTab === 'all' ? leaves : leaves.filter(l => l.status === activeTab))
    .filter(l => { const e = EMPLOYEES.find(x => x.id === l.employeeId); return ((lang === 'en' ? e?.nameEn : e?.name) || '').toLowerCase().includes(search.toLowerCase()); });

  const thS = { background: '#F8FAFC', padding: '11px 14px', textAlign: 'center', fontWeight: '700', color: '#64748B', fontSize: '12px', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
  const tdS = (x = {}) => ({ padding: '11px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px', textAlign: 'center', verticalAlign: 'middle', ...x });

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Cairo,sans-serif', direction: dir, minHeight: '100%', background: '#F8FAFC' }}>
      <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .lcard { animation: popIn .3s cubic-bezier(.34,1.56,.64,1) both; transition: all .22s cubic-bezier(.34,1.56,.64,1) !important; }
        .lcard:hover { transform: translateY(-5px) !important; box-shadow: 0 16px 36px rgba(0,0,0,.1) !important; }
      `}</style>

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#16A34A', color: 'white', padding: '12px 24px', borderRadius: '14px', zIndex: 9999, fontWeight: '800', fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,.2)', whiteSpace: 'nowrap', animation: 'slideUp .25s ease' }}>{toast.msg}</div>}
      {/* ══ HERO ══ */}
      <div style={{ borderRadius: '16px', marginBottom: '18px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(13,59,122,.12)' }}>
        <div style={{ background: 'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)', padding: '18px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📅</div>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginBottom: '3px' }}>{lang === 'ar' ? 'رئيس القسم' : 'Department Head'}</div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white' }}>{lang === 'ar' ? 'إجازات القسم' : 'Dept Leaves'}</h1>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '3px' }}>{lang === 'en' ? dept?.nameEn : dept?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
            {[
              { v: leaves.filter(l => l.status === 'pending').length, l: { ar: 'معلق', en: 'Pending' }, c: '#FCD34D' },
              { v: leaves.filter(l => l.status === 'approved').length, l: { ar: 'موافق', en: 'Approved' }, c: '#4ADE80' },
              { v: leaves.filter(l => l.status === 'rejected').length, l: { ar: 'مرفوض', en: 'Rejected' }, c: '#F87171' },
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
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{leaves.length} {lang === 'ar' ? 'طلب' : 'requests'}</span>
      </div>
      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { id: 'all', icon: '📊', label: { ar: 'الكل', en: 'Total' }, v: leaves.length, c: '#334155', bg: '#F1F5F9', b: '#CBD5E1' },
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
          <span style={{ fontSize: '24px', animation: 'pulseRing 2s infinite' }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#B45309' }}>{lang === 'ar' ? `${pendingList.length} طلب في انتظار مراجعتك` : `${pendingList.length} requests pending review`}</div>
            <div style={{ fontSize: '12px', color: '#92400E', marginTop: '1px' }}>{lang === 'ar' ? 'اضغط هنا أو على أي كارت للمراجعة' : 'Click here or any card to review'}</div>
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
            {filtered.map((l, idx) => {
              const emp = EMPLOYEES.find(e => e.id === l.employeeId);
              const lt = LEAVE_TYPES.find(x => x.id === l.type);
              const bal = getBalance(l.employeeId, l.type, lt?.days);
              const low = bal !== null && bal < (lt?.days || 1) * 0.3;
              return (
                <div key={l.id} className="lcard" onClick={() => setModal(l)}
                  style={{ background: 'white', borderRadius: '16px', border: `1.5px solid ${lt?.border}`, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.06)', animationDelay: `${idx * 0.07}s` }}>
                  {/* Top bar */}
                  <div style={{ height: '4px', background: `linear-gradient(to ${lang === 'ar' ? 'left' : 'right'},${lt?.color},${lt?.color}88)` }}></div>
                  <div style={{ padding: '16px' }}>
                    {/* Row 1: Avatar + name + type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `linear-gradient(135deg,${lt?.color},${lt?.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '18px', flexShrink: 0 }}>
                        {(lang === 'en' ? emp?.nameEn : emp?.name)?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp?.email}</div>
                      </div>
                      <span style={{ background: lt?.bg, color: lt?.color, border: `1px solid ${lt?.border}`, padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{lt?.icon}</span>
                    </div>

                    {/* Row 2: Date + days */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '9px 12px', background: '#F8FAFC', borderRadius: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748B', direction: 'ltr', flex: 1 }}>{l.from} → {l.to}</span>
                      <span style={{ background: lt?.bg, color: lt?.color, border: `1px solid ${lt?.border}`, padding: '2px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>{l.days} {lang === 'ar' ? 'يوم' : 'd'}</span>
                    </div>

                    {/* Row 3: Reason */}
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {l.reason}</div>

                    {/* Row 4: Balance */}
                    {bal !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{lang === 'ar' ? 'رصيد:' : 'Bal:'}</span>
                        <div style={{ flex: 1, background: '#E8EDF5', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(bal / (lt?.days || 1) * 100)}%`, background: low ? '#D97706' : '#16A34A', height: '100%', borderRadius: '999px' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: low ? '#B45309' : '#14532D' }}>{bal} {low && '⚠️'}</span>
                      </div>
                    )}

                    {/* Row 5: Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button onClick={e => { e.stopPropagation(); approve(l.id); }}
                        onMouseEnter={e => e.currentTarget.style.background = '#14532D'}
                        onMouseLeave={e => e.currentTarget.style.background = '#166534'}
                        style={{ padding: '10px', background: '#166534', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 3px 8px rgba(22,101,52,.3)', transition: 'background .18s' }}>
                        ✅ {lang === 'ar' ? 'موافقة' : 'Approve'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setModal(l); setRejectMode(true); }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
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

      {/* ── Table for approved/rejected/all ── */}
      {activeTab !== 'pending' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{lang === 'ar' ? 'لا توجد طلبات' : 'No requests'}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '440px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ ...thS, textAlign: lang === 'ar' ? 'right' : 'left' }}>{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th style={thS}>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th style={thS}>{lang === 'ar' ? 'من' : 'From'}</th>
                  <th style={thS}>{lang === 'ar' ? 'ألى' : 'To'}</th>
                  <th style={thS}>{lang === 'ar' ? 'الأيام' : 'Days'}</th>
                  <th style={thS}>{lang === 'ar' ? 'الرصيد' : 'Bal'}</th>
                  <th style={thS}>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr></thead>
                <tbody>
                  {filtered.map((l, idx) => {
                    const emp = EMPLOYEES.find(e => e.id === l.employeeId);
                    const lt = LEAVE_TYPES.find(x => x.id === l.type);
                    const sm = STATUS_META[l.status];
                    const bal = getBalance(l.employeeId, l.type, lt?.days);
                    const low = bal !== null && bal < (lt?.days || 1) * 0.3;
                    return (
                      <tr key={l.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC', transition: 'background .15s', cursor: 'pointer' }}
                        onClick={() => setModal(l)}
                        onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFBFC'}>
                        <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left' })}>
                          <div style={{ fontWeight: '700', color: '#0F172A' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                          {l.rejectNote && <div style={{ fontSize: '10px', color: '#991B1B', marginTop: '2px' }}>↳ {l.rejectNote}</div>}
                        </td>
                        <td style={tdS()}>
                          <span style={{ background: lt?.bg, color: lt?.color, border: `1px solid ${lt?.border}`, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{lt?.icon} {lt?.label[lang]}</span>
                        </td>
                        <td style={tdS({ direction: 'ltr', color: '#64748B', fontSize: '12px' })}>{l.from}</td>
                        <td style={tdS({ direction: 'ltr', color: '#64748B', fontSize: '12px' })}>{l.to}</td>
                        <td style={tdS({ fontWeight: '900', color: '#1565C0', fontSize: '16px' })}>{l.days}</td>
                        <td style={tdS()}>
                          {bal !== null ? <span style={{ background: low ? '#FEF3C7' : '#DCFCE7', color: low ? '#B45309' : '#14532D', border: `1px solid ${low ? '#FDE68A' : '#BBF7D0'}`, padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{bal}d {low && '⚠️'}</span> : <span style={{ color: '#CBD5E1' }}>—</span>}
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
        const emp = EMPLOYEES.find(e => e.id === modal.employeeId);
        const lt = LEAVE_TYPES.find(x => x.id === modal.type);
        const bal = getBalance(modal.employeeId, modal.type, lt?.days);
        const low = bal !== null && bal < (lt?.days || 1) * 0.3;
        return (
          <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.3)', direction: dir, fontFamily: 'Cairo,sans-serif', animation: 'popIn .28s cubic-bezier(.34,1.56,.64,1)' }}>

              {/* Header */}
              <div style={{ background: `linear-gradient(135deg,${lt?.color},${lt?.color}cc)`, padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '22px', border: '2px solid rgba(255,255,255,.35)' }}>
                    {(lang === 'en' ? emp?.nameEn : emp?.name)?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '900', color: 'white' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</div>
                    <span style={{ background: 'rgba(255,255,255,.2)', color: 'white', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', marginTop: '4px', display: 'inline-block' }}>{lt?.icon} {lt?.label[lang]}</span>
                  </div>
                </div>
                <button onClick={closeModal}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,.15)', cursor: 'pointer', color: 'white', fontSize: '16px', transition: 'all .15s' }}>✕</button>
              </div>

              <div style={{ padding: '20px 22px' }}>
                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { icon: '📅', l: { ar: 'من', en: 'From' }, v: l => l.from, d: 'ltr' },
                    { icon: '📅', l: { ar: 'ألى', en: 'To' }, v: l => l.to, d: 'ltr' },
                    { icon: '🔢', l: { ar: 'الأيام', en: 'Days' }, v: l => `${l.days} ${lang === 'ar' ? 'يوم' : 'days'}`, bold: true },
                    { icon: '💬', l: { ar: 'السبب', en: 'Reason' }, v: l => l.reason },
                  ].map(r => (
                    <div key={r.l.ar} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '11px 13px', border: '1px solid #E8EDF5' }}>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', marginBottom: '3px' }}>{r.icon} {r.l[lang]}</div>
                      <div style={{ fontSize: '13px', fontWeight: r.bold ? '900' : '600', color: r.bold ? lt?.color : '#0F172A', direction: r.d || 'inherit' }}>{r.v(modal)}</div>
                    </div>
                  ))}
                </div>

                {/* Balance */}
                {bal !== null && (
                  <div style={{ background: low ? '#FEF9C3' : '#DCFCE7', borderRadius: '12px', padding: '11px 14px', marginBottom: '14px', border: `1px solid ${low ? '#FDE68A' : '#BBF7D0'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{low ? '⚠️' : '✅'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: low ? '#B45309' : '#14532D', marginBottom: '4px' }}>
                        {lang === 'ar' ? `رصيد ${lt?.label.ar} المتبقي: ${bal} / ${lt?.days} يوم` : `${lt?.label.en} balance: ${bal} / ${lt?.days} days`}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(bal / (lt?.days || 1) * 100)}%`, background: low ? '#D97706' : '#16A34A', height: '100%', borderRadius: '999px' }}></div>
                      </div>
                    </div>
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
                      onMouseLeave={e => { e.currentTarget.style.background = '#166534'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      style={{ padding: '13px', background: '#166534', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 14px rgba(22,101,52,.3)', transition: 'all .2s' }}>
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
                    <button onClick={reject} disabled={!rejectNote.trim()}
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
    </div>
  );
}