import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { employeesService, structureService } from '../services';
import api from '../services/api';
import AddEmployeeForm from './AddEmployeeForm';

const ADMIN_DEPTS = [
  { id: 'HR',       name: 'الموارد البشرية',       nameEn: 'Human Resources'   },
  { id: 'FIN',      name: 'الشؤون المالية',         nameEn: 'Finance'           },
  { id: 'IT_ADMIN', name: 'إدارة تقنية المعلومات', nameEn: 'IT Administration' },
  { id: 'SEC',      name: 'الشؤون الأكاديمية',      nameEn: 'Academic Affairs'  },
  { id: 'STU',      name: 'شؤون الطلاب',           nameEn: 'Student Affairs'   },
];

const ROLE_META = {
  academic:        { label: { ar: 'موظف أكاديمي', en: 'Academic'    }, color: '#1565C0', bg: '#DBEAFE', border: '#BFDBFE', icon: '🎓' },
  administrative:  { label: { ar: 'موظف إداري',   en: 'Administrative'}, color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', icon: '🗂️' },
  head_department: { label: { ar: 'رئيس قسم',     en: 'Head Dept.'   }, color: '#166534', bg: '#DCFCE7', border: '#BBF7D0', icon: '👑' },
  dean:            { label: { ar: 'عميد كلية',    en: 'Dean'         }, color: '#6B21A8', bg: '#EDE9FE', border: '#DDD6FE', icon: '🏛️' },
};

const iStyle = {
  width: '100%', padding: '10px 13px',
  border: '1.5px solid #E2E8F0', borderRadius: '10px',
  fontSize: '13px', fontFamily: 'Cairo', outline: 'none',
  background: 'white', boxSizing: 'border-box', color: '#0F172A',
};

/* ── Modal ── */
function Modal({ open, onClose, lang, maxWidth='640px', children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(3px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'22px', width:'100%', maxWidth, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.22)', direction:lang==='ar'?'rtl':'ltr', fontFamily:'Cairo, sans-serif' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Field ── */
function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'12px', fontWeight:'700', color: error?'#DC2626':'#475569', marginBottom:'5px' }}>
        {label}{error && <span style={{ fontWeight:'400', fontSize:'11px' }}> — {error}</span>}
      </label>
      {children}
    </div>
  );
}

