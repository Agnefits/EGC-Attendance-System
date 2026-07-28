import React, { useState, useEffect } from 'react';
import { DEPARTMENTS, COLLEGES } from '../data';

const ADMIN_DEPTS = [
  { id:'HR',  name:'الموارد البشرية',    nameEn:'Human Resources'   },
  { id:'FIN', name:'الشؤون المالية',      nameEn:'Finance'           },
  { id:'IT',  name:'تقنية المعلومات',    nameEn:'IT Department'     },
  { id:'SEC', name:'الشؤون الأكاديمية', nameEn:'Academic Affairs'  },
  { id:'ADM', name:'الإدارة العامة',     nameEn:'General Admin'     },
  { id:'STU', name:'شؤون الطلاب',        nameEn:'Student Affairs'   },
];

const ACADEMIC_RANKS = [
  {val:'معيد',        valEn:'Demonstrator',       icon:'📚'},
  {val:'مدرس مساعد',  valEn:'Assistant Lecturer', icon:'📖'},
  {val:'مدرس',        valEn:'Lecturer',            icon:'🎓'},
  {val:'أستاذ مساعد', valEn:'Asst. Professor',    icon:'👨‍🏫'},
  {val:'أستاذ دكتور', valEn:'Professor',           icon:'🏛️'},
];

const ROLES = [
  { v:'academic',        icon:'🎓', ar:'موظف أكاديمي',          en:'Academic'       },
  { v:'administrative',  icon:'🗂️', ar:'موظف إداري',            en:'Administrative' },
  { v:'head_department', icon:'👔', ar:'رئيس قسم / مدير إدارة', en:'Head / Manager' },
  { v:'dean',            icon:'🏛️', ar:'عميد كلية',             en:'Dean'           },
];

/* ── Shared styles ───────────────────────────────────────────── */
const inputBase = (hasError) => ({
  width:'100%', padding:'8px 11px',
  border:`1.5px solid ${hasError ? '#FCA5A5' : '#E2E8F0'}`,
  borderRadius:'9px', fontSize:'13px', fontFamily:'Cairo',
  outline:'none', background: hasError ? '#FFFBFB' : '#FAFBFD',
  boxSizing:'border-box', color:'#0F172A',
  transition:'border-color .15s, box-shadow .15s, background .15s',
});

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', fontWeight:'700', color:'#334155', marginBottom:'5px' }}>
        {label}
        {required && <span style={{ color:'#DC2626', fontWeight:'800' }}>*</span>}
        {hint && <span style={{ fontSize:'10.5px', color:'#94A3B8', fontWeight:'600' }}>· {hint}</span>}
      </label>
      {children}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#DC2626', marginTop:'4px', fontWeight:'700' }}>
          <span style={{ fontSize:'9px' }}>●</span>{error}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'2px' }}>
      <div style={{ width:'26px', height:'26px', borderRadius:'8px', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 }}>{icon}</div>
      <div style={{ fontSize:'13px', fontWeight:'800', color:'#0F172A' }}>{title}</div>
      <div style={{ flex:1, height:'1px', background:'linear-gradient(to left, transparent, #E8EDF5)' }}/>
    </div>
  );
}

const emptyForm = {
  name:'', nameEn:'', email:'', phone:'',
  gender:'male', role:'academic', academicRank:'',
  collegeId:'', departmentId:'', adminDepartmentId:'', headType:'academic',
};

