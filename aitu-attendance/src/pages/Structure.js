import React, { useState } from 'react';
import { COLLEGES, DEPARTMENTS } from '../data';

function Structure({ lang }) {
  const [colleges,    setColleges]    = useState(COLLEGES);
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [adminDepts,  setAdminDepts]  = useState([
    { id:'HR',       name:'الموارد البشرية',       nameEn:'Human Resources'   },
    { id:'FIN',      name:'الشؤون المالية',         nameEn:'Finance'           },
    { id:'IT_ADMIN', name:'إدارة تقنية المعلومات', nameEn:'IT Administration' },
    { id:'SEC',      name:'الشؤون الأكاديمية',      nameEn:'Academic Affairs'  },
    { id:'STU',      name:'شؤون الطلاب',           nameEn:'Student Affairs'   },
  ]);

  const [activeTab,   setActiveTab]   = useState('colleges');
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [form,        setForm]        = useState({ name:'', nameEn:'', code:'', collegeId:'' });
  const [successMsg,  setSuccessMsg]  = useState('');
  const [formError,   setFormError]   = useState('');

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const TABS = [
    { id:'colleges',    icon:'🏛️', label:{ar:'الكليات',  en:'Colleges'},        color:'#6B21A8', bg:'#F5F3FF', border:'#DDD6FE' },
    { id:'departments', icon:'🎓', label:{ar:'الأقسام',  en:'Departments'},     color:'#1565C0', bg:'#EFF6FF', border:'#BFDBFE' },
    { id:'adminDepts',  icon:'🗂️', label:{ar:'الإدارات', en:'Administrations'}, color:'#B45309', bg:'#FFFBEB', border:'#FDE68A' },
  ];

  const currentData = activeTab==='colleges' ? colleges : activeTab==='departments' ? departments : adminDepts;
  const activeTabMeta = TABS.find(t=>t.id===activeTab);

  function showSuccess(msg) { setSuccessMsg(msg); setTimeout(()=>setSuccessMsg(''),3000); }
  function resetForm() { setForm({name:'',nameEn:'',code:'',collegeId:'',deptType:'academic',parentType:'',parentId:'',function:''}); setEditItem(null); setShowForm(false); setFormError(''); }

  function handleEdit(item) {
    setEditItem(item);
    setForm({ name:item.name, nameEn:item.nameEn, code:item.code||'', collegeId:item.collegeId||'', deptType:item.deptType||'academic', parentType:item.parentType||'', parentId:item.parentId||'', function:item.function||'', });
    setShowForm(true); setFormError('');
  }

  function handleDelete(id) {
    if (activeTab==='colleges') { setColleges(p=>p.filter(c=>c.id!==id)); setDepartments(p=>p.filter(d=>d.collegeId!==id)); }
    else if (activeTab==='departments') setDepartments(p=>p.filter(d=>d.id!==id));
    else setAdminDepts(p=>p.filter(d=>d.id!==id));
    showSuccess(lang==='ar'?'✓ تم الحذف بنجاح':'✓ Deleted successfully');
  }

  function handleSubmit() {
    setFormError('');
    if (!form.name.trim()||!form.nameEn.trim()) { setFormError(lang==='ar'?'الاسمان مطلوبان':'Both names are required'); return; }
    if (activeTab==='departments'&&!form.collegeId) { setFormError(lang==='ar'?'اختر الكلية':'Select a college'); return; }
    if (activeTab==='adminDepts'&&!form.parentType) { setFormError(lang==='ar'?'اختر تابع لإيه':'Select what it reports to'); return; }
    if (activeTab==='adminDepts'&&form.parentType==='college'&&!form.collegeId) { setFormError(lang==='ar'?'اختر الكلية':'Select college'); return; }
    if (activeTab==='adminDepts'&&form.parentType==='admin'&&!form.parentId) { setFormError(lang==='ar'?'اختر الإدارة':'Select admin dept'); return; }

    if (activeTab==='colleges') {
      const id = form.code || 'COL'+Date.now();
      editItem ? setColleges(p=>p.map(c=>c.id===editItem.id?{...c,...form,id:editItem.id}:c))
               : setColleges(p=>[...p,{id,name:form.name,nameEn:form.nameEn,code:id}]);
    } else if (activeTab==='departments') {
      const id = form.code || 'DEPT'+Date.now();
      const deptData = { id, name:form.name, nameEn:form.nameEn, code:id, deptType:'academic', collegeId:form.collegeId };
      editItem ? setDepartments(p=>p.map(d=>d.id===editItem.id?{...deptData,id:editItem.id}:d))
               : setDepartments(p=>[...p,deptData]);
    } else {
      const id = form.code || 'ADM'+Date.now();
      const adminData = {
        id, name:form.name, nameEn:form.nameEn,
        parentType:form.parentType||'',
        collegeId: form.parentType==='college'?form.collegeId:'',
        parentId:  form.parentType==='admin'?form.parentId:'',
        function:  form.function||'',
      };
      editItem ? setAdminDepts(p=>p.map(d=>d.id===editItem.id?{...adminData,id:editItem.id}:d))
               : setAdminDepts(p=>[...p,adminData]);
    }
    showSuccess(editItem?(lang==='ar'?'✓ تم التعديل بنجاح':'✓ Updated'):(lang==='ar'?'✓ تمت الإضافة بنجاح':'✓ Added'));
    resetForm();
  }

  const iS = (err) => ({
    width:'100%', padding:'10px 13px',
    border:`1.5px solid ${err?'#FCA5A5':'#E2E8F0'}`,
    borderRadius:'10px', fontFamily:'Cairo', fontSize:'13px',
    outline:'none', background:err?'#FFF5F5':'white', boxSizing:'border-box', color:'#0F172A',
  });
  const lS = { display:'block', fontSize:'12px', fontWeight:'700', color:'#475569', marginBottom:'5px' };
  const thS = { background:'#F8FAFC', padding:'12px 18px', textAlign:'center', fontWeight:'700', color:'#475569', fontSize:'13px', borderBottom:'1.5px solid #E2E8F0', whiteSpace:'nowrap' };
  const tdS = { padding:'12px 18px', borderBottom:'1px solid #F8FAFC', fontSize:'14px', textAlign:'center', verticalAlign:'middle' };

  return (
    <div style={{ padding:'24px 28px', fontFamily:'Cairo, sans-serif', direction:dir, background:'#F1F5F9', minHeight:'100%' }}>

      {/* ── Hero header ── */}
      <div style={{ background:'linear-gradient(135deg, #0D3B7A, #1565C0, #1E88E5)', borderRadius:'18px', padding:'22px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px', position:'relative', overflow:'hidden', boxShadow:'0 4px 20px rgba(13,59,122,.15)' }}>
        <div style={{position:'absolute',width:'190px',height:'190px',borderRadius:'50%',background:'rgba(255,255,255,.06)',top:'-80px',[dir==='rtl'?'left':'right']:'-50px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',width:'110px',height:'110px',borderRadius:'50%',background:'rgba(255,255,255,.05)',bottom:'-55px',[dir==='rtl'?'right':'left']:'28%',pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'center',gap:'14px',position:'relative'}}>
          <div style={{width:'50px',height:'50px',borderRadius:'14px',background:'rgba(255,255,255,.14)',border:'1.5px solid rgba(255,255,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>🏢</div>
          <div>
            <h1 style={{ margin:0, fontSize:'21px', fontWeight:'800', color:'white' }}>
              {lang==='ar'?'الهيكل التنظيمي':'Organizational Structure'}
            </h1>
            <p style={{ margin:'4px 0 0', color:'rgba(255,255,255,.75)', fontSize:'13px' }}>
              {lang==='ar'?'إدارة الكليات والأقسام والإدارات':'Manage colleges, departments & administrations'}
            </p>
          </div>
        </div>
        <button
          onClick={()=>{ if(showForm){resetForm();}else{setShowForm(true);setEditItem(null);setForm({name:'',nameEn:'',code:'',collegeId:'',deptType:'academic',parentType:'',parentId:'',function:''}); }}}
          onMouseEnter={e=>{ e.currentTarget.style.background=showForm?'#FECACA':'#14532D'; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background=showForm?'#FEE2E2':'#166534'; e.currentTarget.style.transform='translateY(0)'; }}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 18px', background:showForm?'#FEE2E2':'#166534', color:showForm?'#991B1B':'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', transition:'all .18s', boxShadow:showForm?'none':'0 4px 14px rgba(0,0,0,.2)' }}>
          {showForm?(lang==='ar'?'✕ إلغاء':'✕ Cancel'):(lang==='ar'?'+ إضافة':'+ Add')}
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display:'flex', justifyContent:'center', gap:'20px', marginBottom:'24px', flexWrap:'wrap' }}>
        {TABS.map(tab=>{
          const isActive = activeTab===tab.id;
          const count = tab.id==='colleges'?colleges.length:tab.id==='departments'?departments.length:adminDepts.length;
          return(
            <div key={tab.id} onClick={()=>{ setActiveTab(tab.id); resetForm(); }}
              onMouseEnter={e=>{ if(!isActive){e.currentTarget.style.transform='translateY(-4px) scale(1.04)';e.currentTarget.style.border=`2px solid ${tab.color}`;e.currentTarget.style.boxShadow=`0 10px 28px ${tab.border}88`;e.currentTarget.style.background=tab.bg;}}}
              onMouseLeave={e=>{ if(!isActive){e.currentTarget.style.transform='translateY(0) scale(1)';e.currentTarget.style.border='2px dashed #CBD5E1';e.currentTarget.style.boxShadow='none';e.currentTarget.style.background='white';}}}
              style={{
                width:'190px', height:'190px',
                borderRadius:'22px', cursor:'pointer',
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                gap:'10px', textAlign:'center',
                background: isActive ? tab.bg : 'white',
                border: isActive ? `2px solid ${tab.color}` : '2px dashed #CBD5E1',
                boxShadow: isActive ? `0 10px 28px ${tab.border}88` : 'none',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition:'all .28s cubic-bezier(.34,1.56,.64,1)',
              }}>
              {/* Icon */}
              <div style={{
                width:'52px', height:'52px', borderRadius:'14px',
                background: isActive ? 'white' : tab.bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'26px',
                boxShadow: isActive ? `0 2px 10px ${tab.border}` : 'none',
                transition:'all .2s',
              }}>
                {tab.icon}
              </div>
              {/* Count */}
              <div style={{ fontSize:'34px', fontWeight:'900', color:tab.color, lineHeight:1 }}>{count}</div>
              {/* Label */}
              <div style={{ fontSize:'13px', fontWeight:'700', color: isActive ? tab.color : '#94A3B8' }}>{tab.label[lang]}</div>
            </div>
          );
        })}
      </div>

      {/* ── Success ── */}
      {successMsg&&(
        <div style={{ background:'#DCFCE7', border:'1px solid #BBF7D0', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', fontSize:'13px', color:'#14532D', fontWeight:'700', display:'flex', alignItems:'center', gap:'8px' }}>
          {successMsg}
        </div>
      )}

      {/* ── Form ── */}
      {showForm&&(
        <div style={{ background:'white', borderRadius:'16px', border:`2px solid ${activeTabMeta?.border||'#BFDBFE'}`, padding:'22px', marginBottom:'20px', boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px', paddingBottom:'12px', borderBottom:'1px solid #F1F5F9' }}>
            <h3 style={{ margin:0, fontSize:'15px', fontWeight:'800', color:'#0F172A' }}>
              {activeTabMeta?.icon} {editItem?(lang==='ar'?'تعديل':'Edit'):(lang==='ar'?'إضافة جديد':'Add New')} — {activeTabMeta?.label[lang]}
            </h3>
            <button onClick={resetForm}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.1)';e.currentTarget.style.color='#DC2626';}}
              onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#475569';}}
              style={{ background:'#F1F5F9', border:'none', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontSize:'13px', color:'#475569', fontFamily:'Cairo', fontWeight:'700', transition:'all .18s' }}>✕</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'14px' }}>
            <div>
              <label style={lS}>{lang==='ar'?'الاسم بالعربي':'Arabic Name'} *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                placeholder={lang==='ar'?'مثال: كلية الهندسة':'e.g. كلية الهندسة'}
                style={iS(formError&&!form.name)} />
            </div>
            <div>
              <label style={lS}>{lang==='ar'?'الاسم بالإنجليزي':'English Name'} *</label>
              <input value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}
                placeholder="e.g. Faculty of Engineering"
                style={iS(formError&&!form.nameEn)} />
            </div>
            {activeTab!=='adminDepts'&&(
              <div>
                <label style={lS}>{lang==='ar'?'الكود':'Code'}</label>
                <input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}
                  placeholder="FIT / CS / HR"
                  style={{ ...iS(false), direction:'ltr' }} />
              </div>
            )}

            {/* Departments always academic — تابع لكلية */}
            {activeTab==='departments'&&(
              <div>
                <label style={lS}>{lang==='ar'?'تابع لكلية':'College'} *</label>
                <select value={form.collegeId} onChange={e=>setForm({...form,collegeId:e.target.value})}
                  style={iS(formError&&!form.collegeId)}>
                  <option value="">{lang==='ar'?'— اختر الكلية —':'— Select College —'}</option>
                  {colleges.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}
                </select>
              </div>
            )}

            {/* adminDepts: تابع لإيه + الوظيفة */}
            {activeTab==='adminDepts'&&(<>
              <div>
                <label style={lS}>{lang==='ar'?'تابع لـ':'Reports To'} *</label>
                <select value={form.parentType||''} onChange={e=>setForm({...form,parentType:e.target.value,parentId:''})}
                  style={iS(formError&&!(form.parentType))}>
                  <option value="">{lang==='ar'?'— اختر —':'— Select —'}</option>
                  <option value="college">{lang==='ar'?'🏛️ كلية':'🏛️ College'}</option>
                  <option value="admin">{lang==='ar'?'🗂️ إدارة مركزية':'🗂️ Central Admin'}</option>
                  <option value="university">{lang==='ar'?'🏫 الجامعة مباشرة':'🏫 University Direct'}</option>
                </select>
              </div>

              {/* لو تابع لكلية */}
              {form.parentType==='college'&&(
                <div>
                  <label style={lS}>{lang==='ar'?'الكلية التابع لها':'Parent College'} *</label>
                  <select value={form.collegeId||''} onChange={e=>setForm({...form,collegeId:e.target.value})}
                    style={iS(formError&&!form.collegeId)}>
                    <option value="">{lang==='ar'?'— اختر الكلية —':'— Select College —'}</option>
                    {colleges.map(c=><option key={c.id} value={c.id}>{lang==='en'?c.nameEn:c.name}</option>)}
                  </select>
                </div>
              )}

              {/* لو تابع لإدارة */}
              {form.parentType==='admin'&&(
                <div>
                  <label style={lS}>{lang==='ar'?'الإدارة التابع لها':'Parent Admin'} *</label>
                  <select value={form.parentId||''} onChange={e=>setForm({...form,parentId:e.target.value})}
                    style={iS(formError&&!form.parentId)}>
                    <option value="">{lang==='ar'?'— اختر الإدارة —':'— Select Admin —'}</option>
                    {adminDepts.map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
                  </select>
                </div>
              )}

              {/* الوظيفة / المهمة */}
              <div style={{gridColumn:'1 / -1'}}>
                <label style={lS}>{lang==='ar'?'الوظيفة / المهمة الرئيسية':'Main Function'}</label>
                <input value={form.function||''} onChange={e=>setForm({...form,function:e.target.value})}
                  placeholder={lang==='ar'?'مثال: إدارة شؤون الموظفين وتنظيم العمل...':'e.g. Manage staff affairs and organize work...'}
                  style={iS(false)} />
              </div>
            </>)}
          </div>

          {formError&&(
            <div style={{ background:'#FEE2E2', borderRadius:'10px', padding:'10px 14px', marginTop:'12px', fontSize:'12px', color:'#991B1B', fontWeight:'700' }}>⚠️ {formError}</div>
          )}

          <div style={{ display:'flex', gap:'10px', marginTop:'18px' }}>
            <button onClick={handleSubmit}
              onMouseEnter={e=>e.currentTarget.style.background='#1976D2'}
              onMouseLeave={e=>e.currentTarget.style.background='#1565C0'}
              style={{ padding:'10px 24px', background:'#1565C0', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', boxShadow:'0 4px 12px rgba(21,101,192,.25)', transition:'background .18s' }}>
              {editItem?(lang==='ar'?'💾 حفظ التعديل':'💾 Save Changes'):(lang==='ar'?'+ إضافة':'+ Add')}
            </button>
            <button onClick={resetForm}
              style={{ padding:'10px 16px', background:'#F1F5F9', color:'#475569', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo' }}>
              {lang==='ar'?'إلغاء':'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background:'white', borderRadius:'14px', border:'1px solid #E8EDF5', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        {/* Table Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'14px', fontWeight:'800', color:'#0F172A' }}>
            {activeTabMeta?.icon} {activeTabMeta?.label[lang]}
          </span>
          <span style={{ background:activeTabMeta?.bg, color:activeTabMeta?.color, border:`1px solid ${activeTabMeta?.border}`, padding:'3px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:'700' }}>
            {currentData.length} {lang==='ar'?'سجل':'records'}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
            <thead>
              <tr>
                <th style={{ ...thS, textAlign:lang==='ar'?'right':'left' }}>{lang==='ar'?'الاسم بالعربي':'Arabic Name'}</th>
                <th style={{ ...thS, textAlign:'center' }}>{lang==='ar'?'الاسم بالإنجليزي':'English Name'}</th>
                {activeTab==='departments'&&<th style={{ ...thS, textAlign:'center' }}>{lang==='ar'?'الكلية':'College'}</th>}
                {activeTab==='adminDepts'&&<th style={{ ...thS, textAlign:'center' }}>{lang==='ar'?'تابع لـ / الوظيفة':'Reports To'}</th>}
                {activeTab!=='adminDepts'&&<th style={{ ...thS, textAlign:'center' }}>{lang==='ar'?'الكود':'Code'}</th>}
                {activeTab==='departments'&&<th style={{ ...thS, textAlign:'center' }}>{lang==='ar'?'الكلية':'College'}</th>}
                <th style={{ ...thS, textAlign:'center' }}>{lang==='ar'?'إجراءات':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length===0?(
                <tr><td colSpan="5" style={{ textAlign:'center', padding:'48px', color:'#94A3B8' }}>
                  <div style={{ fontSize:'36px', marginBottom:'10px' }}>📭</div>
                  {lang==='ar'?'لا توجد بيانات':'No data found'}
                </td></tr>
              ):currentData.map((item,idx)=>{
                const college = colleges.find(c=>c.id===item.collegeId);
                return(
                  <tr key={item.id} style={{ background:idx%2===0?'white':'#FAFBFC', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={{ ...tdS, textAlign:lang==='ar'?'right':'left', fontWeight:'700', color:'#0F172A' }}>{item.name}</td>
                    <td style={{ ...tdS, color:'#475569', direction:'ltr' }}>{item.nameEn}</td>
                    {activeTab==='adminDepts'&&(
                      <td style={tdS}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                          {item.parentType==='college'&&(()=>{const c=colleges.find(x=>x.id===item.collegeId);return c?<span style={{fontSize:'12px',color:'#6B21A8',fontWeight:'600'}}>🏛️ {lang==='en'?c.nameEn:c.name}</span>:null;})()}
                          {item.parentType==='admin'&&(()=>{const a=adminDepts.find(x=>x.id===item.parentId);return a?<span style={{fontSize:'12px',color:'#B45309',fontWeight:'600'}}>🗂️ {lang==='en'?a.nameEn:a.name}</span>:null;})()}
                          {item.parentType==='university'&&<span style={{fontSize:'12px',color:'#1565C0',fontWeight:'600'}}>🏫 {lang==='ar'?'الجامعة':'University'}</span>}
                          {item.function&&<span style={{fontSize:'11px',color:'#94A3B8',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.function}</span>}
                        </div>
                      </td>
                    )}
                    {activeTab==='departments'&&(
                      <td style={{...tdS,color:'#6B21A8',fontWeight:'600'}}>{(()=>{const c=colleges.find(x=>x.id===item.collegeId);return c?(lang==='en'?c.nameEn:c.name):'—';})()}</td>
                    )}
                    {activeTab!=='adminDepts'&&(
                      <td style={tdS}>
                        <span style={{ background:activeTabMeta?.bg, color:activeTabMeta?.color, border:`1px solid ${activeTabMeta?.border}`, padding:'3px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:'700', direction:'ltr', display:'inline-block' }}>
                          {item.id}
                        </span>
                      </td>
                    )}
                    {activeTab==='departments'&&(
                      <td style={{ ...tdS, color:'#6B21A8', fontWeight:'600' }}>{lang==='en'?college?.nameEn:college?.name}</td>
                    )}
                    <td style={tdS}>
                      <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                        <button onClick={()=>handleEdit(item)}
                          onMouseEnter={e=>{ e.currentTarget.style.background='#DBEAFE'; e.currentTarget.style.transform='translateY(-1px)'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background='#EFF6FF'; e.currentTarget.style.transform='translateY(0)'; }}
                          style={{ padding:'6px 14px', background:'#EFF6FF', color:'#1565C0', border:'1px solid #BFDBFE', borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', transition:'all .15s' }}>
                          ✏️ {lang==='ar'?'تعديل':'Edit'}
                        </button>
                        <button onClick={()=>handleDelete(item.id)}
                          onMouseEnter={e=>{ e.currentTarget.style.background='#FEE2E2'; e.currentTarget.style.transform='translateY(-1px)'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background='#FFF5F5'; e.currentTarget.style.transform='translateY(0)'; }}
                          style={{ padding:'6px 14px', background:'#FFF5F5', color:'#991B1B', border:'1px solid #FECACA', borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', transition:'all .15s' }}>
                          🗑️ {lang==='ar'?'حذف':'Delete'}
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

    </div>
  );
}

export default Structure;