/* ── FormBody — shared between Add & Edit ── */
function FormBody({ form, setForm, errors, setErrors, iStyle, lang, COLLEGES=[], DEPARTMENTS=[], ADMIN_DEPTS=[], showPassword = false }) {
  // Backend returns deptType as integer: 1=Academic, 2=Administrative
  const isAdminDept = d =>
    d.deptType === 2 || d.deptType === '2' ||
    String(d.deptType).toLowerCase() === 'administrative' ||
    d.deptType === 'admin';
  const adminDeptsList = DEPARTMENTS.filter(isAdminDept);
  const FINAL_ADMIN_DEPTS = adminDeptsList.length > 0 ? adminDeptsList : (ADMIN_DEPTS.length > 0 ? ADMIN_DEPTS : []);
  // Academic departments: deptType=1 or explicit Academic
  const academicDeptsList = DEPARTMENTS.filter(d =>
    d.deptType === 1 || d.deptType === '1' ||
    String(d.deptType).toLowerCase() === 'academic' ||
    (!isAdminDept(d))
  );

  function inp(field, extra={}) {
    return { ...iStyle, ...extra, border:`1.5px solid ${errors[field]?'#FCA5A5':'#E2E8F0'}`, background:errors[field]?'#FFF5F5':'white' };
  }
  return (
    <div className="form-grid-2" style={{ padding:'24px', gap:'14px' }}>

      <Field label={`${lang==='ar'?'الاسم بالعربي':'Arabic Name'} *`} error={errors.name}>
        <input placeholder={lang==='ar'?'مثال: أحمد محمد':'e.g. أحمد محمد'} value={form.name}
          onChange={e=>{ setForm({...form,name:e.target.value}); setErrors(p=>({...p,name:''})); }} style={inp('name')} />
      </Field>

      <Field label={`${lang==='ar'?'الاسم بالإنجليزي':'English Name'} *`} error={errors.nameEn}>
        <input placeholder="e.g. Ahmed Mohamed" value={form.nameEn}
          onChange={e=>{ setForm({...form,nameEn:e.target.value}); setErrors(p=>({...p,nameEn:''})); }} style={inp('nameEn',{direction:'ltr'})} />
      </Field>

      <Field label={`${lang==='ar'?'البريد الإلكتروني':'Email'} *`} error={errors.email}>
        <input placeholder="example@aitu.edu" value={form.email}
          onChange={e=>{ setForm({...form,email:e.target.value}); setErrors(p=>({...p,email:''})); }} style={inp('email',{direction:'ltr'})} />
      </Field>

      <Field label={`${lang==='ar'?'رقم الهاتف':'Phone'} *`} error={errors.phone}>
        <input placeholder="01XXXXXXXXX" value={form.phone}
          onChange={e=>{ setForm({...form,phone:e.target.value}); setErrors(p=>({...p,phone:''})); }} style={inp('phone',{direction:'ltr'})} />
      </Field>

      {/* ── حقل كلمة المرور (يظهر في التعديل) ── */}
      {showPassword && (
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label={`${lang === 'ar' ? 'كلمة المرور (تسجيل الدخول)' : 'Password (Login)'}`} error={errors.password}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="password"
                placeholder={lang === 'ar' ? 'كلمة المرور الجديدة (اختياري)' : 'New password (optional)'}
                value={form.password || ''}
                onChange={e => {
                  setForm({ ...form, password: e.target.value });
                  setErrors(p => ({ ...p, password: '' }));
                }}
                style={inp('password')}
              />
              {form.password && form.password.length > 0 && (
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  ✅ {lang === 'ar' ? 'سيتم تحديثها' : 'Will be updated'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
              {lang === 'ar'
                ? 'اتركها فارغة إذا كنت لا تريد تغيير كلمة المرور'
                : 'Leave empty if you do not want to change the password'}
            </div>
          </Field>
        </div>
      )}

      <div style={{gridColumn:'1 / -1'}}>
        <Field label={lang==='ar'?'الجنس':'Gender'}>
          <div style={{display:'flex',gap:'10px'}}>
            {[
              {val:'male',   icon:'👨', label:{ar:'ذكر',  en:'Male'},   c:'#1565C0', bg:'linear-gradient(135deg,#1565C0,#1E88E5)', shadow:'rgba(21,101,192,.3)'},
              {val:'female', icon:'👩', label:{ar:'أنثى', en:'Female'}, c:'#BE185D', bg:'linear-gradient(135deg,#BE185D,#EC4899)', shadow:'rgba(190,24,93,.3)'},
            ].map(g=>{
              const sel = String(form.gender || '').toLowerCase() === g.val || (g.val === 'male' && (form.gender === 1 || String(form.gender) === '1')) || (g.val === 'female' && (form.gender === 2 || String(form.gender) === '2'));
              return(
                <button key={g.val} type="button" onClick={()=>setForm({...form,gender:g.val})}
                  style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'11px',borderRadius:'12px',cursor:'pointer',fontFamily:'Cairo',fontSize:'14px',fontWeight:'700',
                    border:sel?'none':'1.5px solid #E2E8F0',
                    background:sel?g.bg:'white',
                    color:sel?'white':'#475569',
                    boxShadow:sel?`0 4px 12px ${g.shadow}`:'none',
                    transition:'all .18s'}}>
                  <span style={{fontSize:'20px'}}>{g.icon}</span>{g.label[lang]}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div style={{gridColumn:'1 / -1'}}>
        <Field label={lang==='ar'?'الوظيفة':'Role'}>
            <select value={form.role} onChange={e=>{
              const newRole = e.target.value;
              setForm({
                ...form,
                role: newRole,
                collegeId: '',
                departmentId: '',
                adminDepartmentId: '',
                academicRank: ''
              });
              setErrors(p=>({
                ...p,
                collegeId: '',
                departmentId: '',
                adminDepartmentId: ''
              }));
            }} style={iStyle}>
            <option value="academic">       {lang==='ar'?'موظف أكاديمي'          :'Academic Employee'}</option>
            <option value="administrative"> {lang==='ar'?'موظف إداري'             :'Administrative'   }</option>
            <option value="head_department">{lang==='ar'?'رئيس قسم / مدير إدارة':'Head Department'  }</option>
            <option value="dean">           {lang==='ar'?'عميد كلية'              :'Dean'             }</option>
          </select>
        </Field>
      </div>

      {/* Academic Rank — يظهر بس للأكاديمي */}
      {form.role==='academic'&&(
        <div style={{gridColumn:'1 / -1'}}>
          <Field label={lang==='ar'?'الدرجة العلمية':'Academic Rank'} error={errors.academicRank}>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {[
                {val:'معيد',         valEn:'Demonstrator',      icon:'📚'},
                {val:'مدرس مساعد',   valEn:'Assistant Lecturer',icon:'📖'},
                {val:'مدرس',         valEn:'Lecturer',           icon:'🎓'},
                {val:'أستاذ مساعد',  valEn:'Asst. Professor',   icon:'👨‍🏫'},
                {val:'أستاذ دكتور',  valEn:'Professor',          icon:'🏛️'},
              ].map(rank=>{
                const isSelected = form.academicRank===(lang==='en'?rank.valEn:rank.val);
                return(
                  <button key={rank.val} type="button"
                    onClick={()=>setForm({...form,academicRank:lang==='en'?rank.valEn:rank.val})}
                    style={{
                      display:'flex',alignItems:'center',gap:'6px',
                      padding:'8px 14px',borderRadius:'10px',cursor:'pointer',fontFamily:'Cairo',
                      fontSize:'12px',fontWeight:'700',
                      border: isSelected?'none':'1.5px solid #E2E8F0',
                      background: isSelected?'linear-gradient(135deg,#1565C0,#1E88E5)':'white',
                      color: isSelected?'white':'#475569',
                      boxShadow: isSelected?'0 4px 12px rgba(21,101,192,.3)':'none',
                      transition:'all .18s cubic-bezier(.34,1.56,.64,1)',
                      transform: isSelected?'scale(1.05)':'scale(1)',
                    }}
                  >
                    <span>{rank.icon}</span>
                    {lang==='en'?rank.valEn:rank.val}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      )}

      {form.role==='academic'&&<>
        <Field label={`${lang==='ar'?'الكلية':'College'} *`} error={errors.collegeId}>
          <select value={form.collegeId} onChange={e=>{
            const cId = e.target.value;
            setForm({...form, collegeId: cId, departmentId: ''});
            setErrors(p=>({...p, collegeId:''}));
          }} style={inp('collegeId')}>
            <option value="">{lang==='ar'?'اختر الكلية':'Select College'}</option>
            {COLLEGES.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}
          </select>
        </Field>
        <Field label={`${lang==='ar'?'القسم':'Department'} *`} error={errors.departmentId}>
          <select value={form.departmentId} onChange={e=>{
            const dId = e.target.value;
            const d = academicDeptsList.find(x => x.id === dId);
            setForm({...form, departmentId: dId, collegeId: d?.collegeId ? String(d.collegeId) : form.collegeId});
            setErrors(p=>({...p, departmentId:'', collegeId:''}));
          }} style={inp('departmentId')}>
            <option value="">{lang==='ar'?'اختر القسم':'Select Department'}</option>
            {academicDeptsList.filter(d => !form.collegeId || String(d.collegeId) === String(form.collegeId)).map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
          </select>
        </Field>
      </>}

      {form.role==='administrative'&&
        <div style={{gridColumn:'1 / -1'}}>
          <Field label={`${lang==='ar'?'الإدارة':'Administration'} *`} error={errors.adminDepartmentId}>
            <select value={form.adminDepartmentId || form.departmentId} onChange={e=>{
              const dId = e.target.value;
              setForm({...form, adminDepartmentId: dId, departmentId: dId});
              setErrors(p=>({...p, adminDepartmentId:''}));
            }} style={inp('adminDepartmentId')}>
              <option value="">{lang==='ar'?'اختر الإدارة':'Select Administration'}</option>
              {FINAL_ADMIN_DEPTS.map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
            </select>
          </Field>
        </div>
      }

      {form.role==='head_department'&&<>
        <div style={{gridColumn:'1 / -1'}}>
          <Field label={lang==='ar'?'نوع الرئاسة':'Head Type'}>
            <select value={form.headType} onChange={e=>setForm({...form,headType:e.target.value,departmentId:'',adminDepartmentId:''})} style={iStyle}>
              <option value="academic">      {lang==='ar'?'رئيس قسم أكاديمي':'Academic Head'      }</option>
              <option value="administrative">{lang==='ar'?'مدير إدارة'       :'Administrative Head'}</option>
            </select>
          </Field>
        </div>
        {form.headType==='academic'&&<>
          <Field label={`${lang==='ar'?'الكلية':'College'} *`} error={errors.collegeId}>
            <select value={form.collegeId} onChange={e=>{setForm({...form,collegeId:e.target.value,departmentId:''});setErrors(p=>({...p,collegeId:''}));}} style={inp('collegeId')}>
              <option value="">{lang==='ar'?'اختر الكلية':'Select College'}</option>
              {COLLEGES.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}
            </select>
          </Field>
          <Field label={`${lang==='ar'?'القسم':'Department'} *`} error={errors.departmentId}>
            <select value={form.departmentId} onChange={e=>{setForm({...form,departmentId:e.target.value});setErrors(p=>({...p,departmentId:''}));}} style={inp('departmentId')}>
              <option value="">{lang==='ar'?'اختر القسم':'Select Department'}</option>
              {academicDeptsList.filter(d=>!form.collegeId || String(d.collegeId)===String(form.collegeId)).map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
            </select>
          </Field>
        </>}
        {form.headType==='administrative'&&
          <div style={{gridColumn:'1 / -1'}}>
            <Field label={`${lang==='ar'?'الإدارة':'Administration'} *`} error={errors.adminDepartmentId}>
              <select value={form.adminDepartmentId || form.departmentId} onChange={e=>{setForm({...form,adminDepartmentId:e.target.value,departmentId:e.target.value});setErrors(p=>({...p,adminDepartmentId:''}));}} style={inp('adminDepartmentId')}>
                <option value="">{lang==='ar'?'اختر الإدارة':'Select Administration'}</option>
                {FINAL_ADMIN_DEPTS.map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
              </select>
            </Field>
          </div>
        }
      </>}

      {form.role==='dean'&&
        <div style={{gridColumn:'1 / -1'}}>
          <Field label={`${lang==='ar'?'الكلية':'College'} *`} error={errors.collegeId}>
            <select value={form.collegeId} onChange={e=>{setForm({...form,collegeId:e.target.value,departmentId:''});setErrors(p=>({...p,collegeId:''}));}} style={inp('collegeId')}>
              <option value="">{lang==='ar'?'اختر الكلية':'Select College'}</option>
              {COLLEGES.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}
            </select>
          </Field>
        </div>
      }
    </div>
  );
}

/* ═══════════════════════════════════
   Main Component
═══════════════════════════════════ */
function Employees({ lang, user, showFormDefault }) {
  const [employees, setEmployees]     = useState([]);
  const [colleges, setColleges]       = useState([]);
  const [departments, setDepartments] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading]         = useState(true);

  const [search, setSearch]           = useState('');
  const [filterDept, setFilterDept]   = useState('all');
  const [deptOpen, setDeptOpen]         = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);

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

  const COLLEGES = colleges;
  const DEPARTMENTS = departments;
  const deptRef = React.useRef(null);
  const deptMenuRef = React.useRef(null);
  const [deptPos, setDeptPos] = useState({ top: 0, left: 0 });

  // compute menu position from the button, accounting for RTL/LTR
  const openDeptMenu = React.useCallback(() => {
    if (deptRef.current) {
      const r = deptRef.current.getBoundingClientRect();
      const MENU_W = 240;
      // align menu's start edge to the button's start edge
      const left = lang === 'ar'
        ? Math.max(8, r.right - MENU_W)   // RTL: align right edges
        : r.left;                          // LTR: align left edges
      setDeptPos({ top: r.bottom + 6, left });
    }
    setDeptOpen(p => !p);
  }, [lang]);

  React.useEffect(() => {
    if (!deptOpen) return;
    function handleClick(e) {
      const inBtn  = deptRef.current && deptRef.current.contains(e.target);
      const inMenu = deptMenuRef.current && deptMenuRef.current.contains(e.target);
      if (!inBtn && !inMenu) setDeptOpen(false);
    }
    function handleScrollResize() { setDeptOpen(false); }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('resize', handleScrollResize);
    window.addEventListener('scroll', handleScrollResize, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('resize', handleScrollResize);
      window.removeEventListener('scroll', handleScrollResize, true);
    };
  }, [deptOpen]);
  const [filterRole, setFilterRole]   = useState('all');
  // eslint-disable-next-line no-unused-vars
  const [activeCard, setActiveCard]   = useState('list');

  /* Add modal */
  const [addOpen, setAddOpen] = useState(!!showFormDefault);
  // eslint-disable-next-line no-unused-vars
  const [addSaved, setAddSaved] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [addErrors, setAddErrors] = useState({});

  /* Details / Edit modal */
  const [detailEmp, setDetailEmp] = useState(null);
  const [editMode, setEditMode]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editSaved, setEditSaved]   = useState(false);

  const emptyForm = { name:'', nameEn:'', email:'', phone:'', gender:'male', role:'academic', academicRank:'', collegeId:'', departmentId:'', adminDepartmentId:'', headType:'academic' };
  const [addForm, setAddForm] = useState(emptyForm);

  function getRole(emp) {
    if (!emp) return 'academic';

    // 1. Check frontend form explicit role string
    const r = String(emp.role || '').toLowerCase();
    if (r === 'academic' || r === 'administrative' || r === 'head_department' || r === 'dean') {
      return r;
    }

    // 2. Check backend RoleClassification (1 = Academic, 2 = Administrative, 3 = HeadDepartment, 4 = Dean)
    const rc = emp.roleClassification ?? emp.RoleClassification;
    if (rc !== undefined && rc !== null && rc !== '') {
      const numRc = Number(rc);
      if (numRc === 4 || String(rc).toLowerCase() === 'dean') return 'dean';
      if (numRc === 3 || String(rc).toLowerCase().includes('head')) return 'head_department';
      if (numRc === 2 || String(rc).toLowerCase().includes('admin')) return 'administrative';
      if (numRc === 1 || String(rc).toLowerCase().includes('academic')) return 'academic';
    }

    // 3. Check HeadType
    if (emp.headType || emp.HeadType) return 'head_department';

    // 4. Check Type (1 = Academic, 2 = Administrative)
    const t = emp.type ?? emp.Type ?? emp.jobType ?? emp.typeId;
    if (t !== undefined && t !== null && t !== '') {
      const numT = Number(t);
      if (numT === 2 || String(t).toLowerCase().includes('admin')) return 'administrative';
      if (numT === 1 || String(t).toLowerCase().includes('academic')) return 'academic';
    }

    return 'academic';
  }

  function getDeptName(emp) {
    if (!emp) return lang === 'ar' ? 'غير محدد' : 'Not set';
    if (getRole(emp) === 'dean') return null; // dean doesn't have a dept
    if (emp.departmentName) return emp.departmentName;
    if (typeof emp.department === 'string' && emp.department) return emp.department;
    if (emp.department?.name) return lang === 'en' ? (emp.department.nameEn || emp.department.name) : emp.department.name;

    const deptId = emp.departmentId || emp.DepartmentId || emp.adminDepartmentId;
    if (!deptId) return null;
    const ALL_D = departments;
    const d = ALL_D.find(x => String(x.id) === String(deptId) || x.code === deptId || x.name === deptId || x.nameEn === deptId);
    if (d) return lang === 'en' ? (d.nameEn || d.name) : d.name;
    return null;
  }

  function getCollegeName(emp) {
    if (!emp) return null;
    const role = getRole(emp);
    // administrative employees don't have a college
    if (role === 'administrative') return null;
    if (emp.collegeName) return emp.collegeName;
    if (typeof emp.college === 'string' && emp.college) return emp.college;
    if (emp.college?.name) return lang === 'en' ? (emp.college.nameEn || emp.college.name) : emp.college.name;

    const colId = emp.collegeId || emp.CollegeId;
    const ALL_C = colleges.length ? colleges : COLLEGES;
    let c = colId ? ALL_C.find(x => String(x.id) === String(colId) || x.code === colId || x.name === colId || x.nameEn === colId) : null;
    if (!c) {
      const deptId = emp.departmentId || emp.DepartmentId;
      if (deptId) {
        const ALL_D = [...(departments.length ? departments : DEPARTMENTS), ...ADMIN_DEPTS];
        const d = ALL_D.find(x => String(x.id) === String(deptId));
        if (d?.collegeId) {
          c = ALL_C.find(x => String(x.id) === String(d.collegeId));
        }
      }
    }
    if (c) return lang === 'en' ? (c.nameEn || c.name) : c.name;
    return null;
  }

  function validate(form, isEdit = false) {
    const e = {};
    const name = form.name || form.Name || '';
    const nameEn = form.nameEn || form.NameEn || '';
    const email = form.email || form.Email || '';
    const phone = form.phone || form.Phone || '';

    if (!name.trim())   e.name   = lang === 'ar' ? 'مطلوب' : 'Required';
    if (!nameEn.trim()) e.nameEn = lang === 'ar' ? 'مطلوب' : 'Required';
    if (!email.trim())  e.email  = lang === 'ar' ? 'مطلوب' : 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = lang === 'ar' ? 'بريد غير صحيح' : 'Invalid email';
    if (!isEdit && !phone.trim()) e.phone = lang === 'ar' ? 'مطلوب' : 'Required';

    const role = form.role || 'academic';

    if (role === 'academic') {
      if (!form.collegeId)    e.collegeId   = lang === 'ar' ? 'اختر الكلية' : 'Select college';
      if (!form.departmentId) e.departmentId = lang === 'ar' ? 'اختر القسم' : 'Select dept';
    }
    else if (role === 'administrative') {
      if (!form.adminDepartmentId && !form.departmentId) e.adminDepartmentId = lang === 'ar' ? 'اختر الإدارة' : 'Select admin dept';
    }
    else if (role === 'head_department') {
      if (form.headType === 'administrative') {
        if (!form.adminDepartmentId && !form.departmentId) e.adminDepartmentId = lang === 'ar' ? 'اختر الإدارة' : 'Select admin dept';
      } else {
        if (!form.collegeId)    e.collegeId   = lang === 'ar' ? 'اختر الكلية' : 'Select college';
        if (!form.departmentId) e.departmentId = lang === 'ar' ? 'اختر القسم' : 'Select dept';
      }
    }
    else if (role === 'dean') {
      if (!form.collegeId) e.collegeId = lang === 'ar' ? 'اختر الكلية' : 'Select college';
    }

    return e;
  }

  /* Add */
  function closeAdd() { setAddForm(emptyForm); setAddOpen(false); setAddSaved(false); setAddErrors({}); setActiveCard('list'); }
  // eslint-disable-next-line no-unused-vars
  async function handleAdd() {
    const e = validate(addForm);
    if (Object.keys(e).length > 0) { setAddErrors(e); return; }

    const role = addForm.role || 'academic';
    const roleClassificationMap = { academic: 1, administrative: 2, head_department: 3, dean: 4 };

    let deptId = null;
    let colId = addForm.collegeId || null;

    if (role === 'academic') {
      deptId = addForm.departmentId || null;
    } else if (role === 'administrative') {
      deptId = addForm.adminDepartmentId || addForm.departmentId || null;
      colId = null;
    } else if (role === 'head_department') {
      if (addForm.headType === 'administrative') {
        deptId = addForm.adminDepartmentId || addForm.departmentId || null;
        colId = null;
      } else {
        deptId = addForm.departmentId || null;
      }
    } else if (role === 'dean') {
      deptId = null;
    }

    const createPayload = {
      ...addForm,
      academicRank: role === 'academic' ? (addForm.academicRank || null) : null,
      gender: (addForm.gender === 'female' || addForm.gender === 2 || String(addForm.gender) === '2') ? 2 : 1,
      type: (role === 'administrative' || (role === 'head_department' && addForm.headType === 'administrative')) ? 2 : 1,
      roleClassification: roleClassificationMap[role] || 1,
      headType: role === 'head_department' ? (addForm.headType || 'academic') : null,
      departmentId: deptId,
      collegeId: colId,
    };

    try {
      await employeesService.createEmployee(createPayload);
      setAddSaved(true);
      await loadData();
      setTimeout(() => closeAdd(), 1400);
    } catch (err) {
      console.error(err);
      setAddErrors({ general: err.message || 'Failed to create employee' });
    }
  }

  /* Edit */
  function openEdit(emp) {
    const roleVal = getRole(emp);
    const ALL_D = departments;
    const ALL_C = colleges;

    // Normalize: backend may return capitalized field names
    const normEmp = {
      ...emp,
      name: emp.name || emp.Name || '',
      nameEn: emp.nameEn || emp.NameEn || '',
      email: emp.email || emp.Email || '',
      phone: emp.phone || emp.Phone || '',
      password: '',
    };

    // Coerce IDs to strings for reliable comparison (backend may return numbers)
    const deptIdInput = String(normEmp.departmentId || normEmp.DepartmentId || normEmp.adminDepartmentId || '');
    const deptObj = ALL_D.find(d =>
      String(d.id) === deptIdInput ||
      d.code === deptIdInput ||
      (normEmp.departmentName && d.name === normEmp.departmentName) ||
      (typeof normEmp.department === 'string' && d.name === normEmp.department)
    );
    const foundDeptId = deptObj ? String(deptObj.id) : deptIdInput;

    const colIdInput = String(normEmp.collegeId || normEmp.CollegeId || deptObj?.collegeId || '');
    const colObj = ALL_C.find(c =>
      String(c.id) === colIdInput ||
      c.code === colIdInput ||
      (normEmp.collegeName && c.name === normEmp.collegeName) ||
      (typeof normEmp.college === 'string' && c.name === normEmp.college)
    );
    const foundCollegeId = colObj ? String(colObj.id) : colIdInput;

    // تحديد الجنس
    let genderValue = 'male';
    const genderRaw = normEmp.gender ?? normEmp.Gender ?? '';

    if (genderRaw !== undefined && genderRaw !== null && genderRaw !== '') {
      const genderStr = String(genderRaw).toLowerCase().trim();
      if (genderStr === 'female' || genderStr === 'f' || genderStr === 'أنثى' || genderStr === '2') {
        genderValue = 'female';
      } else if (genderStr === 'male' || genderStr === 'm' || genderStr === 'ذكر' || genderStr === '1' || genderStr === '0') {
        genderValue = 'male';
      }
    }

    setEditForm({
      ...normEmp,
      role: roleVal,
      departmentId: foundDeptId,
      collegeId: foundCollegeId,
      adminDepartmentId: foundDeptId,
      headType: normEmp.headType || emp.HeadType || (roleVal === 'head_department' ? 'academic' : ''),
      gender: genderValue,
      academicRank: normEmp.academicRank || normEmp.AcademicRank || '',
      password: '',
    });
    setEditMode(true);
    setEditErrors({});
    setEditSaved(false);
  }

  function closeDetail() { setDetailEmp(null); setEditMode(false); setEditErrors({}); setEditSaved(false); }

  const [deleteTarget, setDeleteTarget] = useState(null); // employee object pending delete confirmation
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await employeesService.deleteEmployee(deleteTarget.id);
      setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id));
      if (detailEmp?.id === deleteTarget.id) closeDetail();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete employee failed', err);
      setDeleteError(err.message || (lang === 'ar' ? 'فشل حذف الموظف' : 'Failed to delete employee'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleEdit() {
    const e = validate(editForm, true);
    if (Object.keys(e).length > 0) { setEditErrors(e); return; }

    const role = editForm.role || 'academic';
    const roleClassificationMap = { academic: 1, administrative: 2, head_department: 3, dean: 4 };

    let deptId = null;
    let colId = editForm.collegeId || null;

    if (role === 'academic') {
      deptId = editForm.departmentId || null;
    } else if (role === 'administrative') {
      deptId = editForm.adminDepartmentId || editForm.departmentId || null;
      colId = null;
    } else if (role === 'head_department') {
      if (editForm.headType === 'administrative') {
        deptId = editForm.adminDepartmentId || editForm.departmentId || null;
        colId = null;
      } else {
        deptId = editForm.departmentId || null;
      }
    } else if (role === 'dean') {
      deptId = null;
    }

    const payload = {
      name: editForm.name,
      nameEn: editForm.nameEn || editForm.name,
      email: editForm.email,
      phone: editForm.phone || '01000000000',
      academicRank: role === 'academic' ? (editForm.academicRank || null) : null,
      departmentId: deptId,
      collegeId: colId,
      gender: (editForm.gender === 'female' || editForm.gender === 2 || String(editForm.gender) === '2') ? 2 : 1,
      type: (role === 'administrative' || (role === 'head_department' && editForm.headType === 'administrative')) ? 2 : 1,
      roleClassification: roleClassificationMap[role] || 1,
      headType: role === 'head_department' ? (editForm.headType || 'academic') : null,
    };

    // أضف الباسورد لو موجود
    if (editForm.password && editForm.password.trim().length > 0) {
      payload.password = editForm.password;
    }

    try {
      await employeesService.updateEmployee(editForm.id, payload);
      setEditSaved(true);
      const updatedEmp = {
        ...editForm,
        ...payload,
        role: role,
        roleClassification: roleClassificationMap[role] || 1,
        departmentId: deptId,
        collegeId: colId,
      };
      setEmployees(prev => prev.map(emp => emp.id === editForm.id ? { ...emp, ...updatedEmp } : emp));
      setDetailEmp(prev => prev ? { ...prev, ...updatedEmp } : null);
      await loadData();
      setTimeout(() => { setEditMode(false); setEditSaved(false); }, 1400);
    } catch (err) {
      console.error(err);
      setEditErrors({ general: err.message || 'Failed to update employee' });
    }
  }

  const filtered = employees.filter(emp => {
    const name = (lang === 'en' ? (emp.nameEn || emp.name) : (emp.name || emp.nameEn)) || '';
    const rank = (emp.academicRank || '').toLowerCase();
    const roleMeta = ROLE_META[getRole(emp)];
    const roleLabel = (roleMeta?.label[lang] || '').toLowerCase();
    const deptName = String(getDeptName(emp)).toLowerCase();
    const colName  = String(getCollegeName(emp)).toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = !q || name.toLowerCase().includes(q) || rank.includes(q) || roleLabel.includes(q) || deptName.includes(q) || colName.includes(q);
    const empDeptId = emp.departmentId || emp.DepartmentId || emp.adminDepartmentId;
    const matchesDept = filterDept === 'all' || empDeptId === filterDept || deptName.includes(filterDept.toLowerCase());
    const matchesRole = filterRole === 'all' || getRole(emp) === filterRole;

    return matchesSearch && matchesDept && matchesRole;
  });

  const roleCounts = {
    all:             employees.length,
    academic:        employees.filter(e => getRole(e) === 'academic').length,
    administrative:  employees.filter(e => getRole(e) === 'administrative').length,
    head_department: employees.filter(e => getRole(e) === 'head_department').length,
    dean:            employees.filter(e => getRole(e) === 'dean').length,
  };

  const dir=lang==='ar'?'rtl':'ltr';

  // eslint-disable-next-line no-unused-vars
  const CHIPS=[
    {id:'all',           label:{ar:'الكل',       en:'All'   },icon:'👥',color:'#475569',bg:'#F1F5F9',activeBg:'linear-gradient(135deg,#334155,#475569)',activeShadow:'rgba(71,85,105,.3)'},
    {id:'academic',      label:{ar:'أكاديمي',    en:'Academic'},icon:'🎓',color:'#1565C0',bg:'#DBEAFE',activeBg:'linear-gradient(135deg,#1565C0,#1E88E5)',activeShadow:'rgba(21,101,192,.3)'},
    {id:'administrative',label:{ar:'إداري',      en:'Admin' },icon:'🗂️',color:'#B45309',bg:'#FEF3C7',activeBg:'linear-gradient(135deg,#B45309,#D97706)',activeShadow:'rgba(180,83,9,.3)'},
    {id:'head_department',label:{ar:'رئيس قسم', en:'Head'  },icon:'👑',color:'#166534',bg:'#DCFCE7',activeBg:'linear-gradient(135deg,#166534,#16A34A)',activeShadow:'rgba(22,101,52,.3)'},
    {id:'dean',          label:{ar:'عميد كلية', en:'Dean'  },icon:'🏛️',color:'#6B21A8',bg:'#EDE9FE',activeBg:'linear-gradient(135deg,#6B21A8,#7C3AED)',activeShadow:'rgba(107,33,168,.3)'},
  ];

  return (
    <div className="page-pad" style={{fontFamily:'Cairo, sans-serif',direction:dir,background:'#F1F5F9',minHeight:'100%'}}>
      <style>{`@keyframes cardPop{0%{transform:scale(.92);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}`}</style>

      {/* ── Hero header ── */}
      <div style={{
        background:'linear-gradient(135deg, #0D3B7A, #1565C0, #1E88E5)',
        borderRadius:'18px', padding:'22px 26px',
        display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        marginBottom:'20px', flexWrap:'wrap', gap:'16px',
        position:'relative', overflow:'hidden',
        boxShadow:'0 4px 20px rgba(13,59,122,.15)',
      }}>
        <div style={{position:'absolute',width:'190px',height:'190px',borderRadius:'50%',background:'rgba(255,255,255,.06)',top:'-80px',[dir==='rtl'?'left':'right']:'-50px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',width:'110px',height:'110px',borderRadius:'50%',background:'rgba(255,255,255,.05)',bottom:'-55px',[dir==='rtl'?'right':'left']:'28%',pointerEvents:'none'}}/>
        {/* Title — always on the natural start side */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',position:'relative'}}>
          <div style={{width:'50px',height:'50px',borderRadius:'14px',background:'rgba(255,255,255,.14)',border:'1.5px solid rgba(255,255,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>👥</div>
          <div>
            <h1 style={{margin:0, fontSize:'21px', fontWeight:'800', color:'white', letterSpacing:'-.3px'}}>
              {lang==='ar' ? 'الموظفون' : 'Employees'}
            </h1>
            <p style={{margin:'4px 0 0', color:'rgba(255,255,255,.75)', fontSize:'13px', fontWeight:'500'}}>
              {lang==='ar' ? 'إدارة الموظفين والقيادات الأكاديمية' : 'Manage employees & academic staff'}
            </p>
          </div>
        </div>

        {/* Actions — search + button on the end side */}
        <div style={{display:'flex', alignItems:'center', gap:'10px', position:'relative', flexWrap:'wrap', minWidth:0}}>
          {/* Dept dropdown — admin only */}
          {(user?.role==='admin'||user?.role==='hr')&&<div ref={deptRef} style={{position:'relative'}}>
            <button onClick={openDeptMenu} style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'9px 14px',
              border:`1.5px solid ${deptOpen?'#1565C0':'#E2E8F0'}`,
              borderRadius:'10px', background:'white', cursor:'pointer',
              fontSize:'13px', fontFamily:'Cairo', color:'#0F172A', fontWeight:'600',
              boxShadow: deptOpen?'0 0 0 3px rgba(21,101,192,.1)':'none',
              transition:'all .15s', whiteSpace:'nowrap',
            }}>
              <span>🏢</span>
              <span>
                {filterDept==='all'
                  ? (lang==='ar'?'القسم':'Department')
                  : (()=>{const d=[...DEPARTMENTS,...ADMIN_DEPTS].find(d=>d.id===filterDept); return d?(lang==='en'?d.nameEn:d.name):'';})()
                }
              </span>
              <span style={{fontSize:'9px',color:'#94A3B8',transition:'transform .2s',transform:deptOpen?'rotate(180deg)':'rotate(0)',display:'inline-block'}}>▼</span>
            </button>

            {deptOpen&&createPortal(
              <div ref={deptMenuRef} style={{
                position:'fixed', top:deptPos.top+'px', left:deptPos.left+'px',
                background:'white', borderRadius:'14px',
                border:'1.5px solid #E2E8F0',
                boxShadow:'0 16px 40px rgba(0,0,0,.13)',
                zIndex:99999, width:'240px', overflow:'hidden',
                direction:dir, fontFamily:'Cairo, sans-serif',
              }}>
                {/* All */}
                <div onClick={()=>{setFilterDept('all');setExpandedGroup(null);setDeptOpen(false);}} style={{
                  padding:'11px 16px', cursor:'pointer', fontSize:'13px',
                  fontWeight:'700', fontFamily:'Cairo',
                  display:'flex', alignItems:'center', gap:'10px',
                  background:filterDept==='all'?'#EFF6FF':'white',
                  color:filterDept==='all'?'#1565C0':'#0F172A',
                  borderBottom:'1px solid #F1F5F9',
                  transition:'background .1s',
                }}
                  onMouseEnter={e=>{if(filterDept!=='all')e.currentTarget.style.background='#F8FAFC';}}
                  onMouseLeave={e=>{if(filterDept!=='all')e.currentTarget.style.background='white';}}
                >
                  <span>🏢</span>
                  <span>{lang==='ar'?'كل الأقسام':'All Departments'}</span>
                  {filterDept==='all'&&<span style={{marginRight:'auto',marginLeft:'auto',color:'#1565C0',fontSize:'12px'}}>✓</span>}
                </div>

                {/* Accordion Groups */}
                {[
                  {id:'ac', icon:'🎓', label:{ar:'أقسام أكاديمية',en:'Academic Depts'}, color:'#1565C0', bg:'#EFF6FF', activeBg:'#DBEAFE', items:DEPARTMENTS.map(d=>({id:d.id,name:lang==='en'?d.nameEn:d.name}))},
                  {id:'ad', icon:'🗂️', label:{ar:'إدارات',en:'Administration'},          color:'#B45309', bg:'#FFFBEB', activeBg:'#FEF3C7', items:ADMIN_DEPTS.map(d=>({id:d.id,name:lang==='en'?d.nameEn:d.name}))},
                ].map((grp,gi)=>{
                  const isExpanded = expandedGroup===grp.id;
                  const hasActive  = grp.items.some(i=>i.id===filterDept);
                  return(
                    <div key={grp.id}>
                      {/* Group header */}
                      <div
                        onClick={()=>setExpandedGroup(isExpanded?null:grp.id)}
                        style={{
                          padding:'11px 16px', cursor:'pointer', fontSize:'13px',
                          fontWeight:'700', fontFamily:'Cairo',
                          display:'flex', alignItems:'center', gap:'10px',
                          background: hasActive ? grp.bg : isExpanded ? '#F8FAFC' : 'white',
                          color: hasActive||isExpanded ? grp.color : '#334155',
                          borderBottom: isExpanded||gi===0 ? '1px solid #F1F5F9':'none',
                          borderTop: gi===1&&!isExpanded ? '1px solid #F1F5F9':'none',
                          transition:'background .15s',
                        }}
                        onMouseEnter={e=>{if(!hasActive&&!isExpanded)e.currentTarget.style.background='#F8FAFC';}}
                        onMouseLeave={e=>{if(!hasActive&&!isExpanded)e.currentTarget.style.background='white';}}
                      >
                        <span>{grp.icon}</span>
                        <span style={{flex:1}}>{grp.label[lang]}</span>
                        <span style={{
                          fontSize:'10px', color: hasActive||isExpanded?grp.color:'#94A3B8',
                          transition:'transform .2s', display:'inline-block',
                          transform: isExpanded?'rotate(180deg)':'rotate(0)',
                        }}>▼</span>
                      </div>

                      {/* Expanded items */}
                      {isExpanded&&(
                        <div style={{background:'#FAFBFC', borderBottom:'1px solid #F1F5F9'}}>
                          {grp.items.map((item,ii)=>(
                            <div key={item.id}
                              onClick={()=>{setFilterDept(item.id);setDeptOpen(false);setExpandedGroup(null);}}
                              style={{
                                padding:'9px 16px 9px 36px', cursor:'pointer',
                                fontSize:'13px', fontFamily:'Cairo',
                                display:'flex', alignItems:'center', gap:'8px',
                                background:filterDept===item.id?grp.bg:'transparent',
                                color:filterDept===item.id?grp.color:'#475569',
                                fontWeight:filterDept===item.id?'700':'500',
                                borderBottom:ii<grp.items.length-1?'1px solid #F1F5F9':'none',
                                transition:'background .1s',
                              }}
                              onMouseEnter={e=>{if(filterDept!==item.id)e.currentTarget.style.background=grp.activeBg+'66';}}
                              onMouseLeave={e=>{if(filterDept!==item.id)e.currentTarget.style.background='transparent';}}
                            >
                              {filterDept===item.id&&<span style={{color:grp.color,fontSize:'11px'}}>✓</span>}
                              {item.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>,
              document.body
            )}
          </div>}

          {/* Search */}
          <div style={{position:'relative'}}>
            <span style={{
              position:'absolute', top:'50%', transform:'translateY(-50%)',
              [lang==='ar'?'right':'left']:'12px',
              color:'#94A3B8', fontSize:'14px', pointerEvents:'none',
            }}>🔍</span>
            <input
              placeholder={lang==='ar'?'بحث...':'Search...'}
              value={search} onChange={e=>setSearch(e.target.value)}
              style={{
                ...iStyle, width:'min(200px, 100%)',
                padding: lang==='ar'?'9px 36px 9px 12px':'9px 12px 9px 36px',
                fontSize:'13px', borderRadius:'10px',
                border:'1.5px solid #E2E8F0',
              }}
            />
            {search&&(
              <span onClick={()=>setSearch('')} style={{
                position:'absolute', top:'50%', transform:'translateY(-50%)',
                [lang==='ar'?'left':'right']:'12px',
                cursor:'pointer', color:'#CBD5E1', fontSize:'12px', fontWeight:'700',
              }}>✕</span>
            )}
          </div>
          {(user?.role==='admin'||user?.role==='hr')&&<button
            onClick={()=>setAddOpen(true)}
            onMouseEnter={e=>{e.currentTarget.style.background='#14532D';e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,.28)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#166534';e.currentTarget.style.boxShadow='0 4px 14px rgba(0,0,0,.2)';}}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'9px 18px', background:'#166534', color:'white',
              border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700',
              cursor:'pointer', fontFamily:'Cairo',
              boxShadow:'0 4px 14px rgba(0,0,0,.2)',
              transition:'all .18s ease', whiteSpace:'nowrap',
            }}>
            <span style={{fontSize:'16px', lineHeight:1, fontWeight:'400'}}>+</span>
            {lang==='ar'?'إضافة موظف':'Add Employee'}
          </button>}
        </div>
      </div>

      {/* ── Stats Bar — clickable filters ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'14px',marginBottom:'20px'}}>
        {[
          {role:'all',            icon:'👥',label:{ar:'الكل',      en:'All'},     value:employees.length,           color:'#334155',bg:'#F1F5F9',border:'#CBD5E1',activeBorder:'#334155'},
          {role:'academic',       icon:'🎓',label:{ar:'أكاديمي',   en:'Academic'},value:roleCounts.academic,         color:'#1565C0',bg:'#EFF6FF',border:'#BFDBFE',activeBorder:'#1565C0'},
          {role:'administrative', icon:'🗂️',label:{ar:'إداري',     en:'Admin'},   value:roleCounts.administrative,   color:'#B45309',bg:'#FFFBEB',border:'#FDE68A',activeBorder:'#B45309'},
          {role:'head_department',icon:'👑',label:{ar:'رئيس قسم', en:'Head'},    value:roleCounts.head_department,  color:'#166534',bg:'#F0FDF4',border:'#BBF7D0',activeBorder:'#166534'},
          {role:'dean',           icon:'🏛️',label:{ar:'عميد',      en:'Dean'},    value:roleCounts.dean,             color:'#6B21A8',bg:'#F5F3FF',border:'#DDD6FE',activeBorder:'#6B21A8'},
        ].map(stat=>{
          const isActive = filterRole===stat.role;
          return(
            <div key={stat.role}
              onClick={()=>setFilterRole(stat.role)}
              style={{
                background: isActive ? stat.bg : 'white',
                borderRadius:'16px', padding:'20px',
                border: `1.5px solid ${isActive ? stat.activeBorder : '#E8EDF5'}`,
                boxShadow: isActive ? `0 4px 16px ${stat.border}88` : '0 2px 10px rgba(0,0,0,.04)',
                cursor:'pointer',
                transition:'all .2s ease',
                display:'flex', alignItems:'center', gap:'16px',
              }}
              onMouseEnter={e=>{ if(!isActive){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${stat.border}55`;e.currentTarget.style.border=`1.5px solid ${stat.activeBorder}`;}}}
              onMouseLeave={e=>{ if(!isActive){e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.04)';e.currentTarget.style.border='1.5px solid #E8EDF5';}}}
            >
              <div style={{width:'52px',height:'52px',borderRadius:'14px',background:isActive?'white':stat.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',flexShrink:0,boxShadow:isActive?`0 2px 8px ${stat.border}`:'none',transition:'all .2s'}}>
                {stat.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',color: isActive ? stat.color : '#64748B',fontWeight:'700',marginBottom:'4px'}}>{stat.label[lang]}</div>
                <div style={{fontSize:'32px',fontWeight:'800',color:stat.color,lineHeight:1}}>{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>



      {/* Filters Section */}

      {/* Empty State */}
      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:'60px 20px',background:'white',borderRadius:'20px',border:'1.5px dashed #CBD5E1'}}>
          <div style={{fontSize:'52px',marginBottom:'14px'}}>🔍</div>
          <div style={{fontSize:'16px',fontWeight:'700',color:'#0F172A',marginBottom:'6px'}}>{lang==='ar'?'لا توجد نتائج':'No results found'}</div>
          <div style={{fontSize:'13px',color:'#94A3B8'}}>{lang==='ar'?'جرب تغيير كلمة البحث أو الفلتر':'Try changing your search or filter'}</div>
          <button onClick={()=>{setSearch('');setFilterDept('all');setFilterRole('all');}} style={{marginTop:'16px',padding:'9px 22px',background:'#1565C0',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
            {lang==='ar'?'مسح الفلتر':'Clear Filter'}
          </button>
        </div>
      )}

      {/* Employee Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:'16px'}}>
        {filtered.map(emp=>{
          const meta=ROLE_META[getRole(emp)]||ROLE_META.academic;
          return(
            <div key={emp.id} style={{background:'white',borderRadius:'18px',padding:'18px',border:`1.5px solid ${meta.border}`,boxShadow:'0 2px 12px rgba(0,0,0,.04)',transition:'transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s',position:'relative',overflow:'hidden',cursor:'pointer'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=`0 12px 28px ${meta.bg}cc,0 4px 12px rgba(0,0,0,.08)`;const b=e.currentTarget.querySelector('.ca');if(b){b.style.opacity='1';b.style.transform='translateY(0)';}}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.04)';const b=e.currentTarget.querySelector('.ca');if(b){b.style.opacity='0';b.style.transform='translateY(6px)';}}}
            >
              <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(90deg,${meta.color},${meta.bg})`,borderRadius:'18px 18px 0 0'}}/>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',marginTop:'6px'}}>
                <div style={{width:'46px',height:'46px',borderRadius:'14px',background:meta.bg,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',border:`1px solid ${meta.border}`}}>{meta.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{lang==='en'?emp.nameEn:emp.name}</div>
                  <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px',direction:'ltr',textAlign:lang==='ar'?'right':'left',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{emp.email}</div>
                </div>
                <span style={{background:meta.bg,color:meta.color,border:`1px solid ${meta.border}`,padding:'4px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',flexShrink:0}}>
                  {(()=>{
                    const role = getRole(emp);
                    if (role === 'head_department') return lang==='ar'?'رئيس قسم':'Head Dept.';
                    if (role === 'dean') return lang==='ar'?'عميد كلية':'Dean';
                    if (role === 'administrative') return lang==='ar'?'موظف إداري':'Administrative';
                    return emp.academicRank || (lang==='ar'?'أكاديمي':'Academic');
                  })()}
                </span>
              </div>
              {(()=>{
                const role = getRole(emp);
                const rows = [];
                if (role === 'academic') {
                  if (emp.academicRank) rows.push({label:lang==='ar'?'الدرجة':'Rank', value:emp.academicRank});
                  const dept = getDeptName(emp);
                  if (dept) rows.push({label:lang==='ar'?'القسم':'Dept', value:dept});
                  const col = getCollegeName(emp);
                  if (col) rows.push({label:lang==='ar'?'الكلية':'College', value:col});
                } else if (role === 'administrative') {
                  const dept = getDeptName(emp);
                  if (dept) rows.push({label:lang==='ar'?'الإدارة':'Admin', value:dept});
                } else if (role === 'head_department') {
                  const dept = getDeptName(emp);
                  if (dept) rows.push({label:lang==='ar'?'القسم':'Dept', value:dept});
                  const col = getCollegeName(emp);
                  if (col) rows.push({label:lang==='ar'?'الكلية':'College', value:col});
                } else if (role === 'dean') {
                  const col = getCollegeName(emp);
                  if (col) rows.push({label:lang==='ar'?'الكلية':'College', value:col});
                }
                rows.push({label:lang==='ar'?'الهاتف':'Phone', value:emp.phone});
                return rows.map(row=>(
                  <div key={row.label} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #F1F5F9'}}>
                    <span style={{color:'#94A3B8',fontSize:'12px',fontWeight:'600'}}>{row.label}</span>
                    <span style={{color:'#0F172A',fontSize:'12px',fontWeight:'700'}}>{row.value||'—'}</span>
                  </div>
                ));
              })()}
              <div className="ca" style={{marginTop:'12px',opacity:0,transform:'translateY(6px)',transition:'opacity .2s,transform .2s',display:'flex',gap:'8px'}}>
                <button onClick={()=>{setDetailEmp(emp);setEditMode(false);}} style={{flex:1,padding:'8px',background:meta.bg,color:meta.color,border:`1px solid ${meta.border}`,borderRadius:'10px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
                  {lang==='ar'?'👁 عرض التفاصيل':'👁 View Details'}
                </button>
                <button onClick={(e)=>{e.stopPropagation();setDeleteTarget(emp);setDeleteError('');}} title={lang==='ar'?'حذف الموظف':'Delete employee'} style={{padding:'8px 12px',background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════ DETAILS / EDIT MODAL ══════ */}
      <Modal open={!!detailEmp} onClose={closeDetail} lang={lang} maxWidth="500px">
        {detailEmp&&(()=>{
          const meta=ROLE_META[getRole(detailEmp)]||ROLE_META.academic;
          return(<>
            {/* Colored header */}
            <div style={{background:`linear-gradient(135deg,${meta.color},${meta.color}bb)`,padding:'24px 24px 20px',borderRadius:'22px 22px 0 0',position:'relative'}}>
              <button onClick={closeDetail}
  onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.85)';e.currentTarget.style.transform='scale(1.1)';}}
  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)';e.currentTarget.style.transform='scale(1)';}}
  style={{position:'absolute',top:'14px',[lang==='ar'?'left':'right']:'14px',background:'rgba(255,255,255,.2)',border:'none',borderRadius:'8px',padding:'6px 12px',color:'white',cursor:'pointer',fontFamily:'Cairo',fontSize:'12px',fontWeight:'700',transition:'all .18s'}}>✕</button>
              <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
                <div style={{width:'60px',height:'60px',borderRadius:'16px',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',border:'2px solid rgba(255,255,255,.3)'}}>{meta.icon}</div>
                <div>
                  <div style={{fontSize:'19px',fontWeight:'800',color:'white'}}>{lang==='en'?detailEmp.nameEn:detailEmp.name}</div>
                  <span style={{display:'inline-block',marginTop:'5px',background:'rgba(255,255,255,.25)',color:'white',padding:'3px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>{meta.label[lang]}</span>
                </div>
              </div>
              {/* Edit / View toggle — centered */}
              <div style={{marginTop:'16px',display:'flex',justifyContent:'center',gap:'10px'}}>
                <button onClick={()=>{ if(editMode){setEditMode(false);setEditErrors({});}else{openEdit(detailEmp);} }}
                  onMouseEnter={e=>{ if(!editMode){e.currentTarget.style.background='white';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,.15)';}}}
                  onMouseLeave={e=>{ e.currentTarget.style.background=editMode?'rgba(255,255,255,.15)':'rgba(255,255,255,.9)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}
                  style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'10px 28px',background:editMode?'rgba(255,255,255,.15)':'rgba(255,255,255,.9)',color:editMode?'white':meta.color,border:`1.5px solid ${editMode?'rgba(255,255,255,.35)':'rgba(255,255,255,.9)'}`,borderRadius:'12px',fontSize:'13px',fontWeight:'800',cursor:'pointer',fontFamily:'Cairo',transition:'all .2s',letterSpacing:'.3px'}}>
                  {editMode?(lang==='ar'?'عرض فقط':'View Only'):(lang==='ar'?'تعديل البيانات':'Edit Details')}
                </button>
                {!editMode && (
                  <button onClick={()=>{setDeleteTarget(detailEmp);setDeleteError('');}}
                    style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'10px 20px',background:'rgba(220,38,38,.18)',color:'white',border:'1.5px solid rgba(255,255,255,.35)',borderRadius:'12px',fontSize:'13px',fontWeight:'800',cursor:'pointer',fontFamily:'Cairo'}}>
                    🗑️ {lang==='ar'?'حذف':'Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* View mode */}
            {!editMode&&(
              <div style={{padding:'20px 24px 24px'}}>
                {(()=>{
                  const role = getRole(detailEmp);
                  const emailIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
                  const phoneIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.35a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
                  const deptIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
                  const colIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
                  const rankIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
                  const idIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
                  

                  // بناء الصفوف مع الباسورد (يظهر كـ نص عادي)
                  const rows = [
                    { icon: emailIcon, label: lang === 'ar' ? 'البريد' : 'Email', value: detailEmp.email },
                  
                  ];

                  if (role === 'academic' && detailEmp.academicRank) {
                    rows.push({ icon: rankIcon, label: lang === 'ar' ? 'الدرجة العلمية' : 'Rank', value: detailEmp.academicRank });
                  }
                  rows.push({ icon: phoneIcon, label: lang === 'ar' ? 'الهاتف' : 'Phone', value: detailEmp.phone });
                  
                  const deptName = getDeptName(detailEmp);
                  const colName = getCollegeName(detailEmp);
                  
                  if (role === 'academic') {
                    if (deptName) rows.push({ icon: deptIcon, label: lang === 'ar' ? 'القسم' : 'Department', value: deptName });
                    if (colName) rows.push({ icon: colIcon, label: lang === 'ar' ? 'الكلية' : 'College', value: colName });
                  } else if (role === 'administrative') {
                    if (deptName) rows.push({ icon: deptIcon, label: lang === 'ar' ? 'الإدارة' : 'Administration', value: deptName });
                  } else if (role === 'head_department') {
                    if (deptName) rows.push({ icon: deptIcon, label: lang === 'ar' ? 'القسم' : 'Department', value: deptName });
                    if (colName) rows.push({ icon: colIcon, label: lang === 'ar' ? 'الكلية' : 'College', value: colName });
                  } else if (role === 'dean') {
                    if (colName) rows.push({ icon: colIcon, label: lang === 'ar' ? 'الكلية' : 'College', value: colName });
                  }
                  rows.push({ icon: idIcon, label: lang === 'ar' ? 'الكود' : 'ID', value: detailEmp.id });

                  return rows.map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{row.icon}</span>
                      <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', minWidth: '100px' }}>{row.label}</span>
                      <span style={{ color: '#0F172A', fontSize: '14px', fontWeight: '700', flex: 1, textAlign: 'end' }}>
                        {row.value || '—'}
                      </span>
                      {row.note && (
                        <span style={{ fontSize: '11px', color: '#B45309', flex: 1, textAlign: 'end' }}>{row.note}</span>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Edit mode */}
            {editMode&&(
              <>
                <FormBody
                  form={editForm}
                  setForm={setEditForm}
                  errors={editErrors}
                  setErrors={setEditErrors}
                  iStyle={iStyle}
                  lang={lang}
                  COLLEGES={COLLEGES}
                  DEPARTMENTS={DEPARTMENTS}
                  ADMIN_DEPTS={ADMIN_DEPTS}
                  showPassword={true}
                />
                <div style={{padding:'0 24px 22px',display:'flex',alignItems:'center',gap:'10px',borderTop:'1px solid #F1F5F9',paddingTop:'16px'}}>
                  {editSaved?(
                    <div style={{display:'flex',alignItems:'center',gap:'8px',color:'#166534',fontWeight:'700',fontSize:'14px',background:'#DCFCE7',padding:'10px 20px',borderRadius:'10px',width:'100%',justifyContent:'center'}}>
                      ✓ {lang==='ar'?'تم الحفظ بنجاح!':'Saved successfully!'}
                    </div>
                  ):(<>
                    <button onClick={handleEdit} style={{padding:'11px 28px',background:meta.color,color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',boxShadow:`0 4px 14px ${meta.border}`}}>
                      {lang==='ar'?'حفظ التعديلات':'Save Changes'}
                    </button>
                    <button onClick={()=>{setEditMode(false);setEditErrors({});}} style={{padding:'11px 20px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
                      {lang==='ar'?'إلغاء':'Cancel'}
                    </button>
                    {editErrors.general && (
                      <div style={{marginTop:'8px',padding:'8px 14px',background:'#FEE2E2',borderRadius:'8px',color:'#991B1B',fontSize:'12px',fontWeight:'700',width:'100%'}}>⚠️ {editErrors.general}</div>
                    )}
                    {!editErrors.general && Object.keys(editErrors).some(k => k !== 'general' && editErrors[k]) && (
                      <span style={{fontSize:'12px',color:'#DC2626',fontWeight:'700'}}>
                        ⚠️ {lang==='ar'?'في حقول ناقصة: ':'Missing: '}{Object.keys(editErrors).filter(k => k !== 'general' && editErrors[k]).join(', ')}
                      </span>
                    )}
                  </>)}
                </div>
              </>
            )}
          </>);
        })()}
      </Modal>

      {addOpen && (
        <AddEmployeeForm
          lang={lang}
          colleges={colleges}
          departments={departments}
          onSave={async (empData) => {
            try {
              const role = empData.role || 'academic';
              const roleClassificationMap = { academic: 1, administrative: 2, head_department: 3, dean: 4 };

              let deptId = null;
              let colId = empData.collegeId || null;

              if (role === 'academic') {
                deptId = empData.departmentId || null;
              } else if (role === 'administrative') {
                deptId = empData.adminDepartmentId || empData.departmentId || null;
                colId = null;
              } else if (role === 'head_department') {
                if (empData.headType === 'administrative') {
                  deptId = empData.adminDepartmentId || empData.departmentId || null;
                  colId = null;
                } else {
                  deptId = empData.departmentId || null;
                }
              } else if (role === 'dean') {
                deptId = null;
              }

              const payload = {
                name: empData.name,
                nameEn: empData.nameEn || empData.name,
                email: empData.email,
                phone: empData.phone || '01000000000',
                academicRank: role === 'academic' ? (empData.academicRank || null) : null,
                departmentId: deptId,
                collegeId: colId,
                gender: empData.gender === 'female' ? 2 : 1,
                type: (role === 'administrative' || (role === 'head_department' && empData.headType === 'administrative')) ? 2 : 1,
                roleClassification: roleClassificationMap[role] || 1,
                headType: role === 'head_department' ? (empData.headType || 'academic') : null,
              };

              const res = await employeesService.createEmployee(payload);
              const created = res?.data || { ...payload, id: 'EMP' + Date.now(), status: 'active' };
              setEmployees(prev => [...prev, created]);

              // Attach a login account so the employee can sign in with the same
              // email/password the admin just entered (separate endpoint on the backend).
              try {
                await api.post('/users', {
                  employeeId: created.id,
                  email: empData.email,
                  password: empData.password,
                  role: empData.systemRole || 'employee',
                });
              } catch (userErr) {
                console.error('Create login account failed', userErr);
                alert(
                  (lang === 'ar'
                    ? 'اتضاف الموظف بنجاح، لكن حصل خطأ في إنشاء حساب الدخول: '
                    : 'Employee created, but creating the login account failed: ')
                  + (userErr.message || '')
                );
              }

              closeAdd();
            } catch (err) {
              console.error('Create employee failed', err);
              alert(err.message || 'Failed to create employee in backend');
            }
          }}
          onCancel={closeAdd}
        />
      )}

      {/* ══════ DELETE CONFIRMATION ══════ */}
      <Modal open={!!deleteTarget} onClose={()=>{ if(!deleting){setDeleteTarget(null);setDeleteError('');} }} lang={lang} maxWidth="420px">
        {deleteTarget && (
          <div style={{padding:'28px 24px',textAlign:'center'}}>
            <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'#FEE2E2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',margin:'0 auto 16px'}}>🗑️</div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#0F172A',marginBottom:'8px'}}>
              {lang==='ar'?'تأكيد حذف الموظف':'Confirm employee deletion'}
            </div>
            <div style={{fontSize:'13px',color:'#64748B',marginBottom:'20px',lineHeight:'1.6'}}>
              {lang==='ar'
                ? `هل أنت متأكد من حذف "${deleteTarget.name}"؟ سيتم تعطيل حسابه ولن يظهر في القوائم بعد الآن.`
                : `Are you sure you want to delete "${deleteTarget.nameEn || deleteTarget.name}"? Their account will be deactivated and they will no longer appear in lists.`}
            </div>
            {deleteError && (
              <div style={{marginBottom:'14px',padding:'8px 14px',background:'#FEE2E2',borderRadius:'8px',color:'#991B1B',fontSize:'12px',fontWeight:'700'}}>⚠️ {deleteError}</div>
            )}
            <div style={{display:'flex',gap:'10px'}}>
              <button disabled={deleting} onClick={confirmDelete} style={{flex:1,padding:'11px',background: deleting ? '#FCA5A5' : '#DC2626',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:deleting?'default':'pointer',fontFamily:'Cairo'}}>
                {deleting ? (lang==='ar'?'جارِ الحذف...':'Deleting...') : (lang==='ar'?'حذف نهائي':'Delete')}
              </button>
              <button disabled={deleting} onClick={()=>{setDeleteTarget(null);setDeleteError('');}} style={{flex:1,padding:'11px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
                {lang==='ar'?'إلغاء':'Cancel'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

export default Employees;