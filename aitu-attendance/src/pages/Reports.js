import React, { useState } from 'react';
import { EMPLOYEES, ATTENDANCE, DEPARTMENTS, COLLEGES, LEAVES } from '../data';

const LEAVE_TYPES = [
  { id:'annual',       icon:'📅', label:{ar:'اعتيادي',   en:'Annual'},      color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
  { id:'sick',         icon:'🏥', label:{ar:'مرضية',     en:'Sick'},        color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  { id:'urgent',       icon:'⚡', label:{ar:'عارضة',     en:'Urgent'},      color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  { id:'maternity',    icon:'🤱', label:{ar:'وضع',        en:'Maternity'},   color:'#BE185D', bg:'#FCE7F3', border:'#FBCFE8' },
  { id:'compensatory', icon:'🔄', label:{ar:'بدل راحة', en:'Compensatory'},color:'#6B21A8', bg:'#EDE9FE', border:'#DDD6FE' },
  { id:'grant',        icon:'🎁', label:{ar:'منحة',      en:'Grant'},       color:'#166534', bg:'#DCFCE7', border:'#BBF7D0' },
  { id:'unpaid',       icon:'📋', label:{ar:'بدون راتب',en:'Unpaid'},      color:'#475569', bg:'#F1F5F9', border:'#CBD5E1' },
];

const ST = {
  present:  { label:{ar:'حاضر',   en:'Present'},  color:'#166534', bg:'#DCFCE7', border:'#BBF7D0' },
  late:     { label:{ar:'متأخر',  en:'Late'},     color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  left:     { label:{ar:'انصرف', en:'Left'},      color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
  absent:   { label:{ar:'غائب',   en:'Absent'},   color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  approved: { label:{ar:'موافق',  en:'Approved'}, color:'#166534', bg:'#DCFCE7', border:'#BBF7D0' },
  pending:  { label:{ar:'معلق',   en:'Pending'},  color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  rejected: { label:{ar:'مرفوض', en:'Rejected'}, color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
};

const barC = p => p>=80?'#16A34A':p>=50?'#D97706':'#DC2626';

function Badge({ color, bg, border, children }) {
  return (
    <span style={{background:bg,color,border:`1px solid ${border}`,padding:'3px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',display:'inline-block'}}>
      {children}
    </span>
  );
}

function Reports({ t, lang, user }) {
  const [activeTab, setActiveTab] = useState('attendance');
  const [viewMode,  setViewMode]  = useState('table');
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
  const toggleLeaveType = (id) => setSelectedLeaveTypes(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const toggleDept = (id) => setSelectedDepts(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const dir = lang==='ar'?'rtl':'ltr';

  /* ── Data ── */
  const attendance = ATTENDANCE.filter(a => {
    if (user.role==='head') { const e=EMPLOYEES.find(x=>x.id===a.employeeId); return e&&e.departmentId===user.departmentId; }
    return true;
  });
  const leaves = LEAVES.filter(l => {
    if (user.role==='head') { const e=EMPLOYEES.find(x=>x.id===l.employeeId); return e&&e.departmentId===user.departmentId; }
    return true;
  });

  const total   = attendance.length;
  const present = attendance.filter(a=>a.status==='present'||a.status==='left').length;
  const absent  = attendance.filter(a=>a.status==='absent').length;
  const late    = attendance.filter(a=>a.status==='late').length;
  const pct     = total?Math.round(present/total*100):0;

  const deptStats = DEPARTMENTS.filter(d => user.role==='head'?d.id===user.departmentId:true).map(dept=>{
    const emps=EMPLOYEES.filter(e=>e.departmentId===dept.id);
    const atts=attendance.filter(a=>emps.find(e=>e.id===a.employeeId));
    const p=atts.filter(a=>a.status==='present'||a.status==='left').length;
    return {...dept,empCount:emps.length,present:p,absent:atts.filter(a=>a.status==='absent').length,late:atts.filter(a=>a.status==='late').length,pct:atts.length?Math.round(p/atts.length*100):0};
  }).filter(d=>d.empCount>0);

  const leaveStats = LEAVE_TYPES.map(lt=>({
    ...lt,
    total:    leaves.filter(l=>l.type===lt.id).length,
    approved: leaves.filter(l=>l.type===lt.id&&l.status==='approved').length,
    pending:  leaves.filter(l=>l.type===lt.id&&l.status==='pending').length,
    rejected: leaves.filter(l=>l.type===lt.id&&l.status==='rejected').length,
  }));

  /* ── Export ── */
  function doExport() {
    const XLSX=window.XLSX;
    let rows;
    if (activeTab==='attendance') {
      rows=[[lang==='ar'?'الاسم':'Name',lang==='ar'?'القسم':'Dept',lang==='ar'?'حضور':'In',lang==='ar'?'انصراف':'Out',lang==='ar'?'الحالة':'Status'],
        ...attendance.map(a=>{const e=EMPLOYEES.find(x=>x.id===a.employeeId);const d=DEPARTMENTS.find(x=>x.id===e?.departmentId);return[lang==='en'?e?.nameEn:e?.name,lang==='en'?d?.nameEn:d?.name,a.checkIn||'—',a.checkOut||'—',ST[a.status]?.label[lang]];})];
    } else {
      rows=[[lang==='ar'?'الاسم':'Name',lang==='ar'?'النوع':'Type',lang==='ar'?'من':'From',lang==='ar'?'إلى':'To',lang==='ar'?'أيام':'Days',lang==='ar'?'الحالة':'Status'],
        ...(selectedLeaveTypes.length>0?leaves.filter(l=>selectedLeaveTypes.includes(l.type)):leaves).map(l=>{const e=EMPLOYEES.find(x=>x.id===l.employeeId);const lt=LEAVE_TYPES.find(x=>x.id===l.type);return[lang==='en'?e?.nameEn:e?.name,lt?.label[lang],l.from,l.to,l.days,ST[l.status]?.label[lang]];})];
    }
    const name=activeTab==='attendance'?(lang==='ar'?'الحضور':'attendance'):(lang==='ar'?'الإجازات':'leaves');
    if(!XLSX){const csv='\uFEFF'+rows.map(r=>r.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`${name}_${new Date().toISOString().split('T')[0]}.csv`;a.click();return;}
    const ws=XLSX.utils.aoa_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name);XLSX.writeFile(wb,`${name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /* ── Style helpers ── */
  const card = {background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',boxShadow:'0 2px 8px rgba(0,0,0,.04)'};
  const thS  = {background:'#F8FAFC',padding:'12px 16px',textAlign:'center',fontWeight:'700',color:'#475569',fontSize:'13px',borderBottom:'1.5px solid #E2E8F0',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:1};
  const tdS  = (x={})=>({padding:'12px 16px',borderBottom:'1px solid #F8FAFC',fontSize:'13px',textAlign:'center',verticalAlign:'middle',...x});

  const TABS = [
    {id:'attendance',icon:'📊',label:{ar:'تقرير الحضور',en:'Attendance'}},
    {id:'leaves',    icon:'📋',label:{ar:'تقرير الإجازات',en:'Leaves'}},
  ];

  return (
    <div style={{padding:'24px 28px',fontFamily:'Cairo,sans-serif',direction:dir,background:'#F1F5F9',minHeight:'100%'}}>
      <style>{`
        @media(max-width:1023px){ .rpt-aside{grid-template-columns:1fr!important} }
        @media(max-width:767px) { .rpt-stats{grid-template-columns:repeat(2,1fr)!important} }
        @media(max-width:479px) { .rpt-stats{grid-template-columns:1fr!important} }
      `}</style>

      {/* ── Hero header ── */}
      <div style={{background:'linear-gradient(135deg, #0D3B7A, #1565C0, #1E88E5)',borderRadius:'18px',padding:'22px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'14px',marginBottom:'20px',position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(13,59,122,.15)'}}>
        <div style={{position:'absolute',width:'190px',height:'190px',borderRadius:'50%',background:'rgba(255,255,255,.06)',top:'-80px',[dir==='rtl'?'left':'right']:'-50px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',width:'110px',height:'110px',borderRadius:'50%',background:'rgba(255,255,255,.05)',bottom:'-55px',[dir==='rtl'?'right':'left']:'28%',pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'center',gap:'14px',position:'relative'}}>
          <div style={{width:'50px',height:'50px',borderRadius:'14px',background:'rgba(255,255,255,.14)',border:'1.5px solid rgba(255,255,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>📊</div>
          <div>
            <h1 style={{margin:0,fontSize:'21px',fontWeight:'800',color:'white'}}>{lang==='ar'?'التقارير والإحصاء':'Reports & Statistics'}</h1>
            <p style={{margin:'4px 0 0',color:'rgba(255,255,255,.75)',fontSize:'13px'}}>
              {user.role==='head' && <><span style={{background:'rgba(255,255,255,.16)',color:'white',border:'1px solid rgba(255,255,255,.3)',padding:'2px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>🏢 {DEPARTMENTS.find(d=>d.id===user.departmentId)?.[lang==='en'?'nameEn':'name']}</span>{' '}</>}
              {new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>
        </div>
        <button onClick={doExport}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.26)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.14)'}
          style={{display:'flex',alignItems:'center',gap:'7px',padding:'10px 18px',background:'rgba(255,255,255,.14)',color:'white',border:'1px solid rgba(255,255,255,.3)',borderRadius:'11px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s',position:'relative'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {lang==='ar'?'تصدير Excel':'Export Excel'}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:'4px',background:'white',padding:'4px',borderRadius:'12px',border:'1px solid #E8EDF5',width:'fit-content',marginBottom:'20px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setViewMode('table');}}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 20px',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s',
              background:activeTab===tab.id?'#1565C0':'transparent',
              color:activeTab===tab.id?'white':'#64748B',
              boxShadow:activeTab===tab.id?'0 2px 8px rgba(21,101,192,.3)':'none'}}>
            {tab.icon} {tab.label[lang]}
          </button>
        ))}
      </div>

      {/* ══════════════════════════
          ATTENDANCE TAB
      ══════════════════════════ */}
      {activeTab==='attendance' && (<>

        {/* Summary stats */}
        <div className="rpt-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'18px'}}>
          {[
            {label:{ar:'إجمالي السجلات',en:'Total Records'}, v:total,   c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE', icon:'📊'},
            {label:{ar:'حاضر',           en:'Present'},       v:present, c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0', icon:'✅'},
            {label:{ar:'متأخر',          en:'Late'},          v:late,    c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A', icon:'⏰'},
            {label:{ar:'غائب',           en:'Absent'},        v:absent,  c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA', icon:'❌'},
          ].map(s=>(
            <div key={s.label.ar}
              style={{...card,padding:'18px 20px',display:'flex',alignItems:'center',gap:'14px',border:`1.5px solid ${s.bd}`,transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${s.bd}55`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}>
              <div style={{width:'48px',height:'48px',borderRadius:'14px',background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{s.icon}</div>
              <div>
                <div style={{fontSize:'13px',color:'#64748B',fontWeight:'600',marginBottom:'3px'}}>{s.label[lang]}</div>
                <div style={{fontSize:'30px',fontWeight:'900',color:s.c,lineHeight:1}}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="rpt-aside" style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'16px',marginBottom:'18px',alignItems:'start'}}>

          {/* Overall donut */}
          <div style={{...card,padding:'20px'}}>
            <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'16px',display:'flex',alignItems:'center',gap:'7px'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {lang==='ar'?'نسبة الحضور الكلية':'Overall Attendance'}
            </div>
            {(()=>{
              const R=54,C=2*Math.PI*R;
              const slices=[
                {v:present,label:{ar:'حاضر',en:'Present'},color:'#16A34A'},
                {v:late,   label:{ar:'متأخر',en:'Late'},   color:'#D97706'},
                {v:absent, label:{ar:'غائب',en:'Absent'},  color:'#DC2626'},
              ];
              let cum=0;
              return(
                <>
                  <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}>
                    <div style={{position:'relative',width:'120px',height:'120px'}}>
                      <svg width="120" height="120">
                        <circle cx="60" cy="60" r={R} fill="none" stroke="#F1F5F9" strokeWidth="11"/>
                        {total>0&&slices.map((sl,i)=>{
                          const p=sl.v/total; const dash=C*p;
                          const offset=C/4-C*cum; cum+=p;
                          return sl.v>0&&(
                            <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={sl.color} strokeWidth="11"
                              strokeDasharray={`${Math.max(dash-2,0)} ${C}`} strokeDashoffset={offset}
                              style={{transition:'all 1.2s ease'}}/>
                          );
                        })}
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:'22px',fontWeight:'900',color:barC(pct),lineHeight:1}}>{pct}%</span>
                        <span style={{fontSize:'10px',color:'#94A3B8',marginTop:'2px'}}>{lang==='ar'?'حضور':'attend.'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {slices.map(sl=>{
                      const p=total?Math.round(sl.v/total*100):0;
                      return(
                        <div key={sl.label.ar} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div style={{width:'10px',height:'10px',borderRadius:'3px',background:sl.color,flexShrink:0}}/>
                          <span style={{fontSize:'12px',fontWeight:'700',color:'#334155',minWidth:'44px'}}>{sl.label[lang]}</span>
                          <div style={{flex:1,background:'#F1F5F9',borderRadius:'999px',height:'6px',overflow:'hidden'}}>
                            <div style={{width:`${p}%`,background:sl.color,height:'100%',borderRadius:'999px',transition:'width .8s'}}/>
                          </div>
                          <span style={{fontSize:'11px',fontWeight:'800',color:sl.color,minWidth:'18px'}}>{sl.v}</span>
                          <span style={{fontSize:'10px',color:'#94A3B8',background:'#F1F5F9',padding:'1px 6px',borderRadius:'999px'}}>{p}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Dept donuts */}
          <div style={{...card,padding:'20px'}}>
            <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                {lang==='ar'?'حضور الأقسام':'Departments'}
              </div>
              <span style={{fontSize:'11px',color:'#94A3B8',fontWeight:'600'}}>{deptStats.length} {lang==='ar'?'قسم':'depts'}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'10px'}}>
              {deptStats.map(d=>{
                const R2=34,C2=2*Math.PI*R2;
                const col=COLLEGES.find(c=>c.id===d.collegeId);
                const slices2=[{v:d.present,color:'#16A34A'},{v:d.late,color:'#D97706'},{v:d.absent,color:'#DC2626'}];
                let cum2=0;
                const pc=barC(d.pct);
                return(
                  <div key={d.id}
                    onClick={()=>toggleDept(d.id)}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',padding:'14px 10px',borderRadius:'14px',
                      border:selectedDepts.includes(d.id)?`2px solid ${pc}`:`1px solid ${pc}22`,
                      background:selectedDepts.includes(d.id)?`${pc}10`:'white',
                      transition:'all .2s',cursor:'pointer',
                      transform:selectedDepts.includes(d.id)?'translateY(-2px)':'translateY(0)',
                      boxShadow:selectedDepts.includes(d.id)?`0 8px 18px ${pc}33`:'none'}}
                    onMouseEnter={e=>{if(!selectedDepts.includes(d.id)){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 18px ${pc}22`;}}}
                    onMouseLeave={e=>{if(!selectedDepts.includes(d.id)){e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}}>
                    <div style={{position:'relative',width:'76px',height:'76px'}}>
                      <svg width="76" height="76">
                        <circle cx="38" cy="38" r={R2} fill="none" stroke="#F1F5F9" strokeWidth="9"/>
                        {d.empCount>0&&slices2.map((sl,i)=>{
                          const p=sl.v/(d.empCount||1),dash=C2*p;
                          const offset=C2/4-C2*cum2; cum2+=p;
                          return sl.v>0&&(
                            <circle key={i} cx="38" cy="38" r={R2} fill="none" stroke={sl.color} strokeWidth="9"
                              strokeDasharray={`${Math.max(dash-2,0)} ${C2}`} strokeDashoffset={offset}
                              style={{transition:'all 1.2s ease'}}/>
                          );
                        })}
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:'15px',fontWeight:'900',color:pc,lineHeight:1}}>{d.pct}%</span>
                      </div>
                    </div>
                    <div style={{textAlign:'center',width:'100%'}}>
                      <div style={{fontSize:'12px',fontWeight:'800',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?d.nameEn:d.name}</div>
                      <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?col?.nameEn:col?.name}</div>
                    </div>
                    <div style={{width:'100%',background:'#F8FAFC',borderRadius:'9px',padding:'7px 9px',display:'flex',flexDirection:'column',gap:'3px'}}>
                      {[{v:d.present,c:'#16A34A',l:{ar:'حاضر',en:'P'}},{v:d.late,c:'#D97706',l:{ar:'متأخر',en:'L'}},{v:d.absent,c:'#DC2626',l:{ar:'غائب',en:'A'}}].map(x=>(
                        <div key={x.l.ar} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'11px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                            <div style={{width:'6px',height:'6px',borderRadius:'2px',background:x.c}}/>
                            <span style={{color:'#64748B',fontWeight:'600'}}>{x.l[lang]}</span>
                          </div>
                          <span style={{fontWeight:'800',color:x.c,background:`${x.c}15`,padding:'0 6px',borderRadius:'999px'}}>{x.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
          <div style={{display:'flex',gap:'3px',background:'white',padding:'3px',borderRadius:'10px',border:'1px solid #E8EDF5',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            {[{id:'table',icon:'📋',l:{ar:'جدول',en:'Table'}},{id:'cards',icon:'🃏',l:{ar:'بطاقات',en:'Cards'}}].map(v=>(
              <button key={v.id} onClick={()=>setViewMode(v.id)}
                style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s',
                  background:viewMode===v.id?'#1565C0':'transparent',color:viewMode===v.id?'white':'#64748B',
                  boxShadow:viewMode===v.id?'0 2px 8px rgba(21,101,192,.25)':'none'}}>
                {v.icon} {v.l[lang]}
              </button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {selectedDepts.length>0&&<button onClick={()=>setSelectedDepts([])} style={{fontSize:'11px',background:'#FEE2E2',color:'#991B1B',border:'1px solid #FECACA',padding:'3px 10px',borderRadius:'999px',cursor:'pointer',fontFamily:'Cairo',fontWeight:'700'}}>✕ {lang==='ar'?'إلغاء الفلتر':'Clear filter'}</button>}
            <span style={{fontSize:'13px',color:'#94A3B8',fontWeight:'600'}}>{(selectedDepts.length>0?attendance.filter(a=>{const e=EMPLOYEES.find(x=>x.id===a.employeeId);return e&&selectedDepts.includes(e.departmentId);}):attendance).length} {lang==='ar'?'سجل':'records'}</span>
          </div>
        </div>

        {/* Table view */}
        {viewMode==='table' && (
          <div style={{...card,overflow:'hidden'}}>
            <div style={{overflowX:'auto',maxHeight:'480px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>
                  <th style={thS}>#</th>
                  <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
                  <th style={thS}>{lang==='ar'?'القسم':'Dept'}</th>
                  <th style={thS}>{lang==='ar'?'الحضور':'Check In'}</th>
                  <th style={thS}>{lang==='ar'?'الانصراف':'Check Out'}</th>
                  <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
                </tr></thead>
                <tbody>
                  {(selectedDepts.length>0?attendance.filter(a=>{const e=EMPLOYEES.find(x=>x.id===a.employeeId);return e&&selectedDepts.includes(e.departmentId);}):attendance).length===0?(
                    <tr><td colSpan="6" style={{textAlign:'center',padding:'48px',color:'#94A3B8'}}>
                      <div style={{fontSize:'40px',marginBottom:'8px'}}>📊</div>
                      {lang==='ar'?'لا توجد بيانات':'No data'}
                    </td></tr>
                  ):(selectedDepts.length>0?attendance.filter(a=>{const e=EMPLOYEES.find(x=>x.id===a.employeeId);return e&&selectedDepts.includes(e.departmentId);}):attendance).map((a,idx)=>{
                    const emp=EMPLOYEES.find(e=>e.id===a.employeeId);
                    const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
                    const sm=ST[a.status];
                    return(
                      <tr key={a.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                        onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                        <td style={tdS({color:'#94A3B8',fontSize:'12px'})}>{idx+1}</td>
                        <td style={tdS({textAlign:lang==='ar'?'right':'left'})}>
                          <div style={{fontWeight:'700',color:'#0F172A',fontSize:'13px'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                          <div style={{fontSize:'11px',color:'#94A3B8',direction:'ltr'}}>{emp?.email}</div>
                        </td>
                        <td style={tdS({fontSize:'12px',color:'#1565C0',fontWeight:'600'})}>{lang==='en'?dept?.nameEn:dept?.name||'—'}</td>
                        <td style={tdS({direction:'ltr',color:'#166534',fontWeight:'700'})}>{a.checkIn||'—'}</td>
                        <td style={tdS({direction:'ltr',color:'#1565C0',fontWeight:'700'})}>{a.checkOut||'—'}</td>
                        <td style={tdS()}><Badge color={sm?.color} bg={sm?.bg} border={sm?.border}>{sm?.label[lang]}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cards view */}
        {viewMode==='cards' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'12px'}}>
{(selectedDepts.length>0?attendance.filter(a=>{const e=EMPLOYEES.find(x=>x.id===a.employeeId);return e&&selectedDepts.includes(e.departmentId);}):attendance).map(a=>{
              const emp=EMPLOYEES.find(e=>e.id===a.employeeId);
              const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
              const sm=ST[a.status];
              return(
                <div key={a.id}
                  style={{...card,padding:'16px',borderInlineStart:`3px solid ${sm?.color}`,transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${sm?.border}55`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'38px',height:'38px',borderRadius:'10px',background:sm?.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'900',color:sm?.color,border:`1px solid ${sm?.border}`,flexShrink:0}}>
                        {(lang==='en'?emp?.nameEn:emp?.name)?.charAt(0)}
                      </div>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:'800',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                        <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>{lang==='en'?dept?.nameEn:dept?.name}</div>
                      </div>
                    </div>
                    <Badge color={sm?.color} bg={sm?.bg} border={sm?.border}>{sm?.label[lang]}</Badge>
                  </div>
                  <div style={{display:'flex',gap:'8px',justifyContent:'space-between',marginTop:'8px',paddingTop:'8px',borderTop:'1px solid #F1F5F9'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'10px',color:'#94A3B8',fontWeight:'600',marginBottom:'2px'}}>{lang==='ar'?'حضور':'In'}</div>
                      <div style={{fontSize:'13px',fontWeight:'800',color:'#166534',direction:'ltr'}}>{a.checkIn||'—'}</div>
                    </div>
                    <div style={{width:'1px',background:'#F1F5F9'}}/>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'10px',color:'#94A3B8',fontWeight:'600',marginBottom:'2px'}}>{lang==='ar'?'انصراف':'Out'}</div>
                      <div style={{fontSize:'13px',fontWeight:'800',color:'#1565C0',direction:'ltr'}}>{a.checkOut||'—'}</div>
                    </div>
                    <div style={{width:'1px',background:'#F1F5F9'}}/>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'10px',color:'#94A3B8',fontWeight:'600',marginBottom:'2px'}}>{lang==='ar'?'التاريخ':'Date'}</div>
                      <div style={{fontSize:'12px',fontWeight:'700',color:'#64748B',direction:'ltr'}}>{a.date}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>)}

      {/* ══════════════════════════
          LEAVES TAB
      ══════════════════════════ */}
      {activeTab==='leaves' && (<>

        {/* Leave stats grid */}
        <div style={{display:'flex',flexWrap:'wrap',gap:'12px',marginBottom:'18px',justifyContent:'center',alignItems:'stretch'}}>
          {leaveStats.map(lt=>{
            const isSel=selectedLeaveTypes.includes(lt.id);
            return(
            <div key={lt.id}
              onClick={()=>toggleLeaveType(lt.id)}
              style={{...card,padding:'16px',transition:'all .2s',opacity:lt.total===0?.5:1,textAlign:'center',cursor:'pointer',width:'170px',flexShrink:0,
                border:isSel?`2px solid ${lt.color}`:'1px solid #E8EDF5',
                background:isSel?lt.bg:'white',
                transform:isSel?'translateY(-2px)':'translateY(0)',
                boxShadow:isSel?`0 8px 20px ${lt.border}66`:'0 2px 8px rgba(0,0,0,.04)'}}
              onMouseEnter={e=>{if(!isSel&&lt.total>0){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${lt.border}44`;}}}
              onMouseLeave={e=>{if(!isSel){e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}}> 
              <div style={{display:'flex',justifyContent:'center',alignItems:'flex-start',marginBottom:'10px'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'12px',background:lt.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',border:`1px solid ${lt.border}`,flexShrink:0}}>{lt.icon}</div>
              </div>
              <div style={{fontSize:'28px',fontWeight:'900',color:lt.total>0?lt.color:'#CBD5E1',lineHeight:1,marginBottom:'6px'}}>{lt.total}</div>
              <div style={{fontSize:'13px',fontWeight:'700',color:lt.total>0?'#0F172A':'#94A3B8',marginBottom:'8px'}}>{lt.label[lang]}</div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap',justifyContent:'center'}}>
                {lt.approved>0&&<span style={{fontSize:'10px',background:'#DCFCE7',color:'#166534',padding:'2px 7px',borderRadius:'999px',fontWeight:'700'}}>{lang==='ar'?'موافق':'Appr'}: {lt.approved}</span>}
                {lt.pending>0 &&<span style={{fontSize:'10px',background:'#FEF3C7',color:'#B45309',padding:'2px 7px',borderRadius:'999px',fontWeight:'700'}}>{lang==='ar'?'معلق':'Pend'}: {lt.pending}</span>}
                {lt.rejected>0&&<span style={{fontSize:'10px',background:'#FEE2E2',color:'#991B1B',padding:'2px 7px',borderRadius:'999px',fontWeight:'700'}}>{lang==='ar'?'مرفوض':'Rej'}: {lt.rejected}</span>}
                {lt.total===0&&<span style={{fontSize:'10px',color:'#CBD5E1',fontWeight:'600'}}>{lang==='ar'?'لا يوجد':'None'}</span>}
              </div>
              {isSel&&<div style={{marginTop:'6px',fontSize:'10px',color:lt.color,fontWeight:'700'}}>✓ {lang==='ar'?'محدد':'Selected'}</div>}
            </div>
          );})} 
        </div>

        {/* Leave table */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
          <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>📋 {lang==='ar'?'سجل الطلبات':'Requests Log'}</span>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {selectedLeaveTypes.length>0&&<button onClick={()=>setSelectedLeaveTypes([])} style={{fontSize:'11px',background:'#FEE2E2',color:'#991B1B',border:'1px solid #FECACA',padding:'3px 10px',borderRadius:'999px',cursor:'pointer',fontFamily:'Cairo',fontWeight:'700'}}>✕ {lang==='ar'?'إلغاء الفلتر':'Clear filter'}</button>}
            <span style={{fontSize:'12px',color:'#94A3B8',fontWeight:'600',background:'white',border:'1px solid #E8EDF5',padding:'4px 12px',borderRadius:'999px'}}>{(selectedLeaveTypes.length>0?leaves.filter(l=>selectedLeaveTypes.includes(l.type)):leaves).length} {lang==='ar'?'طلب':'requests'}</span>
          </div>
        </div>

        <div style={{...card,overflow:'hidden'}}>
          <div style={{overflowX:'auto',maxHeight:'480px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={thS}>#</th>
                <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الاسم':'Name'}</th>
                <th style={thS}>{lang==='ar'?'النوع':'Type'}</th>
                <th style={thS}>{lang==='ar'?'من':'From'}</th>
                <th style={thS}>{lang==='ar'?'إلى':'To'}</th>
                <th style={thS}>{lang==='ar'?'أيام':'Days'}</th>
                <th style={thS}>{lang==='ar'?'السبب':'Reason'}</th>
                <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
              </tr></thead>
              <tbody>
                {(selectedLeaveTypes.length>0?leaves.filter(l=>selectedLeaveTypes.includes(l.type)):leaves).length===0?(
                  <tr><td colSpan="8" style={{textAlign:'center',padding:'48px',color:'#94A3B8'}}>
                    <div style={{fontSize:'40px',marginBottom:'8px'}}>📋</div>
                    {lang==='ar'?'لا توجد طلبات':'No requests'}
                  </td></tr>
                ):(selectedLeaveTypes.length>0?leaves.filter(l=>selectedLeaveTypes.includes(l.type)):leaves).map((l,idx)=>{
                  const emp=EMPLOYEES.find(e=>e.id===l.employeeId);
                  const lt=LEAVE_TYPES.find(x=>x.id===l.type);
                  const sm=ST[l.status];
                  return(
                    <tr key={l.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                      onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                      <td style={tdS({color:'#94A3B8',fontSize:'12px'})}>{idx+1}</td>
                      <td style={tdS({textAlign:lang==='ar'?'right':'left'})}>
                        <div style={{fontWeight:'700',color:'#0F172A',fontSize:'13px'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                        <div style={{fontSize:'11px',color:'#94A3B8'}}>{emp?.email}</div>
                      </td>
                      <td style={tdS()}><Badge color={lt?.color} bg={lt?.bg} border={lt?.border}>{lt?.icon} {lt?.label[lang]}</Badge></td>
                      <td style={tdS({direction:'ltr',color:'#64748B',fontSize:'12px'})}>{l.from}</td>
                      <td style={tdS({direction:'ltr',color:'#64748B',fontSize:'12px'})}>{l.to}</td>
                      <td style={tdS({fontWeight:'900',color:'#1565C0',fontSize:'16px'})}>{l.days}</td>
                      <td style={tdS({color:'#475569',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'12px'})}>{l.reason}</td>
                      <td style={tdS()}><Badge color={sm?.color} bg={sm?.bg} border={sm?.border}>{sm?.label[lang]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

    </div>
  );
}

export default Reports;