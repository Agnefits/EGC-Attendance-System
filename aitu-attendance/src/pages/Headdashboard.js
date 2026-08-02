import useNotifications from './useNotifications';
import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService, employeesService, leavesService, permissionsService } from '../services';

const STATUS_META = {
  present: { label:{ar:'حاضر', en:'Present'}, color:'#14532D', bg:'#DCFCE7', border:'#BBF7D0' },
  late:    { label:{ar:'متأخر',en:'Late'},    color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  left:    { label:{ar:'انصرف',en:'Left'},    color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
  absent:  { label:{ar:'غائب', en:'Absent'},  color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
};

const LEAVE_TYPES = [
  { id:'annual',    icon:'🏖️', label:{ar:'اعتيادي', en:'Annual'},  days:21, color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
  { id:'sick',      icon:'🏥', label:{ar:'مرضية',   en:'Sick'},    days:14, color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  { id:'urgent',    icon:'⚡', label:{ar:'عارضة',   en:'Urgent'},  days:7,  color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
];

const PERM_TYPES = {
  morning:     { icon:'🌅', label:{ar:'صباحي',    en:'Morning'},     color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  evening:     { icon:'🌆', label:{ar:'مسائي',    en:'Evening'},     color:'#0891B2', bg:'#CFFAFE', border:'#A5F3FC' },
  exceptional: { icon:'⚡', label:{ar:'استثنائي', en:'Exceptional'}, color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  nursing:     { icon:'👶', label:{ar:'رضاعة',    en:'Nursing'},     color:'#BE185D', bg:'#FCE7F3', border:'#FBCFE8' },
};

const MONTHLY_BUDGET = 240;

function Modal({ open, onClose, title, children, lang }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'22px',width:'100%',maxWidth:'680px',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',direction:lang==='ar'?'rtl':'ltr',fontFamily:'Cairo,sans-serif'}}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:'15px',fontWeight:'800',color:'#0F172A'}}>{title}</span>
          <button onClick={onClose}
            onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#DC2626';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#475569';}}
            style={{width:'32px',height:'32px',borderRadius:'8px',border:'none',background:'#F1F5F9',cursor:'pointer',fontSize:'14px',color:'#475569',transition:'all .15s',fontWeight:'700'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'18px 22px'}}>{children}</div>
      </div>
    </div>
  );
}

export default function HeadDashboard({ lang, user, setActivePage }) {
  const dir      = lang==='ar'?'rtl':'ltr';
  const { notifs: NOTIFS, unread: notifUnread } = useNotifications({ user, lang });

  const [employees,  setEmployees]  = useState([]);
  const [attendance,  setAttendance] = useState([]);
  const [leavesList,  setLeavesList] = useState([]);
  const [permsList,   setPermsList]  = useState([]);
  const [loading,     setLoading]    = useState(true);

  // Normalize backend field names (leaveTypeId/fromDate/toDate/daysCount) to
  // what this component reads (type/from/to/days).
  const normalizeLeave = (l) => ({
    ...l,
    employeeId: l.employeeId ?? l.EmployeeId ?? '',
    type: l.leaveTypeId ?? l.LeaveTypeId ?? l.type ?? '',
    from: l.fromDate ?? l.FromDate ?? l.from ?? '',
    to: l.toDate ?? l.ToDate ?? l.to ?? '',
    days: l.daysCount ?? l.DaysCount ?? l.days ?? 0,
    status: String(l.status ?? l.Status ?? 'pending').toLowerCase(),
  });

  // Normalize backend field names (permissionType/durationMinutes) to what
  // this component reads (type/duration).
  const normalizePermission = (p) => ({
    ...p,
    employeeId: p.employeeId ?? p.EmployeeId ?? '',
    type: p.permissionType ?? p.PermissionType ?? p.type ?? '',
    duration: p.durationMinutes ?? p.DurationMinutes ?? p.duration ?? 0,
    status: String(p.status ?? p.Status ?? 'pending').toLowerCase(),
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Employees list is already scoped to this Head's own department by
      // the backend (GET /api/Employees auto-restricts Head accounts).
      const [empData, attData, leaveData, permData] = await Promise.all([
        employeesService.getEmployees().catch(() => []),
        attendanceService.getAttendanceLogs().catch(() => []),
        leavesService.getLeaves().catch(() => []),
        permissionsService.getPermissions().catch(() => []),
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setAttendance(Array.isArray(attData) ? attData : []);
      setLeavesList(Array.isArray(leaveData) ? leaveData.map(normalizeLeave) : []);
      setPermsList(Array.isArray(permData) ? permData.map(normalizePermission) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const deptEmps = employees; // already department-scoped by the backend
  const empIds   = deptEmps.map(e => e.id);
  const dept     = { name: deptEmps[0]?.department, nameEn: deptEmps[0]?.department };
  const col      = { name: deptEmps[0]?.college, nameEn: deptEmps[0]?.college };

  const deptAtt     = attendance.filter(a=>empIds.includes(a.employeeId));
  const present     = deptAtt.filter(a=>a.status==='present'||a.status==='left').length;
  const absent      = deptAtt.filter(a=>a.status==='absent').length;
  const late        = deptAtt.filter(a=>a.status==='late').length;
  const attPct      = deptAtt.length?Math.round(present/deptAtt.length*100):0;
  const barColor    = p=>p>=80?'#16A34A':p>=60?'#D97706':'#DC2626';

  const deptLeaves    = leavesList.filter(l=>empIds.includes(l.employeeId));
  const pendingLeaves = deptLeaves.filter(l=>l.status==='pending');

  const permissions   = permsList.filter(p=>empIds.includes(p.employeeId));
  const pendingPerms = permissions.filter(p=>p.status==='pending');

  const [modal, setModal] = useState(null); // 'att' | 'leaves' | 'perms' | 'leaveBalance' | 'permBalance'

  const thS = {background:'#F8FAFC',padding:'11px 14px',textAlign:'center',fontWeight:'700',color:'#475569',fontSize:'13px',borderBottom:'1.5px solid #E2E8F0',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:1};
  const tdS = (x={})=>({padding:'11px 14px',borderBottom:'1px solid #F8FAFC',fontSize:'13px',textAlign:'center',verticalAlign:'middle',...x});

  function usedMins(empId) {
    return permissions.filter(p=>p.employeeId===empId&&p.status!=='rejected'&&p.type!=='exceptional'&&p.type!=='nursing').reduce((s,p)=>s+p.duration,0);
  }

  /* ── Stat card ── */
  function StatCard({icon,label,value,note,color,bg,border,onClick}) {
    return(
      <div onClick={onClick}
        style={{background:'white',borderRadius:'16px',padding:'18px 20px',border:`1.5px solid ${border}`,display:'flex',alignItems:'center',gap:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',transition:'all .2s',cursor:onClick?'pointer':'default'}}
        onMouseEnter={e=>{if(onClick){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${border}55`;}}}
        onMouseLeave={e=>{if(onClick){e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'}}}>
        <div style={{width:'48px',height:'48px',borderRadius:'14px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{icon}</div>
        <div>
          <div style={{fontSize:'13px',color:'#64748B',fontWeight:'600',marginBottom:'3px'}}>{label}</div>
          <div style={{fontSize:'28px',fontWeight:'900',color,lineHeight:1}}>{value}</div>
          {note&&<div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{note}</div>}
        </div>
        {onClick&&<div style={{marginRight:'auto',marginLeft:'auto',color:'#94A3B8',fontSize:'12px',fontWeight:'600',display:'flex',alignItems:'center',gap:'3px'}}>{lang==='ar'?'عرض':'View'} →</div>}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{padding:'40px',textAlign:'center',fontFamily:'Cairo,sans-serif',color:'#94A3B8'}}>
        {lang==='ar'?'جاري تحميل البيانات...':'Loading...'}
      </div>
    );
  }

  return (
    <div style={{padding:'24px 28px',fontFamily:'Cairo,sans-serif',direction:dir,background:'#F1F5F9',minHeight:'100%'}}>

      {/* ══ HERO ══ */}
      <div style={{borderRadius:'16px',overflow:'hidden',marginBottom:'18px',boxShadow:'0 8px 32px rgba(21,101,192,.12)'}}>
        <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:'-30px',right:lang==='ar'?'auto':'-30px',left:lang==='ar'?'-30px':'auto',width:'180px',height:'180px',borderRadius:'50%',background:'rgba(255,255,255,.04)'}}></div>
          <div style={{position:'absolute',bottom:'-20px',left:lang==='ar'?'auto':'80px',right:lang==='ar'?'80px':'auto',width:'120px',height:'120px',borderRadius:'50%',background:'rgba(255,255,255,.05)'}}></div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'16px',position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
              <div style={{width:'64px',height:'64px',borderRadius:'18px',background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',border:'2px solid rgba(255,255,255,.25)',backdropFilter:'blur(4px)'}}>👑</div>
              <div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',fontWeight:'600',letterSpacing:'1px',marginBottom:'4px',textTransform:'uppercase'}}>{lang==='ar'?'لوحة رئيس القسم':'Department Head Dashboard'}</div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'white',lineHeight:1.2}}>{lang==='en'?dept?.nameEn:dept?.name}</div>
                <div style={{fontSize:'12px',color:'rgba(255,255,255,.6)',marginTop:'5px'}}>
                  🏛️ {lang==='en'?col?.nameEn:col?.name} &nbsp;·&nbsp; {deptEmps.length} {lang==='ar'?'موظف':'employees'} &nbsp;·&nbsp;
                  {new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'long',day:'numeric',month:'long'})}
                </div>
              </div>
            </div>
            {/* Quick action btns */}
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {pendingLeaves.length>0&&(
                <button onClick={()=>setActivePage('headLeaves')}
                  style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',background:'rgba(255,255,255,.15)',backdropFilter:'blur(8px)',color:'white',border:'1px solid rgba(255,255,255,.25)',borderRadius:'10px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
                  📋 {pendingLeaves.length} {lang==='ar'?'إجازة معلقة':'Pending Leaves'}
                </button>
              )}
              {pendingPerms.length>0&&(
                <button onClick={()=>setActivePage('headPermissions')}
                  style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',background:'rgba(255,255,255,.15)',backdropFilter:'blur(8px)',color:'white',border:'1px solid rgba(255,255,255,.25)',borderRadius:'10px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .18s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
                  ⏱️ {pendingPerms.length} {lang==='ar'?'إذن معلق':'Pending Perms'}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* White stats strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',background:'white'}}>
          {[
            {v:present,     l:{ar:'حاضر',        en:'Present'}, c:'#166534',bg:'#F0FDF4'},
            {v:absent,      l:{ar:'غائب',         en:'Absent'},  c:'#991B1B',bg:'#FEF2F2'},
            {v:late,        l:{ar:'متأخر',        en:'Late'},    c:'#B45309',bg:'#FFFBEB'},
            {v:`${attPct}%`,l:{ar:'نسبة الحضور', en:'Rate'},    c:barColor(attPct),bg:'#F8FAFC'},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:'center',padding:'12px 8px',borderInlineEnd:i<3?'1px solid #F1F5F9':'none',transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background=s.bg}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div style={{fontSize:'22px',fontWeight:'900',color:s.c,lineHeight:1,marginBottom:'3px'}}>{s.v}</div>
              <div style={{fontSize:'11px',color:'#94A3B8',fontWeight:'600'}}>{s.l[lang]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Stat cards ══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'14px',marginBottom:'20px'}}>
        <StatCard icon="👥" label={lang==='ar'?'موظفو القسم':'Employees'}     value={deptEmps.length}           note={lang==='ar'?'موظف':'total'}    color="#334155" bg="#F1F5F9" border="#CBD5E1" onClick={()=>setModal('att')}/>
        <StatCard icon="📋" label={lang==='ar'?'إجازات معلقة':'Pend. Leaves'} value={pendingLeaves.length}      note={lang==='ar'?'طلب':'requests'}  color="#1565C0" bg="#DBEAFE" border="#BFDBFE" onClick={()=>setActivePage('headLeaves')}/>
        <StatCard icon="⏱️" label={lang==='ar'?'أذونات معلقة':'Pend. Perms'}  value={pendingPerms.length}       note={lang==='ar'?'طلب':'requests'}  color="#0891B2" bg="#CFFAFE" border="#A5F3FC" onClick={()=>setActivePage('headPermissions')}/>
        <StatCard icon="✅" label={lang==='ar'?'إجازات موافقة':'Appr. Leaves'} value={deptLeaves.filter(l=>l.status==='approved').length} note={lang==='ar'?'طلب':'total'} color="#14532D" bg="#DCFCE7" border="#BBF7D0"/>
      </div>

      {/* ══ 2-col ══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>

        {/* Attendance Donut */}
        <div style={{background:'white',borderRadius:'18px',border:'1px solid #E8EDF5',padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>🍩 {lang==='ar'?'توزيع حضور القسم':'Dept Attendance'}</span>
            <button onClick={()=>setModal('att')}
              style={{background:'#EFF6FF',color:'#1565C0',border:'1px solid #BFDBFE',borderRadius:'8px',padding:'5px 12px',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
              {lang==='ar'?'عرض الكل':'View All'}
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'18px'}}>
            {(()=>{
              const R=50,C=2*Math.PI*R,tot=deptAtt.length||1;
              const slices=[{v:present,c:'#16A34A'},{v:late,c:'#D97706'},{v:absent,c:'#DC2626'}];
              let cum=0;
              return(
                <div style={{position:'relative',width:'114px',height:'114px',flexShrink:0}}>
                  <svg width="114" height="114">
                    <circle cx="57" cy="57" r={R} fill="none" stroke="#E8EDF5" strokeWidth="12"/>
                    {slices.map((sl,i)=>{
                      const p=sl.v/tot,d=C*p,o=C/4-C*cum; cum+=p;
                      return sl.v>0&&<circle key={i} cx="57" cy="57" r={R} fill="none" stroke={sl.c} strokeWidth="12"
                        strokeDasharray={`${Math.max(d-2,0)} ${C}`} strokeDashoffset={o}
                        style={{transition:'all 1.2s ease'}}/>;
                    })}
                  </svg>
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'22px',fontWeight:'900',color:barColor(attPct),lineHeight:1}}>{attPct}%</span>
                    <span style={{fontSize:'9px',color:'#94A3B8',marginTop:'2px'}}>{lang==='ar'?'حضور':'rate'}</span>
                  </div>
                </div>
              );
            })()}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:'9px'}}>
              {[
                {v:present,c:'#16A34A',bg:'#DCFCE7',b:'#BBF7D0',l:{ar:'حاضر',en:'Present'}},
                {v:late,   c:'#D97706',bg:'#FEF3C7',b:'#FDE68A',l:{ar:'متأخر',en:'Late'}},
                {v:absent, c:'#DC2626',bg:'#FEE2E2',b:'#FECACA',l:{ar:'غائب', en:'Absent'}},
              ].map(s=>{
                const p=deptAtt.length?Math.round(s.v/deptAtt.length*100):0;
                return(
                  <div key={s.l.ar}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px',alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:s.c}}></div>
                        <span style={{fontSize:'12px',color:'#334155',fontWeight:'600'}}>{s.l[lang]}</span>
                      </div>
                      <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                        <span style={{fontSize:'14px',fontWeight:'800',color:s.c}}>{s.v}</span>
                        <span style={{background:s.bg,color:s.c,border:`1px solid ${s.b}`,padding:'1px 6px',borderRadius:'999px',fontSize:'10px',fontWeight:'700'}}>{p}%</span>
                      </div>
                    </div>
                    <div style={{background:'#E8EDF5',borderRadius:'999px',height:'5px',overflow:'hidden'}}>
                      <div style={{width:`${p}%`,background:s.c,height:'100%',borderRadius:'999px',transition:'width .8s ease'}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Perm balance */}
        <div style={{background:'white',borderRadius:'18px',border:'1px solid #E8EDF5',padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>⏱️ {lang==='ar'?'رصيد أذونات الموظفين':'Perm Balances'}</span>
            <button onClick={()=>setModal('permBalance')}
              style={{background:'#ECFEFF',color:'#0891B2',border:'1px solid #A5F3FC',borderRadius:'8px',padding:'5px 12px',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
              {lang==='ar'?'عرض الكل':'View All'}
            </button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {deptEmps.slice(0,4).map(emp=>{
              const used=usedMins(emp.id), rem=Math.max(0,MONTHLY_BUDGET-used);
              const low=rem<60;
              return(
                <div key={emp.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:'#F8FAFC',borderRadius:'12px',border:'1px solid #E8EDF5'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'linear-gradient(135deg,#0891B2,#06B6D4)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'14px',fontWeight:'900',flexShrink:0}}>
                    {(lang==='en'?emp.nameEn:emp.name)?.charAt(0)||'?'}
                  </div>
                  <span style={{flex:1,fontSize:'13px',fontWeight:'700',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?emp.nameEn:emp.name}</span>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'2px',flexShrink:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <span style={{fontSize:'11px',color:'#94A3B8'}}>{lang==='ar'?'الرصيد:':'Balance:'}</span>
                      <span style={{fontSize:'11px',color:'#0891B2',fontWeight:'600'}}>{MONTHLY_BUDGET} {lang==='ar'?'د':'m'}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <span style={{fontSize:'11px',color:'#94A3B8'}}>{lang==='ar'?'متبقي:':'Left:'}</span>
                      <span style={{fontSize:'14px',fontWeight:'900',color:low?'#B45309':'#14532D'}}>{rem} {lang==='ar'?'د':'m'}</span>
                      {low&&<span style={{fontSize:'12px'}}>⚠️</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {deptEmps.length>4&&<div style={{fontSize:'11px',color:'#94A3B8',textAlign:'center',paddingTop:'4px',cursor:'pointer',fontWeight:'600'}} onClick={()=>setModal('permBalance')}>+{deptEmps.length-4} {lang==='ar'?'آخرين':'more'}</div>}
          </div>
        </div>
      </div>

      {/* ══ Leave balances ══ */}
      <div style={{background:'white',borderRadius:'18px',border:'1px solid #E8EDF5',padding:'20px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>📅 {lang==='ar'?'رصيد إجازات موظفي القسم':'Dept Leave Balances'}</span>
          <button onClick={()=>setModal('leaveBalance')}
            style={{background:'#EFF6FF',color:'#1565C0',border:'1px solid #BFDBFE',borderRadius:'8px',padding:'5px 12px',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
            {lang==='ar'?'عرض الكل':'View All'}
          </button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'10px'}}>
          {deptEmps.slice(0,6).map(emp=>{
            const empLeaves=deptLeaves.filter(l=>l.employeeId===emp.id&&l.status==='approved');
            return(
              <div key={emp.id} style={{background:'#F8FAFC',borderRadius:'12px',padding:'12px 14px',border:'1px solid #E8EDF5',display:'flex',alignItems:'center',gap:'10px',transition:'all .18s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.borderColor='#BFDBFE';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF5';}}>
                <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'linear-gradient(135deg,#1565C0,#1E88E5)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'14px',fontWeight:'900',flexShrink:0}}>
                  {(lang==='en'?emp.nameEn:emp.name)?.charAt(0)||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'#0F172A',marginBottom:'8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?emp.nameEn:emp.name}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                    {LEAVE_TYPES.map(lt=>{
                      const used=empLeaves.filter(l=>l.type===lt.id).reduce((s,l)=>s+l.days,0);
                      const rem=Math.max(0,lt.days-used);
                      const low=rem<lt.days*0.25;
                      return(
                        <div key={lt.id} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'14px',flexShrink:0}}>{lt.icon}</span>
                          <span style={{fontSize:'12px',fontWeight:'700',color:'#334155',width:'56px',flexShrink:0}}>{lt.label[lang]}</span>
                          <div style={{flex:1,display:'flex',alignItems:'center',gap:'4px'}}>
                            <span style={{fontSize:'11px',color:'#94A3B8',fontWeight:'600'}}>{lt.days}</span>
                            <span style={{color:'#CBD5E1',fontSize:'10px'}}>→</span>
                            <span style={{fontSize:'13px',fontWeight:'900',color:low?'#B45309':lt.color}}>{rem}</span>
                            <span style={{fontSize:'10px',color:'#94A3B8'}}>{lang==='ar'?'يوم':'d'}</span>
                            {low&&<span style={{fontSize:'11px'}}>⚠️</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ Pending perms preview ══ */}
      <div style={{background:'white',borderRadius:'18px',border:'1px solid #E8EDF5',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>⏱️ {lang==='ar'?'آخر الأذونات':'Recent Permissions'}</span>
            {pendingPerms.length>0&&<span style={{background:'#FEE2E2',color:'#991B1B',borderRadius:'999px',fontSize:'11px',padding:'2px 8px',fontWeight:'800'}}>{pendingPerms.length} {lang==='ar'?'معلق':'pending'}</span>}
          </div>
          <button onClick={()=>setModal('perms')}
            style={{background:'#EFF6FF',color:'#1565C0',border:'1px solid #BFDBFE',borderRadius:'8px',padding:'5px 12px',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>
            {lang==='ar'?'عرض الكل':'View All'}
          </button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
              <th style={thS}>{lang==='ar'?'النوع':'Type'}</th>
              <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
              <th style={thS}>{lang==='ar'?'المدة':'Dur'}</th>
              <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
            </tr></thead>
            <tbody>
              {permissions.slice(0,4).map((p,idx)=>{
                const emp=deptEmps.find(e=>e.id===p.employeeId);
                const pt=PERM_TYPES[p.type];
                const sm={pending:{l:{ar:'معلق',en:'Pending'},c:'#B45309',bg:'#FEF3C7',b:'#FDE68A'},approved:{l:{ar:'موافق',en:'Approved'},c:'#14532D',bg:'#DCFCE7',b:'#BBF7D0'},rejected:{l:{ar:'مرفوض',en:'Rejected'},c:'#991B1B',bg:'#FEE2E2',b:'#FECACA'}}[p.status];
                return(
                  <tr key={p.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                    <td style={tdS()}><span style={{background:pt?.bg,color:pt?.color,border:`1px solid ${pt?.border}`,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',whiteSpace:'nowrap'}}>{pt?.icon} {pt?.label[lang]}</span></td>
                    <td style={tdS({direction:'ltr',color:'#64748B',fontSize:'12px'})}>{p.date}</td>
                    <td style={tdS({fontWeight:'700',color:'#334155'})}>{p.duration}{lang==='ar'?'د':'m'}</td>
                    <td style={tdS()}><span style={{background:sm?.bg,color:sm?.c,border:`1px solid ${sm?.b}`,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{sm?.l[lang]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Modals ══ */}

      {/* Attendance modal */}
      <Modal open={modal==='att'} onClose={()=>setModal(null)} title={`📋 ${lang==='ar'?'حضور القسم اليوم':"Today's Attendance"}`} lang={lang}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>
            <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
            <th style={thS}>{lang==='ar'?'الحضور':'Check In'}</th>
            <th style={thS}>{lang==='ar'?'الانصراف':'Check Out'}</th>
            <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
          </tr></thead>
          <tbody>
            {deptAtt.length===0?(
              <tr><td colSpan="4" style={{textAlign:'center',padding:'32px',color:'#94A3B8'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>📋</div>{lang==='ar'?'لا سجلات':'No records'}
              </td></tr>
            ):deptAtt.map((a,idx)=>{
              const emp=deptEmps.find(e=>e.id===a.employeeId);
              const sm=STATUS_META[a.status];
              return(
                <tr key={a.id} style={{background:idx%2===0?'white':'#FAFBFC'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                  <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                  <td style={tdS({direction:'ltr',color:'#14532D',fontWeight:'700'})}>{a.checkIn||'—'}</td>
                  <td style={tdS({direction:'ltr',color:'#1565C0',fontWeight:'700'})}>{a.checkOut||'—'}</td>
                  <td style={tdS()}><span style={{background:sm?.bg,color:sm?.color,border:`1px solid ${sm?.border}`,padding:'4px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>{sm?.label[lang]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

      {/* Leave balance modal */}
      <Modal open={modal==='leaveBalance'} onClose={()=>setModal(null)} title={`📅 ${lang==='ar'?'رصيد إجازات الموظفين':'Employee Leave Balances'}`} lang={lang}>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {deptEmps.map(emp=>{
            const empLeaves=deptLeaves.filter(l=>l.employeeId===emp.id&&l.status==='approved');
            return(
              <div key={emp.id} style={{background:'#F8FAFC',borderRadius:'14px',padding:'14px 16px',border:'1px solid #E8EDF5',display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,#1565C0,#1E88E5)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'16px',fontWeight:'900',flexShrink:0}}>
                  {(lang==='en'?emp.nameEn:emp.name)?.charAt(0)||'?'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'#0F172A',marginBottom:'8px'}}>{lang==='en'?emp.nameEn:emp.name}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                    {LEAVE_TYPES.map(lt=>{
                      const used=empLeaves.filter(l=>l.type===lt.id).reduce((s,l)=>s+l.days,0);
                      const rem=Math.max(0,lt.days-used);
                      const low=rem<lt.days*0.25;
                      return(
                        <div key={lt.id} style={{background:low?'#FEF9C3':lt.bg,borderRadius:'12px',padding:'10px 12px',border:`1.5px solid ${low?'#FDE68A':lt.border}`}}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                            <span style={{fontSize:'16px'}}>{lt.icon}</span>
                            <span style={{fontSize:'12px',fontWeight:'700',color:low?'#B45309':lt.color}}>{lt.label[lang]}</span>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'18px',fontWeight:'900',color:'#94A3B8'}}>{lt.days}</div>
                              <div style={{fontSize:'9px',color:'#94A3B8'}}>{lang==='ar'?'الكلي':'Total'}</div>
                            </div>
                            <div style={{color:'#CBD5E1',fontSize:'14px'}}>→</div>
                            <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'18px',fontWeight:'900',color:low?'#B45309':lt.color}}>{rem}</div>
                              <div style={{fontSize:'9px',color:low?'#B45309':lt.color,fontWeight:'600'}}>{lang==='ar'?'متبقي':'Left'} {low&&'⚠️'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Perm balance modal */}
      <Modal open={modal==='permBalance'} onClose={()=>setModal(null)} title={`⏱️ ${lang==='ar'?'رصيد أذونات الموظفين':'Employee Permission Balances'}`} lang={lang}>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {deptEmps.map(emp=>{
            const used=usedMins(emp.id), rem=Math.max(0,MONTHLY_BUDGET-used), pct=Math.round(used/MONTHLY_BUDGET*100);
            const low=rem<60;
            const R=28,C=2*Math.PI*R;
            return(
              <div key={emp.id} style={{background:'#F8FAFC',borderRadius:'14px',padding:'14px 16px',border:'1px solid #E8EDF5',display:'flex',alignItems:'center',gap:'14px'}}>
                {/* Mini donut */}
                <div style={{position:'relative',width:'64px',height:'64px',flexShrink:0}}>
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r={R} fill="none" stroke="#E8EDF5" strokeWidth="7"/>
                    <circle cx="32" cy="32" r={R} fill="none" stroke={low?'#D97706':'#0891B2'} strokeWidth="7"
                      strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C-(C*(1-pct/100))}
                      style={{transform:'rotate(-90deg)',transformOrigin:'32px 32px',transition:'stroke-dashoffset 1s ease'}}/>
                  </svg>
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'11px',fontWeight:'900',color:low?'#B45309':'#0891B2',lineHeight:1}}>{rem}</span>
                    <span style={{fontSize:'8px',color:'#94A3B8'}}>د</span>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'#0F172A',marginBottom:'6px'}}>{lang==='en'?emp.nameEn:emp.name}</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'11px',color:'#94A3B8'}}>{lang==='ar'?`مستخدم: ${used}د`:`Used: ${used}m`}</span>
                    <span style={{fontSize:'11px',fontWeight:'700',color:low?'#B45309':'#14532D'}}>{lang==='ar'?`متبقي: ${rem}د`:`Left: ${rem}m`} {low&&'⚠️'}</span>
                  </div>
                  <div style={{background:'#E8EDF5',borderRadius:'999px',height:'6px',overflow:'hidden'}}>
                    <div style={{width:`${100-pct}%`,background:low?'#D97706':'#0891B2',height:'100%',borderRadius:'999px',transition:'width .8s ease'}}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Perms modal */}
      <Modal open={modal==='perms'} onClose={()=>setModal(null)} title={`⏱️ ${lang==='ar'?'جميع الأذونات':'All Permissions'}`} lang={lang}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>
            <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{lang==='ar'?'الموظف':'Employee'}</th>
            <th style={thS}>{lang==='ar'?'النوع':'Type'}</th>
            <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
            <th style={thS}>{lang==='ar'?'المدة':'Dur'}</th>
            <th style={thS}>{lang==='ar'?'السبب':'Reason'}</th>
            <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
          </tr></thead>
          <tbody>
            {permissions.map((p,idx)=>{
              const emp=deptEmps.find(e=>e.id===p.employeeId);
              const pt=PERM_TYPES[p.type];
              const sm={pending:{l:{ar:'معلق',en:'Pending'},c:'#B45309',bg:'#FEF3C7',b:'#FDE68A'},approved:{l:{ar:'موافق',en:'Approved'},c:'#14532D',bg:'#DCFCE7',b:'#BBF7D0'},rejected:{l:{ar:'مرفوض',en:'Rejected'},c:'#991B1B',bg:'#FEE2E2',b:'#FECACA'}}[p.status];
              return(
                <tr key={p.id} style={{background:idx%2===0?'white':'#FAFBFC'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                  <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                  <td style={tdS()}><span style={{background:pt?.bg,color:pt?.color,border:`1px solid ${pt?.border}`,padding:'4px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>{pt?.icon} {pt?.label[lang]}</span></td>
                  <td style={tdS({direction:'ltr',color:'#64748B',fontSize:'12px'})}>{p.date}</td>
                  <td style={tdS({fontWeight:'700',color:'#334155'})}>{p.duration}{lang==='ar'?'د':'m'}</td>
                  <td style={tdS({color:'#475569',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'})}>{p.reason}</td>
                  <td style={tdS()}><span style={{background:sm?.bg,color:sm?.c,border:`1px solid ${sm?.b}`,padding:'4px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>{sm?.l[lang]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}