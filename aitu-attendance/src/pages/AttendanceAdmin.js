import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService, employeesService, structureService } from '../services';

const ADMIN_DEPTS = [
  { id:'HR',     name:'الموارد البشرية',    nameEn:'Human Resources'   },
  { id:'FIN',    name:'الشؤون المالية',      nameEn:'Finance'           },
  { id:'IT',     name:'تقنية المعلومات',    nameEn:'IT Department'     },
  { id:'SEC',    name:'الشؤون الأكاديمية', nameEn:'Academic Affairs'  },
  { id:'ADM',    name:'الإدارة العامة',     nameEn:'General Admin'     },
  { id:'STU',    name:'شؤون الطلاب',        nameEn:'Student Affairs'   },
];

/* ── Shared Modal ── */
function Modal({ open, onClose, lang, title, subtitle, footer, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(3px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'1000px',maxHeight:'88vh',overflow:'hidden',display:'flex',flexDirection:'column',direction:lang==='ar'?'rtl':'ltr',fontFamily:'Cairo, sans-serif',boxShadow:'0 32px 80px rgba(0,0,0,.22)'}}>
        <div style={{padding:'18px 24px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#0F172A'}}>{title}</div>
            {subtitle&&<div style={{fontSize:'12px',color:'#94A3B8',marginTop:'2px'}}>{subtitle}</div>}
          </div>
          <button onClick={onClose}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.9)';e.currentTarget.style.color='white';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#475569';}}
            style={{background:'#F1F5F9',border:'none',borderRadius:'8px',padding:'8px 14px',cursor:'pointer',fontSize:'13px',color:'#475569',fontFamily:'Cairo',fontWeight:'700',transition:'all .18s'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',overflowX:'auto',flex:1}}>{children}</div>
        {footer&&<div style={{padding:'14px 24px',borderTop:'1px solid #F1F5F9',background:'#F8FAFC',flexShrink:0}}>{footer}</div>}
      </div>
    </div>
  );
}

