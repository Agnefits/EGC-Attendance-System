import { validateLeaveRequest, getLeaveTypeHint, calcWorkDays, calcUsedLeaveDays, getLeaveYearPeriod, calcUsedPermsMins } from './leaveValidation';
import React, { useState, useEffect, useCallback } from 'react';
import { leavesService, employeesService, structureService, attendanceService } from '../services';

const LEAVE_TYPES = [
  { id: 'annual', icon: '🏖️', label: { ar: 'اعتيادي', en: 'Annual' }, days: 21, color: '#1565C0', bg: '#DBEAFE', border: '#BFDBFE', desc: { ar: 'إجازة اعتيادية سنوية — 21 يوم في السنة', en: 'Annual leave — 21 days per year' } },
  { id: 'sick', icon: '🏥', label: { ar: 'مرضية', en: 'Sick' }, days: 14, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA', desc: { ar: 'إجازة مرضية بتقرير طبي — 14 يوم في السنة', en: 'Sick leave with medical report — 14 days/year' } },
  { id: 'urgent', icon: '⚡', label: { ar: 'عارضة', en: 'Urgent' }, days: 7, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', desc: { ar: 'إجازة عارضة لظروف طارئة — 7 أيام في السنة', en: 'Urgent leave for emergencies — 7 days/year' } },
  { id: 'compensatory', icon: '🔄', label: { ar: 'بدل راحة', en: 'Compensatory' }, days: 0, color: '#6B21A8', bg: '#EDE9FE', border: '#DDD6FE', desc: { ar: 'بدل أيام عمل في إجازة — بحسب الأيام المسجلة', en: 'Compensation for working on holidays' } },
  { id: 'grant', icon: '🎁', label: { ar: 'منحة (إدارة فقط)', en: 'Grant (Admin only)' }, days: 0, color: '#14532D', bg: '#DCFCE7', border: '#BBF7D0', desc: { ar: 'إجازة ممنوحة من الإدارة', en: 'Leave granted by management' } },
  { id: 'unpaid', icon: '📋', label: { ar: 'بدون راتب', en: 'Unpaid' }, days: 0, color: '#475569', bg: '#F1F5F9', border: '#CBD5E1', desc: { ar: 'إجازة بدون راتب — بموافقة الإدارة', en: 'Unpaid leave — requires management approval' } },
  { id: 'maternity', icon: '🤱', label: { ar: 'وضع', en: 'Maternity' }, days: 120, color: '#BE185D', bg: '#FCE7F3', border: '#FBCFE8', desc: { ar: 'إجازة وضع — 4 أشهر (120 يوم)', en: 'Maternity leave — 4 months (120 days)' }, womenOnly: true },
];

const STATUS_META = {
  pending: { label: { ar: 'معلق', en: 'Pending' }, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  approved: { label: { ar: 'موافق', en: 'Approved' }, color: '#14532D', bg: '#DCFCE7', border: '#BBF7D0' },
  rejected: { label: { ar: 'مرفوض', en: 'Rejected' }, color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
};

function EmployeeLeaves({ lang, user }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [myLeaveData, empData, deptData, attData] = await Promise.all([
        leavesService.getMyLeaves().catch(() => []),
        employeesService.getEmployees().catch(() => []),
        structureService.getDepartments().catch(() => []),
        attendanceService.getAttendanceLogs().catch(() => [])
      ]);
      setRequests(Array.isArray(myLeaveData) ? myLeaveData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myEmp = employees.find(e => e.id === user?.employeeId || e.id === user?.id) || { name: user?.name, email: user?.email };
  const myDept = departments.find(d => d.id === myEmp?.departmentId || d.name === myEmp?.department);
  const ATTENDANCE = attendance;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({ from: '', to: '', reason: '' });
  const [formError, setFormError] = useState('');
  const [editId, setEditId] = useState(null);
  const [maternityMode, setMaternityMode] = useState(''); // 'birth' | 'ninth'
  const [birthDate, setBirthDate] = useState('');
  const [ninthDate, setNinthDate] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Used days per type
  function usedDays(typeId) {
    return requests.filter(r => r.type === typeId && r.status === 'approved').reduce((s, r) => s + r.days, 0);
  }

  function remainingDays(lt) {
    if (!lt.days) return null;
    return Math.max(0, lt.days - usedDays(lt.id));
  }

  function openModal(lt) {
    setSelectedType(lt);
    setForm({ from: '', to: '', reason: '' });
    setFormError('');
    setEditId(null);
    setMaternityMode('');
    setBirthDate('');
    setNinthDate('');
    setModalOpen(true);
  }

  function openEdit(req) {
    const lt = LEAVE_TYPES.find(x => x.id === req.type);
    setSelectedType(lt);
    setForm({ from: req.from, to: req.to, reason: req.reason });
    setFormError('');
    setEditId(req.id);
    setModalOpen(true);
  }

  function calcDays(from, to) {
    if (!from || !to) return 0;
    return Math.max(1, Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1);
  }

  function computeMaternityDates() {
    if (!maternityMode) return null;
    let from = '';
    if (maternityMode === 'birth') {
      if (!birthDate) return null;
      from = birthDate;
    } else {
      if (!ninthDate) return null;
      from = ninthDate;
    }
    const fromD = new Date(from);
    const toD = new Date(fromD);
    toD.setDate(toD.getDate() + 119);
    return { from: fromD.toISOString().split('T')[0], to: toD.toISOString().split('T')[0], days: 120 };
  }

  async function submitRequest() {
    setFormError('');

    // Maternity special handling
    if (selectedType?.id === 'maternity') {
      if (!maternityMode) { setFormError(lang === 'ar' ? 'يرجى اختيار طريقة احتساب الإجازة' : 'Select maternity calculation method'); return; }
      if (maternityMode === 'birth' && !birthDate) { setFormError(lang === 'ar' ? 'يرجى إدخال تاريخ الوضع' : 'Enter birth date'); return; }
      if (maternityMode === 'ninth' && !ninthDate) { setFormError(lang === 'ar' ? 'يرجى إدخال بداية الشهر التاسع' : 'Enter 9th month start date'); return; }
      if (!form.reason.trim()) { setFormError(lang === 'ar' ? 'يرجى إدخال السبب' : 'Enter reason'); return; }
      const dates = computeMaternityDates();
      if (!dates) return;
      try {
        await leavesService.submitLeaveRequest({
          type: 'maternity',
          from: dates.from,
          to: dates.to,
          reason: form.reason.trim(),
          maternityMode
        });
        showToast(lang === 'ar' ? '✅ تم تقديم طلب إجازة الوضع' : '✅ Maternity leave submitted');
        setModalOpen(false);
        loadData();
      } catch (err) {
        setFormError(err.message || 'Submission failed');
      }
      return;
    }

    if (!form.from || !form.to) { setFormError(lang === 'ar' ? 'يرجى تحديد تاريخ البداية والنهاية' : 'Select from and to dates'); return; }
    if (!form.reason.trim()) { setFormError(lang === 'ar' ? 'يرجى إدخال سبب الإجازة' : 'Enter leave reason'); return; }

    const days = calcWorkDays(form.from, form.to); // Fridays excluded automatically
    const lt = selectedType;

    // ── Shared validation ──
    const valErr = validateLeaveRequest({
      type: lt.id,
      from: form.from,
      to: form.to,
      employeeId: user?.employeeId,
      lang,
      grantedByAdmin: false,
      editId,
    });
    try {
      await leavesService.submitLeaveRequest({
        type: lt.id,
        from: form.from,
        to: form.to,
        reason: form.reason.trim()
      });
      showToast(lang === 'ar' ? '✅ تم تقديم طلب الإجازة بنجاح' : '✅ Leave request submitted');
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Submission failed');
    }
  }

  function deleteRequest(id) {
    setRequests(p => p.filter(r => r.id !== id));
    showToast(lang === 'ar' ? 'تم حذف الطلب' : 'Request deleted');
  }

const myRequests = requests;
const pendingCount = myRequests.filter(r => r.status === 'pending').length;
const filtered = activeTab === 'all' ? myRequests : myRequests.filter(r => r.status === activeTab);

const thS = { background: '#F8FAFC', padding: '13px 16px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const tdS = (x = {}) => ({ padding: '13px 16px', borderBottom: '1px solid #F8FAFC', fontSize: '14px', textAlign: 'center', verticalAlign: 'middle', ...x });

const pt = selectedType;
const previewDays = calcDays(form.from, form.to);

return (
  <div style={{ padding: '24px', fontFamily: 'Cairo, sans-serif', direction: dir }}>

    {/* Toast */}
    {toast && (
      <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#16A34A', color: 'white', padding: '14px 28px', borderRadius: '16px', zIndex: 9999, fontWeight: '800', fontSize: '14px', boxShadow: '0 12px 32px rgba(0,0,0,.2)', whiteSpace: 'nowrap' }}>
        {toast.msg}
      </div>
    )}

    {/* Header */}
    <div style={{ borderRadius: '16px', marginBottom: '18px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(13,59,122,.15)' }}>
      <div style={{ background: 'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)', padding: '20px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {myEmp && (
            <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '19px', flexShrink: 0 }}>
              {(lang === 'en' ? myEmp.nameEn : myEmp.name)?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginBottom: '2px' }}>{lang === 'ar' ? 'إدارة الإجازات' : 'Leave Management'}</div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: 'white' }}>{lang === 'ar' ? 'إجازاتي' : 'My Leaves'}</h1>
            {myEmp && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '2px' }}>{lang === 'en' ? myEmp.nameEn : myEmp.name} · {user?.role === 'hr' ? (lang === 'en' ? 'HR Manager' : 'موارد بشرية') : (lang === 'en' ? myDept?.nameEn : myDept?.name)}</div>}
          </div>
        </div>
        <p style={{ margin: 0, color: 'rgba(255,255,255,.6)', fontSize: '12px' }}>
          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>

    {/* Leave type cards */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
      {LEAVE_TYPES.filter(lt => !(lt.womenOnly && myEmp?.gender !== 'female' && user?.gender !== 'female')).map(lt => {
        const used = usedDays(lt.id);
        const rem = remainingDays(lt);
        const pct = lt.days > 0 ? Math.round(used / lt.days * 100) : 0;
        return (
          <div key={lt.id}
            onClick={() => lt.id !== 'grant' && openModal(lt)}
            onMouseEnter={e => { if (lt.id === 'grant') return; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${lt.border}88`; e.currentTarget.style.border = `1.5px solid ${lt.color}`; }}
            onMouseLeave={e => { if (lt.id === 'grant') return; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'; e.currentTarget.style.border = `1.5px solid ${lt.border}`; }}
            style={{ width: '200px', background: lt.id === 'grant' ? '#F8FAFC' : 'white', borderRadius: '20px', padding: '20px', border: `1.5px solid ${lt.border}`, cursor: lt.id === 'grant' ? 'not-allowed' : 'pointer', transition: 'all .25s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 2px 8px rgba(0,0,0,.04)', overflow: 'hidden', position: 'relative', opacity: lt.id === 'grant' ? 0.55 : 1 }}>
            {/* Top color bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: lt.color, borderRadius: '20px 20px 0 0' }}></div>
            {/* Icon */}
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: lt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '12px' }}>{lt.icon}</div>
            {/* Lock badge for grant */}
            {lt.id === 'grant' && (
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔒 {lang === 'ar' ? 'إدارة فقط' : 'Admin only'}
              </div>
            )}
            {/* Label */}
            <div style={{ fontSize: '16px', fontWeight: '800', color: lt.color, marginBottom: '4px' }}>{lt.label[lang]}</div>
            {/* Desc */}
            <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.6', marginBottom: '12px' }}>{lt.desc[lang]}</div>
            {/* Balance */}
            {lt.days > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{lang === 'ar' ? 'مستخدم' : 'Used'} {used}/{lt.days}</span>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: lt.color }}>{rem} {lang === 'ar' ? 'يوم' : 'days'}</span>
                </div>
                <div style={{ background: '#E8EDF5', borderRadius: '999px', height: '5px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ width: `${pct}%`, background: lt.color, height: '100%', borderRadius: '999px', transition: 'width .6s ease' }}></div>
                </div>
                <div style={{ background: lt.bg, color: lt.color, border: `1px solid ${lt.border}`, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>
                  {rem} {lang === 'ar' ? 'يوم متبقي' : 'days left'}
                </div>
              </>
            ) : (
              <div style={{ background: lt.bg, color: lt.color, border: `1px solid ${lt.border}`, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>
                {lang === 'ar' ? 'اضغط للطلب' : 'Tap to request'}
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Tabs */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #E8EDF5', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
        {[
          { id: 'all', l: { ar: 'الكل', en: 'All' } },
          { id: 'pending', l: { ar: 'معلقة', en: 'Pending' } },
          { id: 'approved', l: { ar: 'موافق عليها', en: 'Approved' } },
          { id: 'rejected', l: { ar: 'مرفوضة', en: 'Rejected' } },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .18s',
            background: activeTab === tab.id ? '#1565C0' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#475569',
            boxShadow: activeTab === tab.id ? '0 2px 8px rgba(21,101,192,.3)' : 'none',
          }}>
            {tab.l[lang]}
            {tab.id === 'pending' && pendingCount > 0 && (
              <span style={{ background: activeTab === tab.id ? 'rgba(255,255,255,.3)' : '#FEE2E2', color: activeTab === tab.id ? 'white' : '#991B1B', borderRadius: '999px', fontSize: '10px', padding: '1px 6px', fontWeight: '800' }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>
      <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{filtered.length} {lang === 'ar' ? 'طلب' : 'requests'}</span>
    </div>

    {/* Table */}
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
      <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thS}>{lang === 'ar' ? 'النوع' : 'Type'}</th>
            <th style={thS}>{lang === 'ar' ? 'من' : 'From'}</th>
            <th style={thS}>{lang === 'ar' ? 'إلى' : 'To'}</th>
            <th style={thS}>{lang === 'ar' ? 'الأيام' : 'Days'}</th>
            <th style={thS}>{lang === 'ar' ? 'السبب' : 'Reason'}</th>
            <th style={thS}>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
            <th style={thS}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                {lang === 'ar' ? 'لا توجد طلبات' : 'No requests'}
              </td></tr>
            ) : filtered.map((r, idx) => {
              const lt2 = LEAVE_TYPES.find(x => x.id === r.type);
              const sm = STATUS_META[r.status];
              return (
                <tr key={r.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0F7FF'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFBFC'}>
                  <td style={tdS()}>
                    <span style={{ background: lt2?.bg, color: lt2?.color, border: `1px solid ${lt2?.border}`, padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      {lt2?.icon} {lt2?.label[lang]}
                    </span>
                  </td>
                  <td style={tdS({ direction: 'ltr', color: '#64748B' })}>{r.from}</td>
                  <td style={tdS({ direction: 'ltr', color: '#64748B' })}>{r.to}</td>
                  <td style={tdS({ fontWeight: '900', color: '#1565C0', fontSize: '16px' })}>{r.days}</td>
                  <td style={tdS({ color: '#475569', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{r.reason}</td>
                  <td style={tdS()}>
                    <span style={{ background: sm?.bg, color: sm?.color, border: `1px solid ${sm?.border}`, padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                      {sm?.label[lang]}
                    </span>
                  </td>
                  <td style={tdS()}>
                    {r.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => openEdit(r)}
                          onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                          onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
                          style={{ padding: '6px 14px', background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}>
                          ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button onClick={() => deleteRequest(r.id)}
                          onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
                          style={{ padding: '6px 10px', background: '#FFF5F5', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}>
                          🗑
                        </button>
                      </div>
                    ) : <span style={{ fontSize: '12px', color: '#94A3B8' }}>{lang === 'ar' ? 'لا يمكن التعديل' : 'Cannot edit'}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* MODAL */}
    {modalOpen && pt && (
      <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.22)', direction: dir, fontFamily: 'Cairo, sans-serif' }}>

          {/* Modal Header */}
          <div style={{ background: pt.bg, padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${pt.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: `0 4px 12px ${pt.border}` }}>
                {pt.icon}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: pt.color }}>
                  {editId ? (lang === 'ar' ? 'تعديل طلب' : 'Edit Request') : (lang === 'ar' ? 'طلب إجازة' : 'Leave Request')} — {pt.label[lang]}
                </div>
                {pt.days > 0 && (
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                    {lang === 'ar' ? `الرصيد المتبقي: ${remainingDays(pt)} يوم من ${pt.days}` : `Balance: ${remainingDays(pt)} of ${pt.days} days`}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setModalOpen(false)}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.15)'; e.currentTarget.style.color = '#DC2626'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#475569'; }}
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: 'white', cursor: 'pointer', fontSize: '16px', color: '#475569', fontWeight: '700', transition: 'all .15s' }}>✕</button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '24px 26px' }}>
            {/* Maternity special form */}
            {pt.id === 'maternity' && (
              <div style={{ marginBottom: '16px' }}>
                {/* Mode selector */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  {lang === 'ar' ? 'طريقة احتساب الإجازة' : 'Calculation Method'} *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { val: 'birth', icon: '👶', title: { ar: 'من تاريخ الولادة', en: 'From Birth Date' }, desc: { ar: 'تبدأ الإجازة يوم الولادة لمدة 4 أشهر', en: 'Leave starts on birth date for 4 months' } },
                    { val: 'ninth', icon: '🗓️', title: { ar: 'من الشهر التاسع', en: 'From 9th Month' }, desc: { ar: 'تبدأ الإجازة من بداية الشهر التاسع لمدة 4 أشهر', en: 'Leave starts at 9th month for 4 months' } },
                  ].map(opt => {
                    const sel = maternityMode === opt.val;
                    return (
                      <div key={opt.val} onClick={() => setMaternityMode(opt.val)}
                        style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: sel ? `2px solid ${pt.color}` : '1.5px solid #E2E8F0', background: sel ? pt.bg : 'white', transition: 'all .18s', boxShadow: sel ? `0 4px 10px ${pt.border}` : 'none' }}>
                        <div style={{ fontSize: '22px', marginBottom: '6px' }}>{opt.icon}</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: sel ? pt.color : '#0F172A', marginBottom: '3px' }}>{opt.title[lang]}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.5' }}>{opt.desc[lang]}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Birth date */}
                {maternityMode === 'birth' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>👶 {lang === 'ar' ? 'تاريخ الولادة' : 'Birth Date'} *</label>
                    <input type="date" value={birthDate} onChange={e => {
                      setBirthDate(e.target.value);
                      if (e.target.value) {
                        const to = new Date(e.target.value); to.setDate(to.getDate() + 119);
                        setForm(p => ({ ...p, from: e.target.value, to: to.toISOString().split('T')[0] }));
                      }
                    }} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                    {birthDate && <div style={{ marginTop: '8px', background: pt.bg, borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: pt.color, fontWeight: '700', border: `1px solid ${pt.border}` }}>
                      🤱 {lang === 'ar' ? 'من' : 'From'}: {birthDate} → {lang === 'ar' ? 'إلى' : 'To'}: {(() => { const d = new Date(birthDate); d.setDate(d.getDate() + 119); return d.toISOString().split('T')[0]; })()}  ({lang === 'ar' ? '120 يوم — 4 أشهر' : '120 days — 4 months'})
                    </div>}
                  </div>
                )}

                {/* 9th month date */}
                {maternityMode === 'ninth' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>🗓️ {lang === 'ar' ? 'بداية الشهر التاسع' : '9th Month Start'} *</label>
                    <input type="date" value={ninthDate} onChange={e => {
                      setNinthDate(e.target.value);
                      if (e.target.value) {
                        const to = new Date(e.target.value); to.setDate(to.getDate() + 119);
                        setForm(p => ({ ...p, from: e.target.value, to: to.toISOString().split('T')[0] }));
                      }
                    }} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                    {ninthDate && <div style={{ marginTop: '8px', background: pt.bg, borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: pt.color, fontWeight: '700', border: `1px solid ${pt.border}` }}>
                      🤱 {lang === 'ar' ? 'من' : 'From'}: {ninthDate} → {lang === 'ar' ? 'إلى' : 'To'}: {(() => { const d = new Date(ninthDate); d.setDate(d.getDate() + 119); return d.toISOString().split('T')[0]; })()}  ({lang === 'ar' ? '120 يوم — 4 أشهر' : '120 days — 4 months'})
                    </div>}
                  </div>
                )}
              </div>
            )}

            {/* Regular dates — hidden for maternity */}
            {pt.id !== 'maternity' && <div style={{ display: 'grid', gridTemplateColumns: selectedType?.id === 'compensatory' ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>{lang === 'ar' ? 'من تاريخ' : 'From'} *</label>
                {selectedType?.id === 'compensatory' ? (
                  /* ── Compensatory: show only valid days in the Saturday week ── */
                  (() => {
                    const todaySat = ATTENDANCE
                      .filter(a => a.employeeId === user?.employeeId && new Date(a.date).getDay() === 6 && (a.status === 'present' || a.status === 'late' || a.status === 'left'))
                      .sort((a, b) => b.date.localeCompare(a.date))[0];
                    if (!todaySat) return (
                      <div style={{ padding: '12px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', fontSize: '13px', color: '#DC2626', fontWeight: '700', textAlign: 'center' }}>
                        ⚠️ {lang === 'ar' ? 'لا يوجد سجل عمل يوم السبت هذا الأسبوع' : 'No Saturday attendance found this week'}
                      </div>
                    );
                    // Get week days (Sun-Thu + Sat) of the Saturday
                    const sat = new Date(todaySat.date);
                    const weekDays = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(sat); d.setDate(sat.getDate() - sat.getDay() + i);
                      if (d.getDay() === 5) continue; // skip Friday
                      if (d.getDay() === 6) continue; // skip Saturday itself
                      weekDays.push(d.toISOString().slice(0, 10));
                    }
                    const DN = { ar: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'] };
                    return (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>
                          {lang === 'ar' ? `اختر يوم البدل (أسبوع ${todaySat.date})` : `Pick a day (week of ${todaySat.date})`}
                        </div>
                        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                          {weekDays.map(d => {
                            const isSel = form.from === d;
                            const dn = new Date(d);
                            const dayName = DN[lang][dn.getDay() === 0 ? 0 : dn.getDay() === 1 ? 1 : dn.getDay() === 2 ? 2 : dn.getDay() === 3 ? 3 : 4];
                            return (
                              <button key={d} type="button"
                                onClick={() => { setFormError(''); setForm(p => ({ ...p, from: d, to: d })); }}
                                style={{
                                  padding: '8px 12px', border: `1.5px solid ${isSel ? '#B45309' : '#E2E8F0'}`, borderRadius: '10px',
                                  background: isSel ? '#FEF3C7' : 'white', color: isSel ? '#B45309' : '#475569',
                                  fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo',
                                  transition: 'all .15s', boxShadow: isSel ? '0 2px 8px rgba(180,83,9,.2)' : 'none',
                                  textAlign: 'center', minWidth: '60px'
                                }}>
                                <div>{dayName}</div>
                                <div style={{ fontSize: '10px', opacity: .7, direction: 'ltr' }}>{d.slice(5)}</div>
                              </button>
                            );
                          })}
                        </div>
                        {form.from && <div style={{ marginTop: '8px', fontSize: '12px', color: '#B45309', fontWeight: '700', background: '#FEF3C7', padding: '6px 12px', borderRadius: '8px', border: '1px solid #FDE68A', display: 'inline-block' }}>
                          ✓ {lang === 'ar' ? `اليوم المختار: ${form.from}` : `Selected: ${form.from}`}
                        </div>}
                      </div>
                    );
                  })()
                ) : (
                  <input type="date" value={form.from}
                    onChange={e => {
                      const d = new Date(e.target.value);
                      if (d.getDay() === 5) { setFormError(lang === 'ar' ? 'الجمعة عطلة — اختر يوماً آخر' : 'Friday is a holiday — pick another day'); return; }
                      setFormError(''); setForm(p => ({ ...p, from: e.target.value, to: e.target.value }));
                    }}
                    style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${formError && !form.from ? '#FCA5A5' : '#E2E8F0'}`, borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', direction: 'ltr', boxSizing: 'border-box', background: formError && !form.from ? '#FFF5F5' : 'white' }} />
                )}
              </div>
              {selectedType?.id !== 'compensatory' && <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>{lang === 'ar' ? 'إلى تاريخ' : 'To'} *</label>
                <input type="date" value={form.to}
                  onChange={e => {
                    const d = new Date(e.target.value);
                    if (d.getDay() === 5) { setFormError(lang === 'ar' ? 'الجمعة عطلة — اختر يوماً آخر' : 'Friday is a holiday — pick another day'); return; }
                    setFormError(''); setForm(p => ({ ...p, to: e.target.value }));
                  }}
                  min={form.from || undefined}
                  style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${formError && !form.to ? '#FCA5A5' : '#E2E8F0'}`, borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', direction: 'ltr', boxSizing: 'border-box', background: formError && !form.to ? '#FFF5F5' : 'white' }} />
              </div>}
            </div>}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>{lang === 'ar' ? 'سبب الإجازة' : 'Leave Reason'} *</label>
              <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder={lang === 'ar' ? 'مثال: إجازة سنوية، موعد طبي...' : 'e.g. Annual vacation, medical...'}
                style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${formError && !form.reason ? '#FCA5A5' : '#E2E8F0'}`, borderRadius: '10px', fontFamily: 'Cairo', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: formError && !form.reason ? '#FFF5F5' : 'white' }} />
            </div>

            {/* Preview */}
            {pt.id !== 'maternity' && form.from && form.to && new Date(form.to) >= new Date(form.from) && (
              <div style={{ background: pt.bg, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', border: `1px solid ${pt.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>{pt.icon}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: pt.color }}>
                    {previewDays} {lang === 'ar' ? 'يوم' : 'days'} — {lang === 'ar' ? 'موافق عليها تلقائياً' : 'pending approval'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {form.from} ← {form.to}
                  </div>
                </div>
                {pt.days > 0 && previewDays > remainingDays(pt) && (
                  <span style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', marginRight: 'auto', marginLeft: 'auto' }}>
                    ⚠️ {lang === 'ar' ? 'يتجاوز الرصيد' : 'Exceeds balance'}
                  </span>
                )}
              </div>
            )}

            {getLeaveTypeHint(selectedType?.id, lang) && (
              <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: '10px', border: '1px solid #FDE68A', fontSize: '12px', color: '#B45309', fontWeight: '600', marginBottom: '4px' }}>
                {getLeaveTypeHint(selectedType?.id, lang)}
              </div>
            )}
            {formError && <div style={{ background: '#FEE2E2', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#991B1B', fontWeight: '700' }}>⚠️ {formError}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={submitRequest}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                style={{ flex: 1, padding: '13px', background: pt.color, color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: `0 4px 14px ${pt.border}`, transition: 'opacity .18s' }}>
                {editId ? `💾 ${lang === 'ar' ? 'حفظ التعديل' : 'Save Changes'}` : (`${pt.icon} ${lang === 'ar' ? 'إرسال الطلب' : 'Submit Request'}`)}
              </button>
              <button onClick={() => setModalOpen(false)}
                style={{ padding: '13px 20px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
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

export default EmployeeLeaves;