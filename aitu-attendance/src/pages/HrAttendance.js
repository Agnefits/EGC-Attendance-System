import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EMPLOYEES, ATTENDANCE, DEPARTMENTS, LEAVES } from '../data';

const STATUS_META = {
  present:{ label:{ar:'حاضر', en:'Present'}, color:'#14532D', bg:'#DCFCE7', border:'#BBF7D0' },
  late:   { label:{ar:'متأخر',en:'Late'},    color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  left:   { label:{ar:'انصرف',en:'Left'},    color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
  absent: { label:{ar:'غائب', en:'Absent'},  color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
};

const PERM_TYPES = {
  morning:    { label:{ar:'صباحي',    en:'Morning'},     color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  evening:    { label:{ar:'مسائي',    en:'Evening'},     color:'#6B21A8', bg:'#EDE9FE', border:'#DDD6FE' },
  exceptional:{ label:{ar:'استثنائي', en:'Exceptional'}, color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  nursing:    { label:{ar:'رضاعة',    en:'Nursing'},     color:'#BE185D', bg:'#FCE7F3', border:'#FBCFE8' },
};

const LEAVE_TYPES = {
  annual:      { label:{ar:'اعتيادي',   en:'Annual'},      color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
  sick:        { label:{ar:'مرضية',     en:'Sick'},        color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  urgent:      { label:{ar:'عارضة',     en:'Urgent'},      color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  maternity:   { label:{ar:'وضع',       en:'Maternity'},   color:'#BE185D', bg:'#FCE7F3', border:'#FBCFE8' },
  compensatory:{ label:{ar:'بدل راحة', en:'Comp'},         color:'#6B21A8', bg:'#EDE9FE', border:'#DDD6FE' },
  grant:       { label:{ar:'منحة',      en:'Grant'},       color:'#166534', bg:'#DCFCE7', border:'#BBF7D0' },
  unpaid:      { label:{ar:'بدون راتب',en:'Unpaid'},       color:'#475569', bg:'#F1F5F9', border:'#CBD5E1' },
};

const LEAVE_STATUS = {
  pending: { label:{ar:'معلق',  en:'Pending'},  color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  approved:{ label:{ar:'موافق', en:'Approved'}, color:'#14532D', bg:'#DCFCE7', border:'#BBF7D0' },
  rejected:{ label:{ar:'مرفوض',en:'Rejected'},  color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
};

const PERM_STATUS = {
  pending: { label:{ar:'معلق',  en:'Pending'},  color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  approved:{ label:{ar:'موافق', en:'Approved'}, color:'#14532D', bg:'#DCFCE7', border:'#BBF7D0' },
  rejected:{ label:{ar:'مرفوض',en:'Rejected'},  color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
};

export default function HrAttendance({ lang, readOnly=false }) {
  const dir = lang==='ar'?'rtl':'ltr';

  const [activeTab,    setActiveTab]    = useState('att');
  const [filterDept,   setFilterDept]   = useState('all');
  const [selectedEmps, setSelectedEmps] = useState([]); // multi-select
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLeaveType,setFilterLeaveType]=useState('all');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [showEmpPicker,setShowEmpPicker]= useState(false);
  const empPickerRef = useRef(null);

  useEffect(()=>{
    const fn = e => {
      if (empPickerRef.current && !empPickerRef.current.contains(e.target)) {
        setShowEmpPicker(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const [permissions] = useState([
    { id:'P1', employeeId:'EMP001', type:'morning',     duration:60, date:'2026-05-22', reason:'موعد طبي',   status:'approved' },
    { id:'P2', employeeId:'EMP002', type:'evening',     duration:90, date:'2026-05-23', reason:'ظرف عائلي', status:'approved' },
    { id:'P3', employeeId:'EMP003', type:'exceptional', duration:45, date:'2026-05-21', reason:'طارئ',       status:'approved' },
    { id:'P4', employeeId:'EMP004', type:'morning',     duration:60, date:'2026-05-20', reason:'موعد طبي',   status:'approved' },
    { id:'P5', employeeId:'EMP005', type:'nursing',     duration:60, date:'2026-05-19', reason:'رضاعة',      status:'approved' },
    { id:'P6', employeeId:'EMP001', type:'evening',     duration:60, date:'2026-04-15', reason:'ظرف عائلي', status:'rejected' },
  ]);

  const empOptions = useMemo(()=>
    filterDept==='all' ? EMPLOYEES : EMPLOYEES.filter(e=>e.departmentId===filterDept)
  ,[filterDept]);

  // When dept changes, reset selection
  function handleDeptChange(d) {
    setFilterDept(d);
    setSelectedEmps([]);
  }

  function toggleEmp(id) {
    setSelectedEmps(p=> p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  }

  function selectAll()   { setSelectedEmps(empOptions.map(e=>e.id)); }
  function deselectAll() { setSelectedEmps([]); }

  const empFilter = a => selectedEmps.length===0 || selectedEmps.includes(a.employeeId);
  const deptFilter = a => {
    if (filterDept==='all') return true;
    const emp=EMPLOYEES.find(e=>e.id===a.employeeId);
    return emp?.departmentId===filterDept;
  };
  const dateFilter = a => (!dateFrom||a.date>=dateFrom) && (!dateTo||a.date<=dateTo);

  const filteredAtt = useMemo(()=> ATTENDANCE.filter(a=>
    deptFilter(a) && empFilter(a) && dateFilter(a) &&
    (filterStatus==='all'||a.status===filterStatus)
  ),[filterDept,selectedEmps,filterStatus,dateFrom,dateTo]);

  const filteredPerm = useMemo(()=> permissions.filter(p=>
    deptFilter(p) && empFilter(p) && dateFilter(p)
  ),[permissions,filterDept,selectedEmps,dateFrom,dateTo]);

  const filteredLeaves = useMemo(()=> LEAVES.filter(l=>
    deptFilter(l) && empFilter(l) && dateFilter({...l, date:l.from}) &&
    (filterLeaveType==='all'||l.type===filterLeaveType)
  ),[filterDept,selectedEmps,filterLeaveType,dateFrom,dateTo]);

  const stats = useMemo(()=>({
    total:  filteredAtt.length,
    present:filteredAtt.filter(a=>a.status==='present'||a.status==='left').length,
    absent: filteredAtt.filter(a=>a.status==='absent').length,
    late:   filteredAtt.filter(a=>a.status==='late').length,
  }),[filteredAtt]);

  const hasFilters = filterDept!=='all'||selectedEmps.length>0||filterStatus!=='all'||dateFrom||dateTo||filterLeaveType!=='all';
  function clearFilters(){ setFilterDept('all');setSelectedEmps([]);setFilterStatus('all');setDateFrom('');setDateTo('');setFilterLeaveType('all'); }
  function setQuickDate(m){ const to=new Date().toISOString().slice(0,10); if(m===0){const n=new Date();setDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`);setDateTo(to);}else if(m===-1){const y=new Date().getFullYear();setDateFrom(`${y}-01-01`);setDateTo(`${y}-12-31`);}else{const n=new Date();n.setMonth(n.getMonth()-m);setDateFrom(n.toISOString().slice(0,10));setDateTo(to);} }

  function exportExcel(){
    let H,rows,sheetName;
    if(activeTab==='att'){
      H=[lang==='ar'?'الاسم':'Name',lang==='ar'?'القسم':'Dept',lang==='ar'?'التاريخ':'Date',lang==='ar'?'وقت الحضور':'Check In',lang==='ar'?'وقت الانصراف':'Check Out',lang==='ar'?'الحالة':'Status'];
      rows=filteredAtt.map(r=>{const e=EMPLOYEES.find(x=>x.id===r.employeeId);const d=DEPARTMENTS.find(x=>x.id===e?.departmentId);return[lang==='en'?e?.nameEn:e?.name,lang==='en'?d?.nameEn:d?.name,r.date,r.checkIn||'—',r.checkOut||'—',STATUS_META[r.status]?.label[lang]];});
      sheetName=lang==='ar'?'الحضور':'Attendance';
    }else if(activeTab==='perm'){
      H=[lang==='ar'?'الاسم':'Name',lang==='ar'?'القسم':'Dept',lang==='ar'?'النوع':'Type',lang==='ar'?'التاريخ':'Date',lang==='ar'?'المدة (دقيقة)':'Duration(min)',lang==='ar'?'السبب':'Reason',lang==='ar'?'الحالة':'Status'];
      rows=filteredPerm.map(r=>{const e=EMPLOYEES.find(x=>x.id===r.employeeId);const d=DEPARTMENTS.find(x=>x.id===e?.departmentId);return[lang==='en'?e?.nameEn:e?.name,lang==='en'?d?.nameEn:d?.name,PERM_TYPES[r.type]?.label[lang],r.date,r.duration,r.reason,PERM_STATUS[r.status]?.label[lang]];});
      sheetName=lang==='ar'?'الأذونات':'Permissions';
    }else{
      H=[lang==='ar'?'الاسم':'Name',lang==='ar'?'القسم':'Dept',lang==='ar'?'نوع الإجازة':'Leave Type',lang==='ar'?'من':'From',lang==='ar'?'إلى':'To',lang==='ar'?'الأيام':'Days',lang==='ar'?'الحالة':'Status'];
      rows=filteredLeaves.map(r=>{const e=EMPLOYEES.find(x=>x.id===r.employeeId);const d=DEPARTMENTS.find(x=>x.id===e?.departmentId);return[lang==='en'?e?.nameEn:e?.name,lang==='en'?d?.nameEn:d?.name,LEAVE_TYPES[r.type]?.label[lang],r.from,r.to,r.days,LEAVE_STATUS[r.status]?.label[lang]];});
      sheetName=lang==='ar'?'الإجازات':'Leaves';
    }
    const XLSX=window.XLSX;
    if(!XLSX){const csv='\uFEFF'+[H,...rows].map(r=>r.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`${activeTab}_report_${new Date().toISOString().slice(0,10)}.csv`;a.click();return;}
    const ws=XLSX.utils.aoa_to_sheet([H,...rows]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${activeTab}_report_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const thS={background:'#F8FAFC',padding:'13px 18px',textAlign:'center',fontWeight:'700',color:'#475569',fontSize:'14px',borderBottom:'1.5px solid #E2E8F0',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:1};
  const tdS=(x={})=>({padding:'13px 18px',borderBottom:'1px solid #F8FAFC',fontSize:'14px',textAlign:'center',verticalAlign:'middle',...x});
  const labelS={display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'7px'};
  const inputS={width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box',color:'#334155',transition:'border-color .15s'};

  const currentCount = activeTab==='att'?filteredAtt.length:activeTab==='perm'?filteredPerm.length:filteredLeaves.length;

  return (
    <div style={{padding:'22px 26px',fontFamily:'Cairo,sans-serif',direction:dir,background:'#F1F5F9',minHeight:'100%'}}>

      {/* ══ HERO (admin-style) ══ */}
      <div style={{borderRadius:'16px',marginBottom:'18px',overflow:'hidden',boxShadow:'0 4px 16px rgba(13,59,122,.15)'}}>
        <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginBottom:'4px'}}>{lang==='ar'?'لوحة الموارد البشرية':'HR Dashboard'}</div>
            <h1 style={{margin:0,fontSize:'22px',fontWeight:'800',color:'white'}}>{lang==='ar'?'سجل الحضور والإجازات والأذونات':'Attendance, Leaves & Permissions'}</h1>
            <p style={{margin:'4px 0 0',color:'rgba(255,255,255,.6)',fontSize:'12px'}}>
              {new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={exportExcel}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.25)',borderRadius:'9px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {lang==='ar'?'تصدير Excel':'Export Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:'4px',background:'white',padding:'5px',borderRadius:'14px',border:'1px solid #E8EDF5',width:'fit-content',marginBottom:'18px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        {[
          {id:'att',  icon:'M12 6v6l4 2', l:{ar:'سجل الحضور',   en:'Attendance'}},
          {id:'perm', icon:'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', l:{ar:'سجل الأذونات', en:'Permissions'}},
          {id:'leave',icon:'M3 4h18v18H3V4zm0 6h18', l:{ar:'سجل الإجازات',  en:'Leaves'}},
        ].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{display:'flex',alignItems:'center',gap:'7px',padding:'10px 22px',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s',
              background:activeTab===tab.id?'#1565C0':'transparent',
              color:activeTab===tab.id?'white':'#475569',
              boxShadow:activeTab===tab.id?'0 3px 12px rgba(21,101,192,.3)':'none'}}>
            {tab.l[lang]}
          </button>
        ))}
      </div>

      {/* ── Stats (att only) ── */}
      {activeTab==='att'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'18px'}}>
          {[
            {l:{ar:'الإجمالي', en:'Total'},   v:stats.total,   c:'#334155',bg:'#F1F5F9',b:'#CBD5E1'},
            {l:{ar:'حاضر',     en:'Present'}, v:stats.present, c:'#14532D', bg:'#DCFCE7',b:'#BBF7D0'},
            {l:{ar:'غائب',     en:'Absent'},  v:stats.absent,  c:'#991B1B', bg:'#FEE2E2',b:'#FECACA'},
            {l:{ar:'متأخر',    en:'Late'},    v:stats.late,    c:'#B45309', bg:'#FEF3C7',b:'#FDE68A'},
          ].map(s=>(
            <div key={s.l.ar} style={{background:'white',borderRadius:'14px',padding:'18px 20px',border:`1.5px solid ${s.b}`,display:'flex',alignItems:'center',gap:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${s.b}55`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}>
              <div style={{width:'10px',height:'40px',borderRadius:'4px',background:s.c,flexShrink:0}}/>
              <div>
                <div style={{fontSize:'13px',color:'#64748B',fontWeight:'600',marginBottom:'4px'}}>{s.l[lang]}</div>
                <div style={{fontSize:'30px',fontWeight:'900',color:s.c,lineHeight:1}}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Panel ── */}
      <div style={{background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',padding:'20px 22px',marginBottom:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px',paddingBottom:'14px',borderBottom:'1px solid #F1F5F9'}}>
          <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'9px',background:'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </div>
            <span style={{fontSize:'15px',fontWeight:'800',color:'#0F172A'}}>{lang==='ar'?'فلترة السجلات':'Filter Records'}</span>
            {hasFilters&&<span style={{background:'#1565C0',color:'white',padding:'3px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>{lang==='ar'?'فعّال':'Active'}</span>}
          </div>
          {hasFilters&&(
            <button onClick={clearFilters}
              style={{display:'flex',alignItems:'center',gap:'6px',background:'#FEE2E2',color:'#991B1B',border:'1px solid #FECACA',borderRadius:'9px',padding:'7px 14px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#FECACA'}
              onMouseLeave={e=>e.currentTarget.style.background='#FEE2E2'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              {lang==='ar'?'مسح الكل':'Clear All'}
            </button>
          )}
        </div>

        {/* Row 1 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px',marginBottom:'14px'}}>

          {/* Dept */}
          <div>
            <label style={labelS}>{lang==='ar'?'القسم':'Department'}</label>
            <select value={filterDept} onChange={e=>handleDeptChange(e.target.value)}
              onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}
              style={inputS}>
              <option value="all">{lang==='ar'?'كل الأقسام':'All Departments'}</option>
              {DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
            </select>
          </div>

          {/* Multi-select employees */}
          <div ref={empPickerRef} style={{position:'relative'}}>
            <label style={labelS}>
              {lang==='ar'?'الموظفون':'Employees'}
              {selectedEmps.length>0&&<span style={{background:'#1565C0',color:'white',borderRadius:'999px',fontSize:'11px',padding:'2px 7px',fontWeight:'700',marginInlineStart:'6px'}}>{selectedEmps.length}</span>}
            </label>
            <div onClick={()=>setShowEmpPicker(p=>!p)}
              style={{...inputS,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',userSelect:'none',background:showEmpPicker?'#F8FAFC':'white',borderColor:showEmpPicker?'#1565C0':'#E2E8F0'}}>
              <span style={{color:selectedEmps.length?'#0F172A':'#94A3B8',fontSize:'14px'}}>
                {selectedEmps.length===0
                  ?(lang==='ar'?'اختر موظفاً أو أكثر':'Select employees')
                  :selectedEmps.length===empOptions.length
                    ?(lang==='ar'?'كل الموظفين':'All employees')
                    :`${selectedEmps.length} ${lang==='ar'?'موظف مختار':'selected'}`}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:'transform .2s',transform:showEmpPicker?'rotate(180deg)':'rotate(0)'}}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {showEmpPicker&&(
              <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:'calc(100% + 6px)',[lang==='ar'?'right':'left']:0,width:'100%',minWidth:'260px',background:'white',borderRadius:'14px',border:'1.5px solid #E2E8F0',boxShadow:'0 16px 48px rgba(0,0,0,.14)',zIndex:500,overflow:'hidden'}}>
                {/* Toolbar */}
                <div style={{padding:'10px 14px',borderBottom:'1px solid #F1F5F9',display:'flex',gap:'8px'}}>
                  <button onClick={selectAll}
                    style={{flex:1,padding:'6px',background:'#EFF6FF',color:'#1565C0',border:'1px solid #BFDBFE',borderRadius:'7px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
                    {lang==='ar'?'اختر الكل':'Select All'}
                  </button>
                  <button onClick={deselectAll}
                    style={{flex:1,padding:'6px',background:'#F8FAFC',color:'#475569',border:'1px solid #E2E8F0',borderRadius:'7px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
                    {lang==='ar'?'إلغاء الكل':'Deselect All'}
                  </button>
                </div>
                {/* Employee list */}
                <div style={{maxHeight:'220px',overflowY:'auto'}}>
                  {empOptions.map(e=>{
                    const sel=selectedEmps.includes(e.id);
                    return(
                      <div key={e.id} onClick={()=>toggleEmp(e.id)}
                        style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',background:sel?'#EFF6FF':'white',borderBottom:'1px solid #F8FAFC',transition:'background .1s'}}
                        onMouseEnter={ev=>{if(!sel)ev.currentTarget.style.background='#F8FAFC';}}
                        onMouseLeave={ev=>{if(!sel)ev.currentTarget.style.background='white';}}>
                        <div style={{width:'18px',height:'18px',borderRadius:'5px',border:`2px solid ${sel?'#1565C0':'#CBD5E1'}`,background:sel?'#1565C0':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                          {sel&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'13px',fontWeight:sel?'700':'500',color:sel?'#1565C0':'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?e.nameEn:e.name}</div>
                          <div style={{fontSize:'11px',color:'#94A3B8'}}>{e.email}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status / Leave type */}
          <div>
            {activeTab==='att'?(
              <>
                <label style={labelS}>{lang==='ar'?'الحالة':'Status'}</label>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}
                  style={inputS}>
                  <option value="all">{lang==='ar'?'كل الحالات':'All Statuses'}</option>
                  {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label[lang]}</option>)}
                </select>
              </>
            ):activeTab==='leave'?(
              <>
                <label style={labelS}>{lang==='ar'?'نوع الإجازة':'Leave Type'}</label>
                <select value={filterLeaveType} onChange={e=>setFilterLeaveType(e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}
                  style={inputS}>
                  <option value="all">{lang==='ar'?'كل الأنواع':'All Types'}</option>
                  {Object.entries(LEAVE_TYPES).map(([k,v])=><option key={k} value={k}>{v.label[lang]}</option>)}
                </select>
              </>
            ):<div/>}
          </div>
        </div>

        {/* Row 2: dates + shortcuts */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'14px',alignItems:'end'}}>
          <div>
            <label style={labelS}>{lang==='ar'?'من تاريخ':'From Date'}</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}
              style={{...inputS,direction:'ltr'}}/>
          </div>
          <div>
            <label style={labelS}>{lang==='ar'?'إلى تاريخ':'To Date'}</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}
              style={{...inputS,direction:'ltr'}}/>
          </div>
          <div>
            <label style={labelS}>{lang==='ar'?'اختصارات':'Quick'}</label>
            <div style={{display:'flex',gap:'7px'}}>
              {[
                {l:{ar:'هذا الشهر',en:'This Month'}, fn:()=>setQuickDate(0)},
                {l:{ar:'شهرين',    en:'2 Months'},   fn:()=>setQuickDate(2)},
                {l:{ar:'3 شهور',   en:'3 Months'},   fn:()=>setQuickDate(3)},
                {l:{ar:'6 شهور',   en:'6 Months'},   fn:()=>setQuickDate(6)},
                {l:{ar:'سنة كاملة',en:'Full Year'},   fn:()=>setQuickDate(-1)},
              ].map(s=>(
                <button key={s.l.ar} onClick={s.fn}
                  style={{padding:'9px 14px',background:'#EFF6FF',color:'#1565C0',border:'1px solid #BFDBFE',borderRadius:'9px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',whiteSpace:'nowrap',transition:'all .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#DBEAFE'}
                  onMouseLeave={e=>e.currentTarget.style.background='#EFF6FF'}>
                  {s.l[lang]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        {hasFilters&&(
          <div style={{marginTop:'14px',padding:'11px 16px',background:'linear-gradient(135deg,#EFF6FF,#F0F9FF)',borderRadius:'11px',border:'1px solid #BFDBFE',display:'flex',alignItems:'center',gap:'9px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{fontSize:'13px',fontWeight:'700',color:'#1565C0'}}>
              {lang==='ar'?`تم العثور على ${currentCount} سجل`:`Found ${currentCount} records`}
              {selectedEmps.length>0&&(lang==='ar'?` لـ ${selectedEmps.length} موظف`:` for ${selectedEmps.length} employees`)}
            </span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{padding:'15px 20px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:'15px',fontWeight:'800',color:'#0F172A'}}>
            {activeTab==='att'?(lang==='ar'?'سجل الحضور':'Attendance Log'):activeTab==='perm'?(lang==='ar'?'سجل الأذونات':'Permissions Log'):(lang==='ar'?'سجل الإجازات':'Leaves Log')}
          </div>
          <span style={{background:'#F1F5F9',color:'#475569',padding:'4px 12px',borderRadius:'999px',fontSize:'13px',fontWeight:'700',border:'1px solid #E2E8F0'}}>
            {currentCount} {lang==='ar'?'سجل':'records'}
          </span>
        </div>
        <div style={{overflowX:'auto',maxHeight:'480px',overflowY:'auto'}}>
          {activeTab==='att'&&(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
                <th style={thS}>{lang==='ar'?'القسم':'Dept'}</th>
                <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
                <th style={thS}>{lang==='ar'?'الحضور':'Check In'}</th>
                <th style={thS}>{lang==='ar'?'الانصراف':'Check Out'}</th>
                <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
              </tr></thead>
              <tbody>
                {filteredAtt.length===0?<tr><td colSpan="6" style={{textAlign:'center',padding:'56px',color:'#94A3B8'}}><div style={{fontSize:'40px',marginBottom:'12px'}}>🔍</div><div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A',marginBottom:'4px'}}>{lang==='ar'?'لا توجد نتائج':'No results'}</div></td></tr>
                :filteredAtt.map((a,idx)=>{
                  const emp=EMPLOYEES.find(e=>e.id===a.employeeId);
                  const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
                  const sm=STATUS_META[a.status];
                  return(<tr key={a.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={tdS({textAlign:lang==='ar'?'right':'left'})}><div style={{fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div><div style={{fontSize:'11px',color:'#94A3B8'}}>{emp?.email}</div></td>
                    <td style={tdS({color:'#64748B',fontSize:'13px'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                    <td style={tdS({direction:'ltr',color:'#64748B'})}>{a.date}</td>
                    <td style={tdS({direction:'ltr',color:'#14532D',fontWeight:'700'})}>{a.checkIn||'—'}</td>
                    <td style={tdS({direction:'ltr',color:'#1565C0',fontWeight:'700'})}>{a.checkOut||'—'}</td>
                    <td style={tdS()}><span style={{background:sm?.bg,color:sm?.color,border:`1px solid ${sm?.border}`,padding:'4px 13px',borderRadius:'999px',fontSize:'13px',fontWeight:'700'}}>{sm?.label[lang]}</span></td>
                  </tr>);
                })}
              </tbody>
            </table>
          )}
          {activeTab==='perm'&&(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
                <th style={thS}>{lang==='ar'?'القسم':'Dept'}</th>
                <th style={thS}>{lang==='ar'?'نوع الإذن':'Type'}</th>
                <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
                <th style={thS}>{lang==='ar'?'المدة':'Duration'}</th>
                <th style={thS}>{lang==='ar'?'السبب':'Reason'}</th>
                <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
              </tr></thead>
              <tbody>
                {filteredPerm.length===0?<tr><td colSpan="7" style={{textAlign:'center',padding:'56px',color:'#94A3B8'}}><div style={{fontSize:'40px',marginBottom:'12px'}}>🔍</div><div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>{lang==='ar'?'لا توجد نتائج':'No results'}</div></td></tr>
                :filteredPerm.map((p,idx)=>{
                  const emp=EMPLOYEES.find(e=>e.id===p.employeeId);
                  const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
                  const pt=PERM_TYPES[p.type]; const ps=PERM_STATUS[p.status];
                  return(<tr key={p.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={tdS({textAlign:lang==='ar'?'right':'left'})}><div style={{fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div><div style={{fontSize:'11px',color:'#94A3B8'}}>{emp?.email}</div></td>
                    <td style={tdS({color:'#64748B',fontSize:'13px'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                    <td style={tdS()}><span style={{background:pt?.bg,color:pt?.color,border:`1px solid ${pt?.border}`,padding:'4px 13px',borderRadius:'999px',fontSize:'13px',fontWeight:'700',whiteSpace:'nowrap'}}>{pt?.label[lang]}</span></td>
                    <td style={tdS({direction:'ltr',color:'#64748B'})}>{p.date}</td>
                    <td style={tdS({fontWeight:'800',color:'#334155'})}>{p.duration} {lang==='ar'?'د':'m'}</td>
                    <td style={tdS({color:'#475569',fontSize:'13px',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'})}>{p.reason}</td>
                    <td style={tdS()}><span style={{background:ps?.bg,color:ps?.color,border:`1px solid ${ps?.border}`,padding:'4px 13px',borderRadius:'999px',fontSize:'13px',fontWeight:'700'}}>{ps?.label[lang]}</span></td>
                  </tr>);
                })}
              </tbody>
            </table>
          )}
          {activeTab==='leave'&&(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
                <th style={thS}>{lang==='ar'?'القسم':'Dept'}</th>
                <th style={thS}>{lang==='ar'?'نوع الإجازة':'Type'}</th>
                <th style={thS}>{lang==='ar'?'من':'From'}</th>
                <th style={thS}>{lang==='ar'?'إلى':'To'}</th>
                <th style={thS}>{lang==='ar'?'الأيام':'Days'}</th>
                <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
              </tr></thead>
              <tbody>
                {filteredLeaves.length===0?<tr><td colSpan="7" style={{textAlign:'center',padding:'56px',color:'#94A3B8'}}><div style={{fontSize:'40px',marginBottom:'12px'}}>🔍</div><div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>{lang==='ar'?'لا توجد نتائج':'No results'}</div></td></tr>
                :filteredLeaves.map((l,idx)=>{
                  const emp=EMPLOYEES.find(e=>e.id===l.employeeId);
                  const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
                  const lt=LEAVE_TYPES[l.type]; const ls=LEAVE_STATUS[l.status];
                  return(<tr key={l.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={tdS({textAlign:lang==='ar'?'right':'left'})}><div style={{fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div><div style={{fontSize:'11px',color:'#94A3B8'}}>{emp?.email}</div></td>
                    <td style={tdS({color:'#64748B',fontSize:'13px'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                    <td style={tdS()}><span style={{background:lt?.bg,color:lt?.color,border:`1px solid ${lt?.border}`,padding:'4px 13px',borderRadius:'999px',fontSize:'13px',fontWeight:'700',whiteSpace:'nowrap'}}>{lt?.label[lang]}</span></td>
                    <td style={tdS({direction:'ltr',color:'#64748B'})}>{l.from}</td>
                    <td style={tdS({direction:'ltr',color:'#64748B'})}>{l.to}</td>
                    <td style={tdS({fontWeight:'900',color:'#1565C0',fontSize:'16px'})}>{l.days}</td>
                    <td style={tdS()}><span style={{background:ls?.bg,color:ls?.color,border:`1px solid ${ls?.border}`,padding:'4px 13px',borderRadius:'999px',fontSize:'13px',fontWeight:'700'}}>{ls?.label[lang]}</span></td>
                  </tr>);
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