export default function AddEmployeeForm({ lang, onSave, onCancel }) {
  const dir = lang==='ar' ? 'rtl' : 'ltr';
  const ar  = lang==='ar';
  const [form,   setForm]   = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  function validate() {
    const e = {};
    if (!form.name)   e.name   = ar?'الاسم مطلوب':'Name required';
    if (!form.nameEn) e.nameEn = ar?'الاسم الإنجليزي مطلوب':'English name required';
    if (!form.email)  e.email  = ar?'البريد مطلوب':'Email required';
    if (!form.phone)  e.phone  = ar?'الهاتف مطلوب':'Phone required';
    if ((form.role==='academic'||form.role==='dean') && !form.collegeId)    e.collegeId    = ar?'الكلية مطلوبة':'College required';
    if ((form.role==='academic'||form.role==='dean') && !form.departmentId) e.departmentId = ar?'القسم مطلوب':'Dept required';
    if (form.role==='administrative' && !form.adminDepartmentId) e.adminDepartmentId = ar?'الإدارة مطلوبة':'Admin dept required';
    if (form.role==='head_department' && !form.departmentId) e.departmentId = ar?'القسم مطلوب':'Dept required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      ...form,
      id: 'EMP' + Date.now(),
      type: form.role === 'administrative' ? 'administrative' : 'academic',
      departmentId: form.role==='administrative' ? form.adminDepartmentId : form.departmentId,
      status: 'active',
    });
    setForm(emptyForm);
    setErrors({});
  }

  const F = e => { e.target.style.borderColor='#1565C0'; e.target.style.boxShadow='0 0 0 3px rgba(21,101,192,.12)'; e.target.style.background='white'; };
  const B = e => { e.target.style.borderColor = errors[e.target.dataset.k] ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow='none'; e.target.style.background = errors[e.target.dataset.k] ? '#FFFBFB' : '#FAFBFD'; };

  // Live preview helpers
  const initials = (form.name || (ar?'؟':'?')).trim().split(/\s+/).slice(0,2).map(w=>w[0]).join(' ');
  const roleObj  = ROLES.find(r=>r.v===form.role);
  const roleLabel = ar ? roleObj.ar : roleObj.en;
  const isFemale = form.gender==='female';

  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(4px)' }}>
      <style>{`
        @keyframes empFormIn { from { opacity:0; transform:translateY(14px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'18px', width:'100%', maxWidth:'560px', maxHeight:'90vh', overflowY:'auto', direction:dir, fontFamily:'Cairo,sans-serif', boxShadow:'0 32px 80px rgba(0,0,0,.28)', scrollbarWidth:'thin', scrollbarColor:'#94A3B8 #E2E8F0', animation:'empFormIn .25s cubic-bezier(.2,.8,.3,1)' }}>

        {/* ── Hero header ── */}
        <div style={{ position:'sticky', top:0, zIndex:2, background:'linear-gradient(135deg, #0D3B7A, #1565C0, #1E88E5)', padding:'14px 18px', borderRadius:'18px 18px 0 0', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:'130px', height:'130px', borderRadius:'50%', background:'rgba(255,255,255,.06)', top:'-60px', [ar?'left':'right']:'-35px', pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:'11px', position:'relative' }}>
            {/* Live avatar preview */}
            <div style={{
              width:'40px', height:'40px', borderRadius:'12px', flexShrink:0,
              background: isFemale ? 'linear-gradient(135deg,#BE185D,#EC4899)' : 'rgba(255,255,255,.16)',
              border:'1.5px solid rgba(255,255,255,.35)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: form.name ? '13px' : '17px', fontWeight:'800', color:'white',
              boxShadow:'0 4px 14px rgba(0,0,0,.18)', transition:'background .25s',
            }}>
              {form.name ? initials : '👤'}
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'14.5px', fontWeight:'800', color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {form.name || (ar?'إضافة موظف جديد':'Add New Employee')}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'2px' }}>
                <span style={{ fontSize:'10.5px', fontWeight:'700', color:'white', background:'rgba(255,255,255,.16)', border:'1px solid rgba(255,255,255,.25)', padding:'1px 9px', borderRadius:'20px' }}>
                  {roleObj.icon} {roleLabel}
                </span>
                {form.academicRank && form.role==='academic' && (
                  <span style={{ fontSize:'10.5px', fontWeight:'700', color:'#0D3B7A', background:'rgba(255,255,255,.92)', padding:'1px 9px', borderRadius:'20px' }}>
                    {form.academicRank}
                  </span>
                )}
              </div>
            </div>

            <button onClick={onCancel}
              onMouseEnter={e=>{e.currentTarget.style.background='#DC2626';e.currentTarget.style.borderColor='#DC2626';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.14)';e.currentTarget.style.borderColor='rgba(255,255,255,.3)';}}
              style={{ background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.3)', borderRadius:'9px', width:'30px', height:'30px', cursor:'pointer', fontSize:'13px', color:'white', fontFamily:'Cairo', fontWeight:'800', transition:'all .15s', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}
              title={ar?'إغلاق (Esc)':'Close (Esc)'}>
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:'16px 18px 6px', display:'flex', flexDirection:'column', gap:'13px' }}>

          {/* Section 1: Personal */}
          <SectionTitle icon="🪪" title={ar?'البيانات الشخصية':'Personal Information'}/>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'11px' }}>
            <Field label={ar?'الاسم بالعربي':'Arabic Name'} required error={errors.name}>
              <input data-k="name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} onFocus={F} onBlur={B}
                style={inputBase(errors.name)} placeholder={ar?'مثال: محمد أحمد':'e.g. محمد أحمد'}/>
            </Field>
            <Field label={ar?'الاسم بالإنجليزي':'English Name'} required error={errors.nameEn}>
              <input data-k="nameEn" value={form.nameEn} onChange={e=>setForm(p=>({...p,nameEn:e.target.value}))} onFocus={F} onBlur={B}
                style={{...inputBase(errors.nameEn),direction:'ltr'}} placeholder="e.g. Mohamed Ahmed"/>
            </Field>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'11px' }}>
            <Field label={ar?'البريد الإلكتروني':'Email'} required error={errors.email}>
              <input data-k="email" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} onFocus={F} onBlur={B}
                style={{...inputBase(errors.email),direction:'ltr'}} placeholder="name@aitu.edu"/>
            </Field>
            <Field label={ar?'رقم الهاتف':'Phone'} required error={errors.phone}>
              <input data-k="phone" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} onFocus={F} onBlur={B}
                style={{...inputBase(errors.phone),direction:'ltr'}} placeholder="01XXXXXXXXX"/>
            </Field>
          </div>

          {/* Gender */}
          <Field label={ar?'الجنس':'Gender'}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[{v:'male',l:{ar:'رجل',en:'Male'},icon:'👨'},{v:'female',l:{ar:'أنثى',en:'Female'},icon:'👩'}].map(g=>{
                const sel = form.gender===g.v;
                return(
                  <button key={g.v} onClick={()=>setForm(p=>({...p,gender:g.v}))}
                    style={{ padding:'9px', border:sel?'none':'1.5px solid #E2E8F0', borderRadius:'10px', cursor:'pointer', fontFamily:'Cairo', fontSize:'13px', fontWeight:'700',
                      background:sel?(g.v==='male'?'linear-gradient(135deg,#1565C0,#1E88E5)':'linear-gradient(135deg,#BE185D,#EC4899)'):'white',
                      color:sel?'white':'#475569', boxShadow:sel?`0 4px 12px rgba(${g.v==='male'?'21,101,192':'190,24,93'},.25)`:'none', transition:'all .18s' }}>
                    {g.icon} {g.l[lang]}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Section 2: Job */}
          <SectionTitle icon="💼" title={ar?'البيانات الوظيفية':'Job Information'}/>

          {/* Role cards */}
          <Field label={ar?'الوظيفة':'Role'}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {ROLES.map(r=>{
                const sel = form.role===r.v;
                return(
                  <button key={r.v}
                    onClick={()=>setForm(p=>({...p,role:r.v,collegeId:'',departmentId:'',adminDepartmentId:'',academicRank:'',headType:'academic'}))}
                    onMouseEnter={e=>{ if(!sel) e.currentTarget.style.borderColor='#93C5FD'; }}
                    onMouseLeave={e=>{ if(!sel) e.currentTarget.style.borderColor='#E2E8F0'; }}
                    style={{
                      display:'flex', alignItems:'center', gap:'8px', textAlign:'start',
                      padding:'8px 11px', borderRadius:'10px', cursor:'pointer', fontFamily:'Cairo',
                      border: sel ? '1.5px solid #1565C0' : '1.5px solid #E2E8F0',
                      background: sel ? '#EFF6FF' : 'white',
                      boxShadow: sel ? '0 4px 12px rgba(21,101,192,.14)' : 'none',
                      transition:'all .18s',
                    }}>
                    <span style={{ fontSize:'16px', flexShrink:0 }}>{r.icon}</span>
                    <span style={{ fontSize:'12px', fontWeight:'800', color: sel ? '#0D3B7A' : '#0F172A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ar?r.ar:r.en}</span>
                    {sel && <span style={{ marginInlineStart:'auto', color:'#1565C0', fontWeight:'800', fontSize:'12px' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Academic Rank */}
          {form.role==='academic'&&(
            <Field label={ar?'الدرجة العلمية':'Academic Rank'}>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {ACADEMIC_RANKS.map(rank=>{
                  const sel = form.academicRank===(lang==='en'?rank.valEn:rank.val);
                  return(
                    <button key={rank.val} onClick={()=>setForm(p=>({...p,academicRank:lang==='en'?rank.valEn:rank.val}))}
                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.borderColor='#93C5FD'; }}
                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.borderColor='#E2E8F0'; }}
                      style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 12px', borderRadius:'20px', cursor:'pointer', fontFamily:'Cairo', fontSize:'11.5px', fontWeight:'700',
                        border:sel?'1.5px solid transparent':'1.5px solid #E2E8F0',
                        background:sel?'linear-gradient(135deg,#1565C0,#1E88E5)':'white',
                        color:sel?'white':'#475569',
                        boxShadow:sel?'0 4px 12px rgba(21,101,192,.3)':'none',
                        transition:'all .18s' }}>
                      {rank.icon} {lang==='en'?rank.valEn:rank.val}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {/* Academic / Dean: College + Dept */}
          {(form.role==='academic'||form.role==='dean')&&(
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'11px' }}>
              <Field label={ar?'الكلية':'College'} required error={errors.collegeId}>
                <select data-k="collegeId" value={form.collegeId} onChange={e=>setForm(p=>({...p,collegeId:e.target.value,departmentId:''}))} onFocus={F} onBlur={B} style={inputBase(errors.collegeId)}>
                  <option value="">{ar?'اختر الكلية':'Select College'}</option>
                  {COLLEGES.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}
                </select>
              </Field>
              <Field label={ar?'القسم':'Department'} required error={errors.departmentId} hint={!form.collegeId ? (ar?'اختر الكلية أولاً':'Select college first') : undefined}>
                <select data-k="departmentId" value={form.departmentId} onChange={e=>setForm(p=>({...p,departmentId:e.target.value}))} onFocus={F} onBlur={B}
                  style={{...inputBase(errors.departmentId), opacity: form.collegeId ? 1 : .55, cursor: form.collegeId ? 'pointer' : 'not-allowed'}} disabled={!form.collegeId}>
                  <option value="">{ar?'اختر القسم':'Select Dept'}</option>
                  {DEPARTMENTS.filter(d=>d.collegeId===form.collegeId).map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Administrative: Admin Dept */}
          {form.role==='administrative'&&(
            <Field label={ar?'الإدارة':'Administration'} required error={errors.adminDepartmentId}>
              <select data-k="adminDepartmentId" value={form.adminDepartmentId} onChange={e=>setForm(p=>({...p,adminDepartmentId:e.target.value}))} onFocus={F} onBlur={B} style={inputBase(errors.adminDepartmentId)}>
                <option value="">{ar?'اختر الإدارة':'Select Admin Dept'}</option>
                {ADMIN_DEPTS.map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
              </select>
            </Field>
          )}

          {/* Head Department */}
          {form.role==='head_department'&&(
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'11px' }}>
              <Field label={ar?'نوع الرئاسة':'Head Type'}>
                <select data-k="headType" value={form.headType||'academic'} onChange={e=>setForm(p=>({...p,headType:e.target.value,departmentId:'',adminDepartmentId:''}))} onFocus={F} onBlur={B} style={inputBase(false)}>
                  <option value="academic">       {ar?'رئيس قسم أكاديمي':'Academic Head'}</option>
                  <option value="administrative"> {ar?'مدير إدارة':'Admin Manager'}</option>
                </select>
              </Field>
              <Field label={ar?'القسم':'Department'} required error={errors.departmentId}>
                <select data-k="departmentId" value={form.departmentId||''} onChange={e=>setForm(p=>({...p,departmentId:e.target.value}))} onFocus={F} onBlur={B} style={inputBase(errors.departmentId)}>
                  <option value="">{ar?'اختر القسم':'Select Dept'}</option>
                  {(form.headType==='administrative'?ADMIN_DEPTS:DEPARTMENTS).map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Errors summary */}
          {Object.keys(errors).length>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 13px', background:'#FEF2F2', borderRadius:'10px', border:'1px solid #FECACA', fontSize:'12px', color:'#DC2626', fontWeight:'700' }}>
              <span style={{ fontSize:'14px' }}>⚠️</span>
              {ar?'يوجد حقول مطلوبة غير مكتملة — راجع الحقول المحددة بالأحمر':'Some required fields are missing — check the fields marked in red'}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'12px 18px', borderTop:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:'8px', position:'sticky', bottom:0, background:'rgba(255,255,255,.92)', backdropFilter:'blur(8px)' }}>
          <button onClick={handleSave}
            style={{ flex:1, padding:'10px 24px', border:'none', borderRadius:'10px', background:'linear-gradient(135deg,#0D3B7A,#1565C0,#1E88E5)', color:'white', fontSize:'13.5px', fontWeight:'800', cursor:'pointer', fontFamily:'Cairo', boxShadow:'0 4px 14px rgba(21,101,192,.35)', transition:'all .18s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(21,101,192,.45)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 14px rgba(21,101,192,.35)';}}>
            💾 {ar?'حفظ الموظف':'Save Employee'}
          </button>
          <button onClick={onCancel}
            style={{ padding:'10px 20px', border:'1.5px solid #E2E8F0', borderRadius:'10px', background:'white', color:'#475569', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', transition:'all .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
            onMouseLeave={e=>e.currentTarget.style.background='white'}>
            {ar?'إلغاء':'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