function AttendanceAdmin({ lang, readOnly=false }) {
  const [attendance,   setAttendance]   = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterDept,   setFilterDept]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search,       setSearch]       = useState('');
  const [filterDate,   setFilterDate]   = useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [deptOpen,     setDeptOpen]     = useState(false);
  const [statusOpen,   setStatusOpen]   = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [attData, empData, deptData] = await Promise.all([
        attendanceService.getAttendanceLogs().catch(() => []),
        employeesService.getEmployees().catch(() => []),
        structureService.getDepartments().catch(() => [])
      ]);
      setAttendance(Array.isArray(attData) ? attData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
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
  const statusRef = React.useRef(null);
  React.useEffect(()=>{
    if(!statusOpen) return;
    function h(e){if(statusRef.current&&!statusRef.current.contains(e.target))setStatusOpen(false);}
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[statusOpen]);
  const [expandedGroup,setExpandedGroup] = useState(null);
  const deptRef = React.useRef(null);
  React.useEffect(()=>{
    if(!deptOpen) return;
    function h(e){if(deptRef.current&&!deptRef.current.contains(e.target))setDeptOpen(false);}
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[deptOpen]);
  const [viewMode,     setViewMode]     = useState('table');
  const [popupSearch,  setPopupSearch]  = useState('');
  const [popupFilter,  setPopupFilter]  = useState('all');
  const [popupDept,    setPopupDept]    = useState('all');

  const statusMeta = {
    present:{label:lang==='ar'?'حاضر' :'Present',color:'#166534',bg:'#DCFCE7',border:'#BBF7D0'},
    late:   {label:lang==='ar'?'متأخر':'Late',   color:'#B45309',bg:'#FEF3C7',border:'#FDE68A'},
    left:   {label:lang==='ar'?'انصرف':'Left',   color:'#1565C0',bg:'#DBEAFE',border:'#BFDBFE'},
    absent: {label:lang==='ar'?'غائب' :'Absent', color:'#991B1B',bg:'#FEE2E2',border:'#FECACA'},
  };

  const getAttStatus = (st) => {
    if (st === 0 || st === '0' || String(st).toLowerCase() === 'present') return 'present';
    if (st === 1 || st === '1' || String(st).toLowerCase() === 'late') return 'late';
    if (st === 2 || st === '2' || String(st).toLowerCase() === 'left') return 'left';
    if (st === 3 || st === '3' || String(st).toLowerCase() === 'absent') return 'absent';
    return String(st || '').toLowerCase();
  };

  const EMPLOYEES = employees;
  const DEPARTMENTS = departments;

  const total      = attendance.length;
  const present    = attendance.filter(a => getAttStatus(a.status || a.Status) === 'present' || getAttStatus(a.status || a.Status) === 'left').length;
  const absent     = attendance.filter(a => getAttStatus(a.status || a.Status) === 'absent').length;
  const late       = attendance.filter(a => getAttStatus(a.status || a.Status) === 'late').length;
  const leftCount  = attendance.filter(a => getAttStatus(a.status || a.Status) === 'left').length;
  const pct        = total ? Math.round(present / total * 100) : 0;

  const filtered = attendance.filter(att => {
    const emp  = employees.find(e => e.id === att.employeeId || e.name === att.employeeName);
    const name = (lang === 'en' ? (emp?.nameEn || att.employeeName) : (emp?.name || att.employeeName)) || '';
    const st   = getAttStatus(att.status || att.Status);
    const date = String(att.date || att.Date || '').slice(0, 10);
    return (!search || name.toLowerCase().includes(search.toLowerCase())) &&
           (filterDept === 'all' || emp?.departmentId === filterDept || att.department === filterDept) &&
           (filterStatus === 'all' || st === filterStatus) &&
           (!filterDate || date === filterDate);
  });

  const popupFiltered = attendance.filter(att=>{
    const emp  = employees.find(e=>e.id===att.employeeId || e.name===att.employeeName);
    const name = (lang==='en'?(emp?.nameEn||att.employeeName):(emp?.name||att.employeeName))||'';
    return (!popupSearch||name.toLowerCase().includes(popupSearch.toLowerCase()))&&
           (popupFilter==='all'||att.status===popupFilter)&&
           (popupDept==='all'||emp?.departmentId===popupDept||att.department===popupDept);
  });

  function exportExcel(data) {
    const rows=[
      [lang==='ar'?'الاسم':'Name',lang==='ar'?'القسم':'Dept',lang==='ar'?'التاريخ':'Date',lang==='ar'?'وقت الحضور':'Check In',lang==='ar'?'وقت الانصراف':'Check Out',lang==='ar'?'الحالة':'Status'],
      ...data.map(att=>{
        const emp=EMPLOYEES.find(e=>e.id===att.employeeId);
        const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
        return[lang==='en'?emp?.nameEn:emp?.name,lang==='en'?dept?.nameEn:dept?.name,att.date,att.checkIn||'—',att.checkOut||'—',statusMeta[att.status]?.label];
      })
    ];
    const XLSX=window.XLSX;
    if(!XLSX){
      // fallback CSV
      const csv='\uFEFF'+rows.map(r=>r.join(',')).join('\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      a.download=`attendance_${new Date().toISOString().split('T')[0]}.csv`;a.click();return;
    }
    const ws=XLSX.utils.aoa_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,lang==='ar'?'الحضور':'Attendance');
    XLSX.writeFile(wb,`attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const dir=lang==='ar'?'rtl':'ltr';
  const thS={background:'#F8FAFC',padding:'13px 18px',textAlign:'center',fontWeight:'700',color:'#475569',fontSize:'14px',borderBottom:'1.5px solid #E2E8F0',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:1};
  const tdS=(x={})=>({padding:'13px 18px',borderBottom:'1px solid #F8FAFC',color:'#334155',fontSize:'14px',textAlign:'center',...x});
  const barColor=p=>p>=80?'#16A34A':p>=60?'#D97706':'#DC2626';

  const iStyle={padding:'9px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',fontFamily:'Cairo',outline:'none',background:'white',color:'#0F172A'};

  return (
    <div className="page-pad" style={{fontFamily:'Cairo, sans-serif',direction:dir}}>

      {/* ══ HERO ══ */}
      <div style={{borderRadius:'16px',marginBottom:'18px',overflow:'hidden',boxShadow:'0 4px 16px rgba(13,59,122,.15)'}}>
        <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginBottom:'4px'}}>{lang==='ar'?'لوحة التحكم — الأدمن':'Admin Dashboard'}</div>
            <h1 style={{margin:0,fontSize:'22px',fontWeight:'800',color:'white'}}>{lang==='ar'?'سجل الحضور والانصراف':'Attendance Log'}</h1>
            <p style={{margin:'4px 0 0',color:'rgba(255,255,255,.6)',fontSize:'12px'}}>
              {new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={()=>exportExcel(filtered)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.25)',borderRadius:'9px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {lang==='ar'?'تصدير Excel':'Export Excel'}
            </button>
            <button onClick={()=>{setPopupFilter('all');setPopupSearch('');setPopupDept('all');setShowModal(true);}}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'white',color:'#1565C0',border:'none',borderRadius:'9px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s',boxShadow:'0 2px 8px rgba(0,0,0,.1)'}}
              onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {lang==='ar'?'عرض الكل':'View All'}
            </button>
          </div>
        </div>
        {/* Stats strip */}
        <div className="rg-5 stat-stripe" style={{background:'white'}}>
          {[
            {v:total,     l:{ar:'إجمالي السجلات',en:'Total'},   c:'#1565C0',bg:'#EFF6FF', filter:'all'},
            {v:present,   l:{ar:'حاضر',          en:'Present'}, c:'#166534',bg:'#F0FDF4', filter:'present'},
            {v:late,      l:{ar:'متأخر',         en:'Late'},    c:'#B45309',bg:'#FFFBEB', filter:'late'},
            {v:absent,    l:{ar:'غائب',          en:'Absent'},  c:'#991B1B',bg:'#FEF2F2', filter:'absent'},
            {v:leftCount, l:{ar:'انصرف',         en:'Left'},    c:'#1565C0',bg:'#EFF6FF', filter:'left'},
          ].map((s,i)=>(
            <div key={i}
              onClick={()=>setFilterStatus(filterStatus===s.filter?'all':s.filter)}
              style={{textAlign:'center',padding:'14px 8px',borderInlineEnd:i<4?'1px solid #F1F5F9':'none',cursor:'pointer',transition:'background .15s',
                background:filterStatus===s.filter?s.bg:'white',
                outline:filterStatus===s.filter?('2px solid '+s.c):'none',
                outlineOffset:'-2px'}}
              onMouseEnter={e=>{if(filterStatus!==s.filter)e.currentTarget.style.background=s.bg;}}
              onMouseLeave={e=>{if(filterStatus!==s.filter)e.currentTarget.style.background='white';}}>
              <div style={{fontSize:'26px',fontWeight:'900',color:s.c,lineHeight:1,marginBottom:'4px'}}>{s.v}</div>
              <div style={{fontSize:'12px',color:filterStatus===s.filter?s.c:'#94A3B8',fontWeight:'700'}}>{s.l[lang]}</div>
              {filterStatus===s.filter&&<div style={{width:'20px',height:'2px',background:s.c,borderRadius:'999px',margin:'4px auto 0'}}/>}
            </div>
          ))}
        </div>
      </div>


      {/* ── Filters ── */}
      <div style={{background:'white',borderRadius:'14px',border:'1px solid #E8EDF5',padding:'14px 16px',marginBottom:'16px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:'180px'}}>
          <span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:'12px',color:'#94A3B8',fontSize:'14px',pointerEvents:'none'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={lang==='ar'?'بحث باسم الموظف...':'Search by name...'}
            style={{...iStyle,width:'100%',padding:lang==='ar'?'9px 36px 9px 12px':'9px 12px 9px 36px',boxSizing:'border-box'}} />
        </div>
        <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={iStyle} />
        {/* Custom Dept Dropdown */}
        <div ref={deptRef} style={{position:'relative'}}>
          <button onClick={()=>setDeptOpen(p=>!p)} style={{
            display:'flex',alignItems:'center',gap:'8px',
            padding:'9px 14px',
            border:`1.5px solid ${deptOpen?'#1565C0':'#E2E8F0'}`,
            borderRadius:'10px',background:'white',cursor:'pointer',
            fontSize:'13px',fontFamily:'Cairo',color:'#0F172A',fontWeight:'600',
            boxShadow:deptOpen?'0 0 0 3px rgba(21,101,192,.1)':'none',
            transition:'all .15s',whiteSpace:'nowrap',minWidth:'140px',
            justifyContent:'space-between',
          }}>
            <span>🏢 {(()=>{
              if(filterDept==='all') return lang==='ar'?'كل الأقسام':'All Depts';
              const d=DEPARTMENTS.find(x=>x.id===filterDept);
              return d?(lang==='en'?d.nameEn:d.name):(lang==='ar'?'كل الأقسام':'All Depts');
            })()}</span>
            <span style={{fontSize:'9px',color:'#94A3B8',transition:'transform .2s',display:'inline-block',transform:deptOpen?'rotate(180deg)':'rotate(0)'}}>▼</span>
          </button>

          {deptOpen&&(
            <div style={{
              position:'absolute',top:'calc(100% + 6px)',
              [lang==='ar'?'right':'left']:0,
              background:'white',borderRadius:'14px',
              border:'1.5px solid #E2E8F0',
              boxShadow:'0 12px 36px rgba(0,0,0,.13)',
              zIndex:300,minWidth:'210px',overflow:'hidden',
              direction:dir,
            }}>
              {/* All */}
              <div onClick={()=>{setFilterDept('all');setExpandedGroup(null);setDeptOpen(false);}} style={{
                padding:'11px 16px',cursor:'pointer',fontSize:'13px',fontWeight:'700',fontFamily:'Cairo',
                display:'flex',alignItems:'center',gap:'8px',
                background:filterDept==='all'?'#EFF6FF':'white',
                color:filterDept==='all'?'#1565C0':'#0F172A',
                borderBottom:'1px solid #F1F5F9',
                transition:'background .1s',
              }}
                onMouseEnter={e=>{if(filterDept!=='all')e.currentTarget.style.background='#F8FAFC';}}
                onMouseLeave={e=>{if(filterDept!=='all')e.currentTarget.style.background='white';}}
              >
                <span>🏢</span>
                <span style={{flex:1}}>{lang==='ar'?'كل الأقسام':'All Departments'}</span>
                {filterDept==='all'&&<span style={{color:'#1565C0',fontSize:'12px'}}>✓</span>}
              </div>

              {/* Accordion Groups */}
              {[
                {id:'ac', icon:'🎓', label:{ar:'أقسام أكاديمية',en:'Academic Depts'}, color:'#1565C0', bg:'#EFF6FF', activeBg:'#DBEAFE', items:DEPARTMENTS.map(d=>({id:d.id,name:lang==='en'?d.nameEn:d.name}))},
                {id:'ad', icon:'🗂️', label:{ar:'إدارات',          en:'Administration'}, color:'#B45309', bg:'#FFFBEB', activeBg:'#FEF3C7', items:ADMIN_DEPTS.map(d=>({id:d.id,name:lang==='en'?d.nameEn:d.name}))},
              ].map((grp,gi)=>{
                const isExpanded = expandedGroup===grp.id;
                const hasActive  = grp.items.some(i=>i.id===filterDept);
                return(
                  <div key={grp.id}>
                    <div onClick={()=>setExpandedGroup(isExpanded?null:grp.id)} style={{
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
                      <span style={{fontSize:'10px',color:hasActive||isExpanded?grp.color:'#94A3B8',transition:'transform .2s',display:'inline-block',transform:isExpanded?'rotate(180deg)':'rotate(0)'}}>▼</span>
                    </div>
                    {isExpanded&&(
                      <div style={{background:'#FAFBFC', borderBottom:'1px solid #F1F5F9'}}>
                        {grp.items.map((item,ii)=>(
                          <div key={item.id} onClick={()=>{setFilterDept(item.id);setDeptOpen(false);setExpandedGroup(null);}} style={{
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
            </div>
          )}
        </div>
        {/* Status Dropdown */}
        <div ref={statusRef} style={{position:'relative'}}>
          <button onClick={()=>setStatusOpen(p=>!p)} style={{
            display:'flex',alignItems:'center',gap:'8px',
            padding:'9px 14px',
            border:`1.5px solid ${statusOpen?'#1565C0':'#E2E8F0'}`,
            borderRadius:'10px',background:'white',cursor:'pointer',
            fontSize:'13px',fontFamily:'Cairo',color:'#0F172A',fontWeight:'600',
            boxShadow:statusOpen?'0 0 0 3px rgba(21,101,192,.1)':'none',
            transition:'all .15s',whiteSpace:'nowrap',minWidth:'130px',
            justifyContent:'space-between',
          }}>
            <span>
              {filterStatus==='all'
                ?(lang==='ar'?'كل الحالات':'All Statuses')
                :statusMeta[filterStatus]?.label
              }
            </span>
            <span style={{fontSize:'9px',color:'#94A3B8',transition:'transform .2s',display:'inline-block',transform:statusOpen?'rotate(180deg)':'rotate(0)'}}>▼</span>
          </button>

          {statusOpen&&(
            <div style={{
              position:'absolute',top:'calc(100% + 6px)',
              [lang==='ar'?'right':'left']:0,
              background:'white',borderRadius:'14px',
              border:'1.5px solid #E2E8F0',
              boxShadow:'0 12px 36px rgba(0,0,0,.13)',
              zIndex:300,minWidth:'160px',overflow:'hidden',
              direction:dir,
            }}>
              {/* All option */}
              <div onClick={()=>{setFilterStatus('all');setStatusOpen(false);}} style={{
                padding:'11px 16px',cursor:'pointer',fontSize:'13px',
                fontWeight:'700',fontFamily:'Cairo',
                display:'flex',alignItems:'center',gap:'8px',
                background:filterStatus==='all'?'#EFF6FF':'white',
                color:filterStatus==='all'?'#1565C0':'#0F172A',
                borderBottom:'1px solid #F1F5F9',
                transition:'background .1s',
              }}
                onMouseEnter={e=>{if(filterStatus!=='all')e.currentTarget.style.background='#F8FAFC';}}
                onMouseLeave={e=>{if(filterStatus!=='all')e.currentTarget.style.background='white';}}
              >
                <span style={{flex:1}}>{lang==='ar'?'كل الحالات':'All Statuses'}</span>
                {filterStatus==='all'&&<span style={{color:'#1565C0',fontSize:'12px'}}>✓</span>}
              </div>

              {/* Status items */}
              {Object.entries(statusMeta).map(([key,val],ii)=>(
                <div key={key} onClick={()=>{setFilterStatus(key);setStatusOpen(false);}} style={{
                  padding:'10px 16px',cursor:'pointer',fontSize:'13px',fontFamily:'Cairo',
                  display:'flex',alignItems:'center',gap:'10px',
                  background:filterStatus===key?val.bg:'white',
                  borderBottom:ii<Object.keys(statusMeta).length-1?'1px solid #F8FAFC':'none',
                  transition:'background .1s',
                }}
                  onMouseEnter={e=>{if(filterStatus!==key)e.currentTarget.style.background='#F8FAFC';}}
                  onMouseLeave={e=>{if(filterStatus!==key)e.currentTarget.style.background='white';}}
                >
                  <span style={{
                    background:val.bg,color:val.color,
                    border:`1px solid ${val.border}`,
                    padding:'3px 10px',borderRadius:'999px',
                    fontSize:'11px',fontWeight:'700',whiteSpace:'nowrap',
                  }}>{val.label}</span>
                  {filterStatus===key&&<span style={{color:val.color,fontSize:'12px',marginRight:'auto',marginLeft:'auto'}}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {(search||filterDept!=='all'||filterStatus!=='all'||filterDate)&&(
          <button onClick={()=>{setSearch('');setFilterDept('all');setFilterStatus('all');setFilterDate('');}}
            style={{...iStyle,background:'#F8FAFC',color:'#475569',cursor:'pointer',fontFamily:'Cairo',fontWeight:'700'}}>
            ↺ {lang==='ar'?'إعادة ضبط':'Reset'}
          </button>
        )}
        <div style={{display:'flex',gap:'4px',background:'white',padding:'3px',borderRadius:'10px',border:'1px solid #E8EDF5',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
          {[{id:'table',icon:'📋',l:{ar:'جدول',en:'Table'}},{id:'cards',icon:'🃏',l:{ar:'بطاقات',en:'Cards'}}].map(v=>(
            <button key={v.id} onClick={()=>setViewMode(v.id)}
              style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s',
                background:viewMode===v.id?'#1565C0':'transparent',color:viewMode===v.id?'white':'#64748B',
                boxShadow:viewMode===v.id?'0 2px 8px rgba(21,101,192,.25)':'none'}}>
              {v.icon} {v.l[lang]}
            </button>
          ))}
        </div>
        <span style={{fontSize:'12px',color:'#94A3B8',fontWeight:'600',whiteSpace:'nowrap'}}>{filtered.length} {lang==='ar'?'سجل':'records'}</span>
      </div>

      {/* ── Table view ── */}
      {viewMode==='table'&&(
      <div style={{background:'white',borderRadius:'14px',border:'1px solid #E8EDF5',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div className="tbl-wrap">
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead><tr>
              <th style={thS}>#</th>
              <th style={thS}>{lang==='ar'?'الاسم':'Name'}</th>
              <th style={thS}>{lang==='ar'?'القسم':'Department'}</th>
              <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
              <th style={thS}>{lang==='ar'?'الحضور / الانصراف':'In / Out'}</th>
              <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
            </tr></thead>
            <tbody>
              {filtered.slice(0,8).map((att,idx)=>{
                const emp  = EMPLOYEES.find(e=>e.id===att.employeeId);
                const dept = DEPARTMENTS.find(d=>d.id===emp?.departmentId);
                const sm   = statusMeta[att.status];
                return (
                  <tr key={att.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={tdS({color:'#94A3B8',width:'40px'})}>{idx+1}</td>
                    <td style={tdS({fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                    <td style={tdS({color:'#64748B'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                    <td style={tdS({direction:'ltr',color:'#94A3B8'})}>{att.date}</td>
                    <td style={tdS()}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',direction:'ltr'}}>
                        <span style={{fontSize:'13px',fontWeight:'700',color:'#166534'}}>{att.checkIn||'-'}</span>
                        <div style={{width:'16px',height:'1px',background:'#E2E8F0'}}/>
                        <span style={{fontSize:'13px',fontWeight:'700',color:'#1565C0'}}>{att.checkOut||'-'}</span>
                      </div>
                    </td>
                    <td style={tdS()}>
                      <span style={{background:sm?.bg,color:sm?.color,border:`1px solid ${sm?.border}`,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{sm?.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length>8&&(
          <div onClick={()=>{setPopupFilter('all');setPopupSearch('');setShowModal(true);}}
            style={{padding:'12px 16px',textAlign:'center',fontSize:'12px',color:'#1565C0',borderTop:'1px solid #F1F5F9',cursor:'pointer',fontWeight:'700',background:'#F8FBFF'}}
            onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
            onMouseLeave={e=>e.currentTarget.style.background='#F8FBFF'}>
            + {filtered.length-8} {lang==='ar'?'سجل آخر — عرض الكل ↗':'more records — View All ↗'}
          </div>
        )}
        {filtered.length===0&&(
          <div style={{textAlign:'center',padding:'48px',color:'#94A3B8'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>🔍</div>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',marginBottom:'4px'}}>{lang==='ar'?'لا توجد نتائج':'No results found'}</div>
            <div style={{fontSize:'12px'}}>{lang==='ar'?'جرب تغيير الفلتر':'Try changing the filter'}</div>
          </div>
        )}
      </div>
      )}

      {/* ── Cards view ── */}
      {viewMode==='cards'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'12px',marginBottom:'16px'}}>
          {filtered.slice(0,12).map(att=>{
            const emp  = EMPLOYEES.find(e=>e.id===att.employeeId);
            const dept = DEPARTMENTS.find(d=>d.id===emp?.departmentId);
            const sm   = statusMeta[att.status];
            return(
              <div key={att.id}
                style={{background:'white',borderRadius:'14px',border:'1px solid #E8EDF5',padding:'16px',borderInlineStart:'3px solid '+(sm?.border||'#E2E8F0'),boxShadow:'0 2px 8px rgba(0,0,0,.04)',transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,.08)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'10px',background:sm?.bg||'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:'900',color:sm?.color||'#94A3B8',border:'1.5px solid '+(sm?.border||'#E2E8F0'),flexShrink:0}}>
                      {(lang==='en'?emp?.nameEn:emp?.name)?.charAt(0)||'?'}
                    </div>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                      <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>{lang==='en'?dept?.nameEn:dept?.name}</div>
                    </div>
                  </div>
                  <span style={{background:sm?.bg,color:sm?.color,border:'1px solid '+(sm?.border||'#E2E8F0'),padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',whiteSpace:'nowrap'}}>{sm?.label}</span>
                </div>
                <div style={{display:'flex',gap:'8px',paddingTop:'10px',borderTop:'1px solid #F1F5F9'}}>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:'10px',color:'#94A3B8',marginBottom:'2px'}}>{lang==='ar'?'التاريخ':'Date'}</div>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#475569',direction:'ltr'}}>{att.date}</div>
                  </div>
                  <div style={{width:'1px',background:'#F1F5F9'}}/>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:'10px',color:'#94A3B8',marginBottom:'2px'}}>{lang==='ar'?'حضور':'In'}</div>
                    <div style={{fontSize:'13px',fontWeight:'800',color:'#166534',direction:'ltr'}}>{att.checkIn||'-'}</div>
                  </div>
                  <div style={{width:'1px',background:'#F1F5F9'}}/>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:'10px',color:'#94A3B8',marginBottom:'2px'}}>{lang==='ar'?'انصراف':'Out'}</div>
                    <div style={{fontSize:'13px',fontWeight:'800',color:'#1565C0',direction:'ltr'}}>{att.checkOut||'-'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL ══ */}
      <Modal open={showModal} onClose={()=>setShowModal(false)} lang={lang}
        title={lang==='ar'?'سجل الحضور الكامل':'Full Attendance Log'}
        subtitle={new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        footer={
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <span style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>{lang==='ar'?`${popupFiltered.length} سجل`:`${popupFiltered.length} records`}</span>
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              {[{c:'#166534',bg:'#DCFCE7',v:present,l:lang==='ar'?'حاضر':'Present'},{c:'#991B1B',bg:'#FEE2E2',v:absent,l:lang==='ar'?'غائب':'Absent'},{c:'#B45309',bg:'#FEF3C7',v:late,l:lang==='ar'?'متأخر':'Late'}].map(s=>(
                <span key={s.l} style={{background:s.bg,color:s.c,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{s.v} {s.l}</span>
              ))}
              <button onClick={()=>exportExcel(popupFiltered)}
                onMouseEnter={e=>{e.currentTarget.style.background='#14532D';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#166534';}}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#166534',color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'background .15s'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Excel
              </button>
            </div>
          </div>
        }
      >
        <div style={{padding:'12px 20px',borderBottom:'1px solid #F1F5F9',background:'#FAFAFA',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center',position:'sticky',top:0,zIndex:10}}>
          <div style={{position:'relative',flex:1,minWidth:'180px'}}>
            <span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:'12px',color:'#94A3B8',fontSize:'14px',pointerEvents:'none'}}>🔍</span>
            <input value={popupSearch} onChange={e=>setPopupSearch(e.target.value)} placeholder={lang==='ar'?'بحث...':'Search...'}
              style={{width:'100%',padding:lang==='ar'?'9px 36px 9px 12px':'9px 12px 9px 36px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',background:'white'}} />
          </div>
          <select value={popupDept} onChange={e=>setPopupDept(e.target.value)} style={{padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',fontFamily:'Cairo',outline:'none',background:'white'}}>
            <option value="all">{lang==='ar'?'كل الأقسام':'All Depts'}</option>
            {DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{lang==='en'?d.nameEn:d.name}</option>)}
          </select>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {[{id:'all',l:lang==='ar'?'الكل':'All',n:total},{id:'present',l:lang==='ar'?'حاضر':'Present',n:present},{id:'late',l:lang==='ar'?'متأخر':'Late',n:late},{id:'left',l:lang==='ar'?'انصرف':'Left',n:leftCount},{id:'absent',l:lang==='ar'?'غائب':'Absent',n:absent}].map(f=>(
              <button key={f.id} onClick={()=>setPopupFilter(f.id)} style={{padding:'6px 14px',border:'none',borderRadius:'999px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s',background:popupFilter===f.id?'#1565C0':'white',color:popupFilter===f.id?'white':'#475569',boxShadow:popupFilter===f.id?'0 2px 8px rgba(21,101,192,.3)':'0 1px 3px rgba(0,0,0,.08)'}}>
                {f.l} ({f.n})
              </button>
            ))}
          </div>
        </div>
        {popupFiltered.length===0?(
          <div style={{textAlign:'center',color:'#94A3B8',padding:'40px',fontSize:'13px'}}>🔍 {lang==='ar'?'لا توجد نتائج':'No results'}</div>
        ):(
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:'700px'}}>
            <thead><tr>
              <th style={thS}>#</th><th style={thS}>{lang==='ar'?'الاسم':'Name'}</th>
              <th style={thS}>{lang==='ar'?'القسم':'Dept'}</th><th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
              <th style={thS}>{lang==='ar'?'الحضور':'In'}</th><th style={thS}>{lang==='ar'?'الانصراف':'Out'}</th>
              <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
            </tr></thead>
            <tbody>
              {popupFiltered.map((att,idx)=>{
                const emp=EMPLOYEES.find(e=>e.id===att.employeeId);
                const dept=DEPARTMENTS.find(d=>d.id===emp?.departmentId);
                const sm=statusMeta[att.status];
                return(
                  <tr key={att.id} style={{background:idx%2===0?'white':'#FAFBFC'}}>
                    <td style={tdS({color:'#94A3B8',width:'40px'})}>{idx+1}</td>
                    <td style={tdS({fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                    <td style={tdS({color:'#64748B'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                    <td style={tdS({direction:'ltr',textAlign:lang==='ar'?'right':'left',color:'#94A3B8'})}>{att.date}</td>
                    <td style={tdS({direction:'ltr',textAlign:lang==='ar'?'right':'left',color:'#166534',fontWeight:'600'})}>{att.checkIn||'—'}</td>
                    <td style={tdS({direction:'ltr',textAlign:lang==='ar'?'right':'left',color:'#1565C0',fontWeight:'600'})}>{att.checkOut||'—'}</td>
                    <td style={tdS()}><span style={{background:sm?.bg,color:sm?.color,border:`1px solid ${sm?.border}`,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{sm?.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}

export default AttendanceAdmin;