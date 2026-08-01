import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { employeesService, structureService } from '../services';
import AddEmployeeForm from './AddEmployeeForm';

const ADMIN_DEPTS = [
  { id: 'HR', name: 'الموارد البشرية', nameEn: 'Human Resources' },
  { id: 'FIN', name: 'الشؤون المالية', nameEn: 'Finance' },
  { id: 'IT', name: 'تقنية المعلومات', nameEn: 'IT Department' },
  { id: 'SEC', name: 'الشؤون الأكاديمية', nameEn: 'Academic Affairs' },
  { id: 'ADM', name: 'الإدارة العامة', nameEn: 'General Admin' },
  { id: 'STU', name: 'شؤون الطلاب', nameEn: 'Student Affairs' },
];

const ACADEMIC_RANKS = [
  { ar: 'أستاذ', en: 'Professor' },
  { ar: 'أستاذ مشارك', en: 'Associate Professor' },
  { ar: 'أستاذ مساعد', en: 'Assistant Professor' },
  { ar: 'مدرس', en: 'Lecturer' },
  { ar: 'مدرس مساعد', en: 'Assistant Lecturer' },
  { ar: 'معيد', en: 'Teaching Assistant' },
];

const iS = { width: '100%', padding: '10px 13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontFamily: 'Cairo', outline: 'none', background: 'white', boxSizing: 'border-box', color: '#0F172A', transition: 'border-color .15s' };
const labelS = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' };

function Field({ label, error, children }) {
  return (
    <div>
      <label style={labelS}>
        {label}{error && <span style={{ color: '#DC2626', fontWeight: '400', fontSize: '12px' }}> — {error}</span>}
      </label>
      {children}
    </div>
  );
}

export default function HrEmployees({ lang, user }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [employees, setEmployees] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterCollege, setFilterCollege] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('table');

  // Modal
  const [modal, setModal] = useState(null);
  const [detailEmp, setDetailEmp] = useState(null);
  const [errors, setErrors] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empData, colData, deptData] = await Promise.all([
        employeesService.getEmployees().catch(() => []),
        structureService.getColleges().catch(() => []),
        structureService.getDepartments().catch(() => [])
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setColleges(Array.isArray(colData) ? colData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ALL_DEPTS = [...departments, ...ADMIN_DEPTS];

  const emptyForm = {
    name: '', nameEn: '', email: '', phone: '',
    gender: 'male', type: 'academic', academicRank: '',
    collegeId: '', departmentId: '', adminDepartmentId: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ── Filtered & sorted ──
  const filtered = useMemo(() => {
    let list = employees.filter(e => {
      const name = (lang === 'en' ? e.nameEn : e.name) || '';
      const deptName = ALL_DEPTS.find(d => d.id === e.departmentId);
      if (search && !name.toLowerCase().includes(search.toLowerCase()) && !e.email?.includes(search)) return false;
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (filterGender !== 'all' && e.gender !== filterGender) return false;
      if (filterDept !== 'all' && e.departmentId !== filterDept) return false;
      if (filterCollege !== 'all' && e.collegeId !== filterCollege) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === 'name') return (lang === 'en' ? a.nameEn : a.name)?.localeCompare(lang === 'en' ? b.nameEn : b.name);
      if (sortBy === 'dept') return (a.departmentId || '').localeCompare(b.departmentId || '');
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return 0;
    });
    return list;
  }, [employees, search, filterType, filterGender, filterDept, filterCollege, sortBy, lang]);

  const stats = useMemo(() => ({
    total: employees.length,
    academic: employees.filter(e => e.type === 'academic').length,
    admin: employees.filter(e => e.type === 'administrative').length,
    male: employees.filter(e => e.gender === 'male').length,
    female: employees.filter(e => e.gender === 'female').length,
  }), [employees]);

  const hasFilters = search || filterType !== 'all' || filterGender !== 'all' || filterDept !== 'all' || filterCollege !== 'all';
  function clearFilters() { setSearch(''); setFilterType('all'); setFilterGender('all'); setFilterDept('all'); setFilterCollege('all'); }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم بالعربي مطلوب';
    if (!form.nameEn.trim()) e.nameEn = 'الاسم بالإنجليزي مطلوب';
    if (!form.email.trim()) e.email = 'البريد مطلوب';
    if (!form.phone.trim()) e.phone = 'الهاتف مطلوب';
    if (form.type === 'academic' && !form.collegeId) e.collegeId = 'الكلية مطلوبة';
    if (form.type === 'academic' && !form.departmentId) e.departmentId = 'القسم مطلوب';
    if (form.type === 'administrative' && !form.adminDepartmentId) e.adminDepartmentId = 'الإدارة مطلوبة';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    if (modal === 'add') {
      const newEmp = {
        ...form,
        id: `EMP${String(employees.length + 1).padStart(3, '0')}`,
        departmentId: form.type === 'academic' ? form.departmentId : form.adminDepartmentId,
        status: 'active',
      };
      setEmployees(p => [...p, newEmp]);
    } else {
      setEmployees(p => p.map(e => e.id === form.id ? { ...e, ...form, departmentId: form.type === 'academic' ? form.departmentId : form.adminDepartmentId } : e));
    }
    setModal(null); setForm(emptyForm); setErrors({});
  }

  function openAdd() { setForm(emptyForm); setErrors({}); setModal('add'); }
  function openEdit(e) { setForm({ ...e, adminDepartmentId: e.type === 'administrative' ? e.departmentId : '' }); setErrors({}); setModal('edit'); }
  function openView(e) { setDetailEmp(e); setModal('view'); }

  function exportCSV() {
    const H = ['الكود', 'الاسم', 'الاسم إنجليزي', 'البريد', 'الهاتف', 'النوع', 'الجنس', 'القسم', 'الكلية'];
    const rows = filtered.map(e => {
      const dept = ALL_DEPTS.find(d => d.id === e.departmentId);
      const col = COLLEGES.find(c => c.id === e.collegeId);
      return [e.id, e.name, e.nameEn, e.email, e.phone, e.type === 'academic' ? 'أكاديمي' : 'إداري', e.gender === 'male' ? 'ذكر' : 'أنثى', dept?.name || '', col?.name || ''];
    });
    const csv = '\uFEFF' + [H, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  const thS = { background: '#F8FAFC', padding: '13px 16px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '14px', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
  const tdS = (x = {}) => ({ padding: '13px 16px', borderBottom: '1px solid #F8FAFC', fontSize: '14px', textAlign: 'center', verticalAlign: 'middle', ...x });

  return (
    <div style={{ padding: '22px 26px', fontFamily: 'Cairo,sans-serif', direction: dir, background: '#F1F5F9', minHeight: '100%' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'إدارة الموظفين' : 'Employee Management'}</h1>
          <p style={{ margin: '5px 0 0', color: '#94A3B8', fontSize: '14px' }}>{lang === 'ar' ? `${filtered.length} موظف من أصل ${employees.length}` : ` ${filtered.length} of ${employees.length} employees`}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 18px', background: 'white', color: '#166534', border: '1.5px solid #BBF7D0', borderRadius: '11px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .18s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {lang === 'ar' ? 'تصدير Excel' : 'Export'}
          </button>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 20px', background: '#1565C0', color: 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 14px rgba(21,101,192,.28)', transition: 'all .18s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1976D2'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1565C0'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {lang === 'ar' ? 'إضافة موظف' : 'Add Employee'}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { l: { ar: 'الإجمالي', en: 'Total' }, v: stats.total, c: '#1565C0', bg: '#DBEAFE', b: '#BFDBFE', fn: () => clearFilters() },
          { l: { ar: 'أكاديميون', en: 'Academic' }, v: stats.academic, c: '#6B21A8', bg: '#EDE9FE', b: '#DDD6FE', fn: () => { clearFilters(); setFilterType('academic'); } },
          { l: { ar: 'إداريون', en: 'Admin' }, v: stats.admin, c: '#B45309', bg: '#FEF3C7', b: '#FDE68A', fn: () => { clearFilters(); setFilterType('administrative'); } },
          { l: { ar: 'ذكور', en: 'Male' }, v: stats.male, c: '#0369A1', bg: '#E0F2FE', b: '#BAE6FD', fn: () => { clearFilters(); setFilterGender('male'); } },
          { l: { ar: 'إناث', en: 'Female' }, v: stats.female, c: '#BE185D', bg: '#FCE7F3', b: '#FBCFE8', fn: () => { clearFilters(); setFilterGender('female'); } },
        ].map(s => (
          <div key={s.l.ar} onClick={s.fn}
            style={{ background: 'white', borderRadius: '13px', padding: '16px 18px', border: `1.5px solid ${s.b}`, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 6px rgba(0,0,0,.04)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${s.b}55`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,.04)'; }}>
            <div style={{ width: '8px', height: '44px', borderRadius: '4px', background: s.c, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '3px' }}>{s.l[lang]}</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: s.c, lineHeight: 1 }}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Panel ── */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', padding: '18px 22px', marginBottom: '18px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'البحث والفلترة' : 'Search & Filter'}</span>
            {hasFilters && <span style={{ background: '#1565C0', color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>{filtered.length} {lang === 'ar' ? 'نتيجة' : 'results'}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '9px', padding: '3px', gap: '2px' }}>
              {[
                { id: 'table', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg> },
                { id: 'grid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
              ].map(v => (
                <button key={v.id} onClick={() => setViewMode(v.id)}
                  style={{ padding: '6px 10px', border: 'none', borderRadius: '7px', cursor: 'pointer', background: viewMode === v.id ? 'white' : 'transparent', color: viewMode === v.id ? '#1565C0' : '#94A3B8', boxShadow: viewMode === v.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
                  {v.icon}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '9px', padding: '7px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                {lang === 'ar' ? 'مسح الكل' : 'Clear All'}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
          {/* Search */}
          <div>
            <label style={labelS}>{lang === 'ar' ? 'بحث' : 'Search'}</label>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [lang === 'ar' ? 'right' : 'left']: '11px', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === 'ar' ? 'اسم أو بريد إلكتروني...' : 'Name or email...'}
                onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                style={{ ...iS, padding: lang === 'ar' ? '10px 36px 10px 13px' : '10px 13px 10px 36px' }} />
            </div>
          </div>
          {/* Type */}
          <div>
            <label style={labelS}>{lang === 'ar' ? 'النوع' : 'Type'}</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              style={iS}>
              <option value="all">{lang === 'ar' ? 'الكل' : 'All'}</option>
              <option value="academic">{lang === 'ar' ? 'أكاديمي' : 'Academic'}</option>
              <option value="administrative">{lang === 'ar' ? 'إداري' : 'Admin'}</option>
            </select>
          </div>
          {/* Gender */}
          <div>
            <label style={labelS}>{lang === 'ar' ? 'الجنس' : 'Gender'}</label>
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              style={iS}>
              <option value="all">{lang === 'ar' ? 'الكل' : 'All'}</option>
              <option value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</option>
              <option value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</option>
            </select>
          </div>
          {/* Dept */}
          <div>
            <label style={labelS}>{lang === 'ar' ? 'القسم' : 'Dept'}</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              style={iS}>
              <option value="all">{lang === 'ar' ? 'الكل' : 'All'}</option>
              {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{lang === 'en' ? d.nameEn : d.name}</option>)}
            </select>
          </div>
          {/* Sort */}
          <div>
            <label style={labelS}>{lang === 'ar' ? 'ترتيب' : 'Sort'}</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              style={iS}>
              <option value="name">{lang === 'ar' ? 'الاسم' : 'Name'}</option>
              <option value="dept">{lang === 'ar' ? 'القسم' : 'Dept'}</option>
              <option value="type">{lang === 'ar' ? 'النوع' : 'Type'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'قائمة الموظفين' : 'Employee List'}</span>
            <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: '1px solid #E2E8F0' }}>{filtered.length} {lang === 'ar' ? 'موظف' : 'employees'}</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ ...thS, textAlign: lang === 'ar' ? 'right' : 'left' }}>{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th style={thS}>{lang === 'ar' ? 'القسم' : 'Dept'}</th>
                <th style={thS}>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                <th style={thS}>{lang === 'ar' ? 'الجنس' : 'Gender'}</th>
                <th style={thS}>{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                <th style={thS}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '56px', color: '#94A3B8' }}>
                    <div style={{ fontSize: '44px', marginBottom: '12px' }}>🔍</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>{lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</div>
                    <div style={{ fontSize: '13px' }}>{lang === 'ar' ? 'جرب تغيير معايير البحث' : 'Try changing search criteria'}</div>
                  </td></tr>
                ) : filtered.map((e, idx) => {
                  const dept = ALL_DEPTS.find(d => d.id === e.departmentId);
                  const isAcademic = e.type === 'academic';
                  return (
                    <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFBFC', transition: 'background .15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#EFF6FF'}
                      onMouseLeave={ev => ev.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFBFC'}>
                      <td style={tdS({ textAlign: lang === 'ar' ? 'right' : 'left' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: isAcademic ? '#EFF6FF' : '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900', color: isAcademic ? '#1565C0' : '#B45309', flexShrink: 0, border: `1px solid ${isAcademic ? '#BFDBFE' : '#FDE68A'}` }}>
                            {(lang === 'en' ? e.nameEn : e.name)?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '14px' }}>{lang === 'en' ? e.nameEn : e.name}</div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', direction: 'ltr' }}>{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdS({ color: '#64748B', fontSize: '13px' })}>{lang === 'en' ? dept?.nameEn : dept?.name || '—'}</td>
                      <td style={tdS()}>
                        <span style={{ background: isAcademic ? '#DBEAFE' : '#FEF3C7', color: isAcademic ? '#1565C0' : '#B45309', border: `1px solid ${isAcademic ? '#BFDBFE' : '#FDE68A'}`, padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {isAcademic ? (lang === 'ar' ? 'أكاديمي' : 'Academic') : (lang === 'ar' ? 'إداري' : 'Admin')}
                        </span>
                      </td>
                      <td style={tdS()}>
                        <span style={{ background: e.gender === 'female' ? '#FCE7F3' : '#E0F2FE', color: e.gender === 'female' ? '#BE185D' : '#0369A1', border: `1px solid ${e.gender === 'female' ? '#FBCFE8' : '#BAE6FD'}`, padding: '4px 11px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                          {e.gender === 'female' ? (lang === 'ar' ? 'أنثى' : 'F') : (lang === 'ar' ? 'ذكر' : 'M')}
                        </span>
                      </td>
                      <td style={tdS({ direction: 'ltr', color: '#64748B', fontSize: '13px' })}>{e.phone || '—'}</td>
                      <td style={tdS()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => openView(e)}
                            style={{ padding: '6px 12px', background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#E2E8F0'}
                            onMouseLeave={ev => ev.currentTarget.style.background = '#F1F5F9'}>
                            {lang === 'ar' ? 'عرض' : 'View'}
                          </button>
                          <button onClick={() => openEdit(e)}
                            style={{ padding: '6px 12px', background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#DBEAFE'}
                            onMouseLeave={ev => ev.currentTarget.style.background = '#EFF6FF'}>
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '56px', color: '#94A3B8', background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5' }}>
              <div style={{ fontSize: '44px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</div>
            </div>
          )}
          {filtered.map(e => {
            const dept = ALL_DEPTS.find(d => d.id === e.departmentId);
            const col = COLLEGES.find(c => c.id === e.collegeId);
            const isAcademic = e.type === 'academic';
            return (
              <div key={e.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)', transition: 'all .2s' }}
                onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-3px)'; ev.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.08)'; }}
                onMouseLeave={ev => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'; }}>
                {/* Card header */}
                <div style={{ background: isAcademic ? 'linear-gradient(135deg,#1565C0,#1E88E5)' : 'linear-gradient(135deg,#B45309,#D97706)', padding: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', color: 'white', border: '2px solid rgba(255,255,255,.25)', flexShrink: 0 }}>
                    {(lang === 'en' ? e.nameEn : e.name)?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? e.nameEn : e.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>
                  </div>
                </div>
                {/* Card body */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: isAcademic ? '#DBEAFE' : '#FEF3C7', color: isAcademic ? '#1565C0' : '#B45309', border: `1px solid ${isAcademic ? '#BFDBFE' : '#FDE68A'}`, padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>
                      {isAcademic ? (lang === 'ar' ? 'أكاديمي' : 'Academic') : (lang === 'ar' ? 'إداري' : 'Admin')}
                    </span>
                    <span style={{ background: e.gender === 'female' ? '#FCE7F3' : '#E0F2FE', color: e.gender === 'female' ? '#BE185D' : '#0369A1', border: `1px solid ${e.gender === 'female' ? '#FBCFE8' : '#BAE6FD'}`, padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>
                      {e.gender === 'female' ? (lang === 'ar' ? 'أنثى' : 'Female') : (lang === 'ar' ? 'ذكر' : 'Male')}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{lang === 'en' ? dept?.nameEn : dept?.name || '—'}</div>
                  {col && <div style={{ fontSize: '12px', color: '#94A3B8' }}>{lang === 'en' ? col.nameEn : col.name}</div>}
                  {e.academicRank && <div style={{ fontSize: '12px', color: '#6B21A8', fontWeight: '600' }}>{e.academicRank}</div>}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '8px' }}>
                  <button onClick={() => openView(e)} style={{ flex: 1, padding: '8px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#E2E8F0'} onMouseLeave={ev => ev.currentTarget.style.background = '#F8FAFC'}>
                    {lang === 'ar' ? 'عرض' : 'View'}
                  </button>
                  <button onClick={() => openEdit(e)} style={{ flex: 1, padding: '8px', background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', transition: 'all .15s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#DBEAFE'} onMouseLeave={ev => ev.currentTarget.style.background = '#EFF6FF'}>
                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ADD MODAL — الفورم المشتركة الجديدة ══ */}
      {modal === 'add' && (
        <AddEmployeeForm
          lang={lang}
          onSave={emp => { setEmployees(p => [...p, emp]); setModal(null); }}
          onCancel={() => { setModal(null); setErrors({}); }}
        />
      )}

      {/* ══ EDIT MODAL ══ */}
      {modal === 'edit' && (
        <div onClick={() => { setModal(null); setErrors({}); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '22px', width: '100%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', direction: dir, fontFamily: 'Cairo,sans-serif', boxShadow: '0 32px 80px rgba(0,0,0,.22)' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>{modal === 'add' ? (lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee') : (lang === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Employee')}</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '3px' }}>{lang === 'ar' ? 'أدخل جميع البيانات المطلوبة' : 'Fill in all required fields'}</div>
              </div>
              <button onClick={() => { setModal(null); setErrors({}); }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontSize: '14px', color: '#475569', fontFamily: 'Cairo', fontWeight: '700', transition: 'all .15s' }}>✕</button>
            </div>

            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label={`${lang === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'} *`} error={errors.name}>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    style={iS} placeholder={lang === 'ar' ? 'مثال: محمد أحمد' : 'e.g. Mohamed Ahmed'} />
                </Field>
                <Field label={`${lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'} *`} error={errors.nameEn}>
                  <input value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    style={{ ...iS, direction: 'ltr' }} placeholder="e.g. Mohamed Ahmed" />
                </Field>
              </div>

              {/* Email + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label={`${lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} *`} error={errors.email}>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    style={{ ...iS, direction: 'ltr' }} placeholder="name@aitu.edu" />
                </Field>
                <Field label={`${lang === 'ar' ? 'رقم الهاتف' : 'Phone'} *`} error={errors.phone}>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    style={{ ...iS, direction: 'ltr' }} placeholder="01XXXXXXXXX" />
                </Field>
              </div>

              {/* Gender */}
              <Field label={lang === 'ar' ? 'الجنس' : 'Gender'}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ v: 'male', l: { ar: 'ذكر', en: 'Male' } }, { v: 'female', l: { ar: 'أنثى', en: 'Female' } }].map(g => {
                    const sel = form.gender === g.v;
                    return (
                      <button key={g.v} onClick={() => setForm(p => ({ ...p, gender: g.v }))}
                        style={{
                          padding: '12px', border: sel ? 'none' : '1.5px solid #E2E8F0', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '14px', fontWeight: '700',
                          background: sel ? (g.v === 'male' ? 'linear-gradient(135deg,#1565C0,#1E88E5)' : 'linear-gradient(135deg,#BE185D,#EC4899)') : 'white',
                          color: sel ? 'white' : '#475569', boxShadow: sel ? `0 4px 12px rgba(${g.v === 'male' ? '21,101,192' : '190,24,93'},.25)` : 'none', transition: 'all .18s'
                        }}>
                        {g.v === 'male' ? '👨' : '👩'} {g.l[lang]}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Type */}
              <Field label={lang === 'ar' ? 'نوع الموظف' : 'Employee Type'}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ v: 'academic', l: { ar: 'أكاديمي', en: 'Academic' } }, { v: 'administrative', l: { ar: 'إداري', en: 'Administrative' } }].map(t => {
                    const sel = form.type === t.v;
                    return (
                      <button key={t.v} onClick={() => setForm(p => ({ ...p, type: t.v, collegeId: '', departmentId: '', adminDepartmentId: '', academicRank: '' }))}
                        style={{
                          padding: '12px', border: sel ? 'none' : '1.5px solid #E2E8F0', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: '14px', fontWeight: '700',
                          background: sel ? (t.v === 'academic' ? 'linear-gradient(135deg,#1565C0,#1E88E5)' : 'linear-gradient(135deg,#B45309,#D97706)') : 'white',
                          color: sel ? 'white' : '#475569', boxShadow: sel ? `0 4px 12px rgba(${t.v === 'academic' ? '21,101,192' : '180,83,9'},.25)` : 'none', transition: 'all .18s'
                        }}>
                        {t.v === 'academic' ? '🎓' : '🗂️'} {t.l[lang]}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Academic fields */}
              {form.type === 'academic' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <Field label={`${lang === 'ar' ? 'الكلية' : 'College'} *`} error={errors.collegeId}>
                      <select value={form.collegeId} onChange={e => setForm(p => ({ ...p, collegeId: e.target.value, departmentId: '' }))}
                        onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        style={iS}>
                        <option value="">{lang === 'ar' ? 'اختر الكلية' : 'Select College'}</option>
                        {COLLEGES.map(c => <option key={c.id} value={c.id}>{lang === 'en' ? c.nameEn : c.name}</option>)}
                      </select>
                    </Field>
                    <Field label={`${lang === 'ar' ? 'القسم' : 'Department'} *`} error={errors.departmentId}>
                      <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                        onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        style={iS} disabled={!form.collegeId}>
                        <option value="">{lang === 'ar' ? 'اختر القسم' : 'Select Dept'}</option>
                        {DEPARTMENTS.filter(d => d.collegeId === form.collegeId).map(d => <option key={d.id} value={d.id}>{lang === 'en' ? d.nameEn : d.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label={lang === 'ar' ? 'الدرجة العلمية' : 'Academic Rank'}>
                    <select value={form.academicRank} onChange={e => setForm(p => ({ ...p, academicRank: e.target.value }))}
                      onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                      style={iS}>
                      <option value="">{lang === 'ar' ? 'اختر الدرجة (اختياري)' : 'Select Rank (optional)'}</option>
                      {ACADEMIC_RANKS.map(r => <option key={r.en} value={lang === 'en' ? r.en : r.ar}>{lang === 'en' ? r.en : r.ar}</option>)}
                    </select>
                  </Field>
                </>
              )}

              {/* Admin fields */}
              {form.type === 'administrative' && (
                <Field label={`${lang === 'ar' ? 'الإدارة' : 'Department'} *`} error={errors.adminDepartmentId}>
                  <select value={form.adminDepartmentId} onChange={e => setForm(p => ({ ...p, adminDepartmentId: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#1565C0'} onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    style={iS}>
                    <option value="">{lang === 'ar' ? 'اختر الإدارة' : 'Select Dept'}</option>
                    {ADMIN_DEPTS.map(d => <option key={d.id} value={d.id}>{lang === 'en' ? d.nameEn : d.name}</option>)}
                  </select>
                </Field>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC' }}>
              <button onClick={() => { setModal(null); setErrors({}); }}
                style={{ padding: '11px 22px', background: 'white', color: '#475569', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSave}
                style={{ padding: '11px 28px', background: '#1565C0', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo', boxShadow: '0 4px 12px rgba(21,101,192,.28)', transition: 'all .18s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1976D2'}
                onMouseLeave={e => e.currentTarget.style.background = '#1565C0'}>
                {modal === 'add' ? (lang === 'ar' ? 'إضافة الموظف' : 'Add Employee') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW MODAL ══ */}
      {modal === 'view' && detailEmp && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '22px', width: '100%', maxWidth: '500px', direction: dir, fontFamily: 'Cairo,sans-serif', boxShadow: '0 32px 80px rgba(0,0,0,.22)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: detailEmp.type === 'academic' ? 'linear-gradient(135deg,#0F172A,#1565C0,#1E88E5)' : 'linear-gradient(135deg,#0F172A,#B45309,#D97706)', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              <div style={{ width: '66px', height: '66px', borderRadius: '18px', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: 'white', border: '2px solid rgba(255,255,255,.25)', flexShrink: 0 }}>
                {(lang === 'en' ? detailEmp.nameEn : detailEmp.name)?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>{lang === 'en' ? detailEmp.nameEn : detailEmp.name}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', marginTop: '4px' }}>{detailEmp.email}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,.18)', color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
                    {detailEmp.type === 'academic' ? (lang === 'ar' ? 'أكاديمي' : 'Academic') : (lang === 'ar' ? 'إداري' : 'Admin')}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,.18)', color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
                    {detailEmp.gender === 'female' ? (lang === 'ar' ? 'أنثى' : 'Female') : (lang === 'ar' ? 'ذكر' : 'Male')}
                  </span>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ position: 'absolute', top: '16px', [lang === 'ar' ? 'left' : 'right']: '16px', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: 'white', fontSize: '14px', fontWeight: '700', fontFamily: 'Cairo' }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>, label: lang === 'ar' ? 'البريد' : 'Email', value: detailEmp.email },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.35a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>, label: lang === 'ar' ? 'الهاتف' : 'Phone', value: detailEmp.phone },
                ...(detailEmp.type === 'academic' ? [{ icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>, label: lang === 'ar' ? 'الكلية' : 'College', value: COLLEGES.find(c => c.id === detailEmp.collegeId)?.[lang === 'en' ? 'nameEn' : 'name'] }] : []),
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, label: lang === 'ar' ? 'القسم' : 'Dept', value: ALL_DEPTS.find(d => d.id === detailEmp.departmentId)?.[lang === 'en' ? 'nameEn' : 'name'] },
                ...(detailEmp.academicRank ? [{ icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>, label: lang === 'ar' ? 'الدرجة العلمية' : 'Rank', value: detailEmp.academicRank }] : []),
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>, label: lang === 'ar' ? 'الكود' : 'ID', value: detailEmp.id },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{row.icon}</span>
                  <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', minWidth: '110px' }}>{row.label}</span>
                  <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: '700', flex: 1, textAlign: 'end' }}>{row.value || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '10px', background: '#F8FAFC' }}>
              <button onClick={() => openEdit(detailEmp)} style={{ flex: 1, padding: '11px', background: '#1565C0', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                {lang === 'ar' ? 'تعديل البيانات' : 'Edit'}
              </button>
              <button onClick={() => setModal(null)} style={{ padding: '11px 20px', background: 'white', color: '#475569', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
