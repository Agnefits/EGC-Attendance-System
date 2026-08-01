import useNotifications from './useNotifications';
import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService, employeesService, leavesService, permissionsService, structureService } from '../services';

function Modal({ open, onClose, lang, title, children }) {
  if (!open) return null;
  const dir = lang==='ar'?'rtl':'ltr';
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'960px',maxHeight:'88vh',overflow:'hidden',display:'flex',flexDirection:'column',direction:dir,fontFamily:'Cairo,sans-serif',boxShadow:'0 32px 80px rgba(0,0,0,.22)'}}>
        <div style={{padding:'18px 24px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:'16px',fontWeight:'800',color:'#0F172A'}}>{title}</span>
          <button onClick={onClose} style={{background:'#F1F5F9',border:'none',borderRadius:'8px',padding:'8px 14px',cursor:'pointer',fontSize:'13px',color:'#475569',fontFamily:'Cairo',fontWeight:'700'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#DC2626';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#475569';}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  );
}

function Dashboard({ t, lang, user, setActivePage }) {
  const dir = lang==='ar'?'rtl':'ltr';
  const { notifs: NOTIFS, unread: notifUnread } = useNotifications({ user, lang });

  const [attendance,  setAttendance]  = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colleges,    setColleges]    = useState([]);
  const [leavesList,  setLeavesList]  = useState([]);
  const [permsList,   setPermsList]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [time, setTime] = useState('');
  const [showAtt,   setShowAtt]   = useState(false);
  const [showEmp,   setShowEmp]   = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [deptModal, setDeptModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = React.useRef(null);

  // Normalize backend leave field names to frontend conventions
  const normalizeLeave = (l) => {
    const statusRaw = l.status ?? l.Status;
    let status = 'pending';
    if (statusRaw === 1 || statusRaw === '1' || String(statusRaw).toLowerCase() === 'approved') status = 'approved';
    else if (statusRaw === 2 || statusRaw === '2' || String(statusRaw).toLowerCase() === 'rejected') status = 'rejected';
    else if (statusRaw === 0 || statusRaw === '0' || String(statusRaw).toLowerCase() === 'pending') status = 'pending';
    else status = String(statusRaw || 'pending').toLowerCase();
    return {
      ...l,
      status,
      from: l.from || l.fromDate || l.FromDate || '',
      to: l.to || l.toDate || l.ToDate || '',
      days: l.days || l.daysCount || l.DaysCount || 0,
      type: String(l.type || l.leaveType || l.LeaveType || l.leaveTypeId || 'annual').toLowerCase(),
      employeeId: l.employeeId || l.EmployeeId || '',
      employeeName: l.employeeName || l.EmployeeName || '',
    };
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [attData, empData, deptData, colData, leaveData, permData] = await Promise.all([
        attendanceService.getAttendanceLogs().catch(() => []),
        employeesService.getEmployees().catch(() => []),
        structureService.getDepartments().catch(() => []),
        structureService.getColleges().catch(() => []),
        leavesService.getLeaves().catch(() => []),
        permissionsService.getPermissions().catch(() => [])
      ]);
      setAttendance(Array.isArray(attData) ? attData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setColleges(Array.isArray(colData) ? colData : []);
      setLeavesList(Array.isArray(leaveData) ? leaveData.map(normalizeLeave) : []);
      setPermsList(Array.isArray(permData) ? permData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(()=>{
    const t2=setInterval(()=>setTime(new Date().toLocaleTimeString(lang==='ar'?'ar-EG':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})),1000);
    setTime(new Date().toLocaleTimeString(lang==='ar'?'ar-EG':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}));
    return()=>clearInterval(t2);
  },[lang]);

  useEffect(()=>{
    const fn=e=>{if(notifRef.current&&!notifRef.current.contains(e.target))setNotifOpen(false);};
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[]);  /* ─── Data Normalization ─── */
  const getAttStatus = (st) => {
    if (st === 0 || st === '0' || String(st).toLowerCase() === 'present') return 'present';
    if (st === 1 || st === '1' || String(st).toLowerCase() === 'late') return 'late';
    if (st === 2 || st === '2' || String(st).toLowerCase() === 'left') return 'left';
    if (st === 3 || st === '3' || String(st).toLowerCase() === 'absent') return 'absent';
    return String(st || '').toLowerCase();
  };

  const getLeaveStatus = (st) => {
    if (st === 0 || st === '0' || String(st).toLowerCase() === 'pending') return 'pending';
    if (st === 1 || st === '1' || String(st).toLowerCase() === 'approved') return 'approved';
    if (st === 2 || st === '2' || String(st).toLowerCase() === 'rejected') return 'rejected';
    return String(st || '').toLowerCase();
  };

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayAtt     = attendance.filter(a => String(a.date || a.Date || '').slice(0, 10) === todayDateStr);
  const targetAtts   = todayAtt.length > 0 ? todayAtt : attendance;
  const total        = targetAtts.length || 1;

  const present   = targetAtts.filter(a => getAttStatus(a.status || a.Status) === 'present' || getAttStatus(a.status || a.Status) === 'left').length;
  const absent    = targetAtts.filter(a => getAttStatus(a.status || a.Status) === 'absent').length;
  const late      = targetAtts.filter(a => getAttStatus(a.status || a.Status) === 'late').length;
  const leftC     = targetAtts.filter(a => getAttStatus(a.status || a.Status) === 'left').length;
  const attPct    = Math.round(present / total * 100);

  const todayPres = present;
  const todayAbs  = absent;
  const todayLate = late;

  const totalEmps    = employees.length;
  const maleEmps     = employees.filter(e => {
    const g = String(e.gender || e.genderName || '').toLowerCase();
    return g === 'male' || g === 'ذكر' || e.gender === 1 || g === '1';
  }).length;
  const femaleEmps   = employees.filter(e => {
    const g = String(e.gender || e.genderName || '').toLowerCase();
    return g === 'female' || g === 'أنثى' || e.gender === 2 || g === '2';
  }).length;

  const academicEmps = employees.filter(e => {
    const t = String(e.type || e.employeeType || e.jobType || '').toLowerCase();
    return t === 'academic' || t === 'أكاديمي' || e.type === 1 || t === '1';
  }).length;
  const adminEmps    = employees.filter(e => {
    const t = String(e.type || e.employeeType || e.jobType || '').toLowerCase();
    return t === 'administrative' || t === 'admin' || t === 'إداري' || e.type === 2 || t === '2';
  }).length;

  const pendingLeaves = leavesList.filter(l => getLeaveStatus(l.status || l.Status) === 'pending');
  const pendingPerms  = permsList.filter(p => getLeaveStatus(p.status || p.Status) === 'pending');
  const todayOnLeave  = leavesList.filter(l => {
    const st = getLeaveStatus(l.status || l.Status);
    const from = String(l.fromDate || l.from || '').slice(0, 10);
    const to = String(l.toDate || l.to || '').slice(0, 10);
    return st === 'approved' && from <= todayDateStr && to >= todayDateStr;
  });

  const deptStats = departments.map(d=>{
    const emps=employees.filter(e=>e.departmentId===d.id || e.department===d.name);
    const atts=attendance.filter(a=>emps.find(e=>e.id===a.employeeId || e.name===a.employeeName));
    const p=atts.filter(a=>a.status==='present'||a.status==='left').length;
    return {...d,count:emps.length,present:p,absent:atts.filter(a=>a.status==='absent').length,late:atts.filter(a=>a.status==='late').length,pct:atts.length?Math.round(p/atts.length*100):0};
  }).filter(d=>d.count>0).sort((a,b)=>b.pct-a.pct);

  // Monthly chart
  const months = Array.from({length:6}).map((_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-5+i);
    const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const mAtt=attendance.filter(a=>a.date?.startsWith(m));
    const mPres=mAtt.filter(a=>a.status==='present'||a.status==='left').length;
    return {m,label:d.toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{month:'short'}),pct:mAtt.length?Math.round(mPres/mAtt.length*100):0};
  });

  const EMPLOYEES = employees;
  const ATTENDANCE = attendance;
  const LEAVES = leavesList;
  const PERMISSIONS = permsList;
  const DEPARTMENTS = departments;
  const COLLEGES = colleges;

  // Smart alerts
  const alerts = [];
  EMPLOYEES.forEach(emp=>{
    const empAtt=ATTENDANCE.filter(a=>a.employeeId===emp.id).sort((a,b)=>b.date.localeCompare(a.date));
    let consec=0; for(const a of empAtt){if(a.status==='absent')consec++; else break;}
    if(consec>=2) alerts.push({type:'absent',emp,consec,c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA',icon:'⚠️'});
  });
  const in3=new Date(); in3.setDate(in3.getDate()+3);
  LEAVES.filter(l=>l.status==='approved').forEach(l=>{
    const end=new Date(l.to);
    if(end>=new Date()&&end<=in3){const emp=EMPLOYEES.find(e=>e.id===l.employeeId);alerts.push({type:'leave_end',emp,l,c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A',icon:'📅'});}
  });
  const thisM=new Date().toISOString().slice(0,7);
  EMPLOYEES.forEach(emp=>{
    const used=(PERMISSIONS||[]).filter(p=>p.employeeId===emp.id&&p.date?.startsWith(thisM)&&p.status==='approved').reduce((s,p)=>s+(p.duration||0),0);
    if(used>180) alerts.push({type:'perm',emp,used,c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE',icon:'🔖'});
  });

  const barC = p=>p>=80?'#16A34A':p>=60?'#D97706':'#DC2626';
  const card  = {background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',boxShadow:'0 2px 8px rgba(0,0,0,.04)'};
  const thS   = {background:'#F8FAFC',padding:'11px 16px',textAlign:'center',fontWeight:'700',color:'#475569',fontSize:'13px',borderBottom:'1.5px solid #E2E8F0',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:1};
  const tdS   = (x={})=>({padding:'11px 16px',borderBottom:'1px solid #F8FAFC',fontSize:'13px',textAlign:'center',verticalAlign:'middle',...x});

  const SM = {
    present:{l:{ar:'حاضر',en:'Present'},c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0'},
    late:   {l:{ar:'متأخر',en:'Late'},  c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A'},
    left:   {l:{ar:'انصرف',en:'Left'}, c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE'},
    absent: {l:{ar:'غائب',en:'Absent'},c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA'},
  };

  return (
    <div style={{padding:'24px 28px',fontFamily:'Cairo,sans-serif',direction:dir,background:'#F1F5F9',minHeight:'100%'}}>

      {/* ══ HERO ══ */}
      <div style={{borderRadius:'16px',marginBottom:'18px',overflow:'hidden',boxShadow:'0 4px 16px rgba(13,59,122,.15)'}}>
        <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'50px',height:'50px',borderRadius:'14px',background:'rgba(255,255,255,.15)',border:'2px solid rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'900',color:'white',flexShrink:0}}>
              {(lang==='en'?user?.nameEn:user?.name)?.charAt(0)||'A'}
            </div>
            <div>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginBottom:'3px'}}>{lang==='ar'?'مرحباً — لوحة تحكم المدير':'Welcome — Admin Dashboard'}</div>
              <div style={{fontSize:'20px',fontWeight:'800',color:'white',lineHeight:1.2}}>{lang==='en'?user?.nameEn:user?.name}</div>
              <div style={{marginTop:'6px'}}>
                <span style={{background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)',border:'1px solid rgba(255,255,255,.2)',padding:'2px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'600'}}>{lang==='ar'?'مدير النظام':'System Admin'}</span>
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'16px',flexShrink:0}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.5)',marginBottom:'3px',letterSpacing:'.5px'}}>{lang==='ar'?'الوقت':'TIME'}</div>
              <div style={{fontSize:'22px',fontWeight:'800',color:'white',direction:'ltr',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{time}</div>
            </div>
            <div style={{width:'1px',height:'36px',background:'rgba(255,255,255,.2)'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.5)',marginBottom:'3px',letterSpacing:'.5px'}}>{lang==='ar'?'اليوم':'DATE'}</div>
              <div style={{fontSize:'13px',fontWeight:'700',color:'white'}}>{new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
            </div>
            <div style={{width:'1px',height:'36px',background:'rgba(255,255,255,.2)'}}/>
            {/* Bell */}
            <div ref={notifRef} style={{position:'relative'}}>
              <button onClick={()=>setNotifOpen(p=>!p)}
                style={{width:'42px',height:'42px',borderRadius:'11px',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',transition:'all .15s',position:'relative'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.22)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.12)'}>
                🔔
                {notifUnread>0&&(
                  <span style={{position:'absolute',top:'-4px',right:'-4px',width:'17px',height:'17px',borderRadius:'50%',background:'#DC2626',color:'white',fontSize:'9px',fontWeight:'900',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #1565C0'}}>
                    {notifUnread}
                  </span>
                )}
              </button>
              {notifOpen&&(
                <div style={{position:'fixed',top:'130px',[lang==='ar'?'left':'right']:'16px',width:'300px',background:'white',borderRadius:'14px',border:'1px solid #E2E8F0',boxShadow:'0 12px 40px rgba(0,0,0,.15)',zIndex:99999,overflow:'hidden',fontFamily:'Cairo,sans-serif',direction:dir}}>
                  <div style={{padding:'12px 16px',borderBottom:'1px solid #F1F5F9',background:'#FAFBFC',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'13px',fontWeight:'800',color:'#0F172A'}}>{lang==='ar'?'الإشعارات':'Notifications'}</span>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{background:'#FEE2E2',color:'#DC2626',padding:'2px 8px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{notifUnread}</span>
                      <button onClick={()=>setNotifOpen(false)}
                        style={{background:'#F1F5F9',border:'none',borderRadius:'6px',padding:'4px 9px',cursor:'pointer',fontSize:'12px',color:'#475569',fontFamily:'Cairo',fontWeight:'700',transition:'all .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#DC2626';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#475569';}}>✕</button>
                    </div>
                  </div>
                  {pendingLeaves.length>0&&<div onClick={()=>{setNotifOpen(false);setShowLeave(true);}} style={{padding:'12px 16px',borderBottom:'1px solid #F8FAFC',display:'flex',gap:'10px',alignItems:'center',cursor:'pointer',background:'#FFFBEB'}} onMouseEnter={e=>e.currentTarget.style.background='#FEF3C7'} onMouseLeave={e=>e.currentTarget.style.background='#FFFBEB'}><div style={{width:'34px',height:'34px',borderRadius:'10px',background:'#FEF3C7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>📅</div><div><div style={{fontSize:'12px',fontWeight:'700',color:'#B45309'}}>{lang==='ar'?'إجازات معلقة':'Pending Leaves'}</div><div style={{fontSize:'11px',color:'#64748B'}}>{pendingLeaves.length} {lang==='ar'?'طلب':'requests'}</div></div></div>}
                  {pendingPerms.length>0&&<div onClick={()=>setNotifOpen(false)} style={{padding:'12px 16px',borderBottom:'1px solid #F8FAFC',display:'flex',gap:'10px',alignItems:'center',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e=>e.currentTarget.style.background='white'}><div style={{width:'34px',height:'34px',borderRadius:'10px',background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🔖</div><div><div style={{fontSize:'12px',fontWeight:'700',color:'#6B21A8'}}>{lang==='ar'?'أذونات معلقة':'Pending Permissions'}</div><div style={{fontSize:'11px',color:'#64748B'}}>{pendingPerms.length} {lang==='ar'?'طلب':'requests'}</div></div></div>}
                  {alerts.length>0&&<div onClick={()=>setNotifOpen(false)} style={{padding:'12px 16px',display:'flex',gap:'10px',alignItems:'center',cursor:'pointer',background:'#FFF5F5'}} onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'} onMouseLeave={e=>e.currentTarget.style.background='#FFF5F5'}><div style={{width:'34px',height:'34px',borderRadius:'10px',background:'#FEE2E2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>⚠️</div><div><div style={{fontSize:'12px',fontWeight:'700',color:'#DC2626'}}>{lang==='ar'?'تنبيهات ذكية':'Smart Alerts'}</div><div style={{fontSize:'11px',color:'#64748B'}}>{alerts.length} {lang==='ar'?'تنبيه':'alerts'}</div></div></div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',background:'white'}}>
          {[
            {v:totalEmps,   l:{ar:'إجمالي الموظفين',en:'Total Emps'}, c:'#1565C0',bg:'#EFF6FF',fn:()=>setShowEmp(true)},
            {v:todayPres,   l:{ar:'حاضر اليوم',     en:'Present'},    c:'#166534',bg:'#F0FDF4',fn:()=>setShowAtt(true)},
            {v:todayLate,   l:{ar:'متأخر اليوم',    en:'Late'},       c:'#B45309',bg:'#FFFBEB',fn:()=>setShowAtt(true)},
            {v:todayAbs,    l:{ar:'غائب اليوم',     en:'Absent'},     c:'#991B1B',bg:'#FEF2F2',fn:()=>setShowAtt(true)},
            {v:pendingLeaves.length,l:{ar:'إجازات معلقة',en:'Pending'},c:'#6B21A8',bg:'#F5F3FF',fn:()=>setShowLeave(true)},
            {v:todayOnLeave.length, l:{ar:'في إجازة اليوم',en:'On Leave'},c:'#0891B2',bg:'#ECFEFF',fn:null},
          ].map((s,i)=>(
            <div key={i}
              style={{textAlign:'center',padding:'14px 8px',borderInlineEnd:i<5?'1px solid #F1F5F9':'none'}}>
              <div style={{fontSize:'26px',fontWeight:'900',color:s.c,lineHeight:1,marginBottom:'4px'}}>{s.v}</div>
              <div style={{fontSize:'12px',color:'#94A3B8',fontWeight:'600'}}>{s.l[lang]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'12px',marginBottom:'18px'}}>
        {[
          {icon:'👤',l:{ar:'إضافة موظف',    en:'Add Employee'},   c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0',page:'addEmployee'},
          {icon:'📋',l:{ar:'سجل الحضور',    en:'Attendance'},     c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE',page:'attendance'},
          {icon:'🌴',l:{ar:'منح إجازة',      en:'Grant Leave'},    c:'#BE185D',bg:'#FCE7F3',bd:'#FBCFE8',page:'leaves'},
          {icon:'📊',l:{ar:'التقارير',       en:'Reports'},        c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE',page:'reports'},
          {icon:'👥',l:{ar:'الموظفين',       en:'Employees'},      c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A',page:'employees'},
          {icon:'🏢',l:{ar:'الهيكل التنظيمي',en:'Structure'},     c:'#0891B2',bg:'#CFFAFE',bd:'#A5F3FC',page:'structure'},
        ].map((a,i)=>(
          <div key={i} onClick={()=>setActivePage(a.page)}
            style={{...card,padding:'16px 18px',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',transition:'all .2s',borderInlineStart:`3px solid ${a.c}`}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${a.bd}66`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}>
            <div style={{width:'42px',height:'42px',borderRadius:'12px',background:a.bg,border:`1px solid ${a.bd}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>{a.icon}</div>
            <div>
              <div style={{fontSize:'13px',fontWeight:'800',color:a.c}}>{a.l[lang]}</div>
              <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{lang==='ar'?'اضغط للانتقال':'Tap to go'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ ATTENDANCE MAP ══ */}
      <div style={{...card,marginBottom:'18px',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>🗺️ {lang==='ar'?'خريطة الحضور الفعلية':'Live Attendance Map'}</span>
            <span style={{display:'flex',alignItems:'center',gap:'4px',background:'#DCFCE7',color:'#166534',padding:'2px 8px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',border:'1px solid #BBF7D0'}}>
              <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#16A34A',display:'inline-block',animation:'pulse 1.5s infinite'}}/>
              {lang==='ar'?'مباشر':'LIVE'}
            </span>
          </div>
          <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
            {[
              {s:'present',l:{ar:'حاضر',en:'Present'},c:'#166534',bg:'#DCFCE7'},
              {s:'late',   l:{ar:'متأخر',en:'Late'},   c:'#B45309',bg:'#FEF3C7'},
              {s:'absent', l:{ar:'غائب',en:'Absent'},  c:'#991B1B',bg:'#FEE2E2'},
              {s:'leave',  l:{ar:'إجازة',en:'Leave'},  c:'#6B21A8',bg:'#EDE9FE'},
            ].map(st=>(
              <div key={st.s} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'10px',height:'10px',borderRadius:'3px',background:st.bg,border:'1.5px solid '+st.c}}/>
                <span style={{fontSize:'12px',color:'#475569',fontWeight:'600'}}>{st.l[lang]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department grid */}
        <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px',maxHeight:'320px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
          {(()=>{
            const today2=new Date().toISOString().slice(0,10);
            const onLeaveToday=LEAVES.filter(l=>l.status==='approved'&&l.from<=today2&&l.to>=today2).map(l=>l.employeeId);
            const SM2={
              present:{c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0'},
              late:   {c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A'},
              left:   {c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE'},
              absent: {c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA'},
              leave:  {c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE'},
            };
            return DEPARTMENTS.map(dept=>{
              const emps=EMPLOYEES.filter(e=>e.departmentId===dept.id);
              if(!emps.length) return null;
              const stats={present:0,late:0,absent:0,leave:0,left:0};
              emps.forEach(emp=>{
                if(onLeaveToday.includes(emp.id)){stats.leave++;return;}
                const rec=ATTENDANCE.filter(a=>a.employeeId===emp.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
                const st=rec?.status||'absent';
                if(stats[st]!==undefined)stats[st]++; else stats.absent++;
              });
              const pct=Math.round((stats.present+stats.late+stats.left)/emps.length*100);
              const pc=pct>=80?'#16A34A':pct>=60?'#D97706':'#DC2626';
              return(
                <div key={dept.id} style={{background:'white',borderRadius:'12px',border:'1px solid #E8EDF5',padding:'12px',boxShadow:'0 1px 4px rgba(0,0,0,.04)',transition:'all .2s',cursor:'pointer'}}
                  onClick={()=>setDeptModal({dept,emps,stats,onLeaveToday,SM2})}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,.08)';}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'7px'}}>
                    <div style={{fontSize:'11px',fontWeight:'800',color:'#0F172A',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingInlineEnd:'6px'}}>{lang==='en'?dept.nameEn:dept.name}</div>
                    <span style={{fontSize:'13px',fontWeight:'900',color:pc,flexShrink:0}}>{pct}%</span>
                  </div>
                  <div style={{height:'5px',borderRadius:'999px',background:'#F1F5F9',overflow:'hidden',marginBottom:'8px',display:'flex'}}>
                    {stats.present>0&&<div style={{width:`${stats.present/emps.length*100}%`,background:'#16A34A',height:'100%'}}/>}
                    {stats.late>0   &&<div style={{width:`${stats.late/emps.length*100}%`,   background:'#D97706',height:'100%'}}/>}
                    {stats.left>0   &&<div style={{width:`${stats.left/emps.length*100}%`,   background:'#1565C0',height:'100%'}}/>}
                    {stats.leave>0  &&<div style={{width:`${stats.leave/emps.length*100}%`,  background:'#6B21A8',height:'100%'}}/>}
                    {stats.absent>0 &&<div style={{width:`${stats.absent/emps.length*100}%`, background:'#DC2626',height:'100%'}}/>}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'3px',marginBottom:'7px'}}>
                    {emps.map(emp=>{
                      const isLeave=onLeaveToday.includes(emp.id);
                      const rec=ATTENDANCE.filter(a=>a.employeeId===emp.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
                      const st=isLeave?'leave':rec?.status||'absent';
                      const sm=SM2[st]||SM2.absent;
                      return(
                        <div key={emp.id}
                          title={`${lang==='en'?emp.nameEn:emp.name}${rec?.checkIn?' · '+rec.checkIn:''}`}
                          style={{width:'22px',height:'22px',borderRadius:'6px',background:sm.bg,border:'1.5px solid '+sm.bd,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'800',color:sm.c,cursor:'default',transition:'transform .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.3)'}
                          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                          {(lang==='en'?emp.nameEn:emp.name)?.charAt(0)}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                    {stats.present>0&&<span style={{fontSize:'9px',background:'#DCFCE7',color:'#166534',padding:'1px 5px',borderRadius:'999px',fontWeight:'700'}}>✓{stats.present}</span>}
                    {stats.late>0   &&<span style={{fontSize:'9px',background:'#FEF3C7',color:'#B45309',padding:'1px 5px',borderRadius:'999px',fontWeight:'700'}}>⏰{stats.late}</span>}
                    {stats.absent>0 &&<span style={{fontSize:'9px',background:'#FEE2E2',color:'#991B1B',padding:'1px 5px',borderRadius:'999px',fontWeight:'700'}}>✗{stats.absent}</span>}
                    {stats.leave>0  &&<span style={{fontSize:'9px',background:'#EDE9FE',color:'#6B21A8',padding:'1px 5px',borderRadius:'999px',fontWeight:'700'}}>🌴{stats.leave}</span>}
                  </div>
                </div>
              );
            }).filter(Boolean);
          })()}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:'16px',marginBottom:'16px'}}>

        {/* Attendance donut */}
        <div style={{...card,padding:'20px'}}>
          <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid #F1F5F9'}}>
            {lang==='ar'?'نسبة الحضور الكلية':'Overall Attendance'}
          </div>
          {(()=>{
            const R=52,C=2*Math.PI*R;
            const sl=[{v:present,c:'#16A34A'},{v:late,c:'#D97706'},{v:absent,c:'#DC2626'},{v:leftC,c:'#1565C0'}];
            let cum=0;
            return(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
                <div style={{position:'relative',width:'116px',height:'116px'}}>
                  <svg width="116" height="116">
                    <circle cx="58" cy="58" r={R} fill="none" stroke="#F1F5F9" strokeWidth="12"/>
                    {sl.map((s,i)=>{const p=s.v/total,d=C*p,o=C/4-C*cum;cum+=p;return s.v>0&&<circle key={i} cx="58" cy="58" r={R} fill="none" stroke={s.c} strokeWidth="12" strokeDasharray={`${Math.max(d-2,0)} ${C}`} strokeDashoffset={o} style={{transition:'all 1.2s'}}/>;  })}
                  </svg>
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'22px',fontWeight:'900',color:barC(attPct),lineHeight:1}}>{attPct}%</span>
                    <span style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{lang==='ar'?'حضور':'rate'}</span>
                  </div>
                </div>
                <div style={{width:'100%',display:'flex',flexDirection:'column',gap:'6px'}}>
                  {[{v:present,c:'#16A34A',l:{ar:'حاضر',en:'Present'}},{v:late,c:'#D97706',l:{ar:'متأخر',en:'Late'}},{v:absent,c:'#DC2626',l:{ar:'غائب',en:'Absent'}},{v:leftC,c:'#1565C0',l:{ar:'انصرف',en:'Left'}}].map(s=>{
                    const p=total?Math.round(s.v/total*100):0;
                    return(<div key={s.l.ar} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <div style={{width:'8px',height:'8px',borderRadius:'2px',background:s.c,flexShrink:0}}/>
                      <span style={{fontSize:'12px',color:'#475569',fontWeight:'600',minWidth:'40px'}}>{s.l[lang]}</span>
                      <div style={{flex:1,background:'#F1F5F9',borderRadius:'999px',height:'5px',overflow:'hidden'}}>
                        <div style={{width:`${p}%`,background:s.c,height:'100%',borderRadius:'999px',transition:'width 1s'}}/>
                      </div>
                      <span style={{fontSize:'12px',fontWeight:'800',color:s.c,minWidth:'18px'}}>{s.v}</span>
                    </div>);
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right col */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {/* Workforce */}
          <div style={{...card,padding:'18px 20px'}}>
            <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid #F1F5F9'}}>
              {lang==='ar'?'تركيبة الموظفين':'Workforce'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
              {[
                {l:{ar:'رجل',    en:'Male'},   v:maleEmps,    pct:Math.round(maleEmps/totalEmps*100),    c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE'},
                {l:{ar:'أنثى',   en:'Female'}, v:femaleEmps,  pct:Math.round(femaleEmps/totalEmps*100),  c:'#BE185D',bg:'#FCE7F3',bd:'#FBCFE8'},
                {l:{ar:'أكاديمي',en:'Acad.'},  v:academicEmps,pct:Math.round(academicEmps/totalEmps*100),c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE'},
                {l:{ar:'إداري',  en:'Admin'},  v:adminEmps,   pct:Math.round(adminEmps/totalEmps*100),   c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A'},
              ].map(g=>(
                <div key={g.l.ar} style={{background:g.bg,borderRadius:'12px',padding:'14px',border:`1px solid ${g.bd}`,textAlign:'center'}}>
                  <div style={{fontSize:'26px',fontWeight:'900',color:g.c,lineHeight:1}}>{g.v}</div>
                  <div style={{fontSize:'12px',color:g.c,fontWeight:'700',marginTop:'4px'}}>{g.l[lang]}</div>
                  <div style={{fontSize:'11px',color:g.c,opacity:.7,marginTop:'2px'}}>{g.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dept donut cards */}
          <div style={{...card,padding:'18px 20px',flex:1}}>
            <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{lang==='ar'?'حضور الأقسام':'Dept Attendance'}</span>
              <span style={{fontSize:'12px',color:'#94A3B8',fontWeight:'600'}}>{deptStats.length} {lang==='ar'?'قسم':'depts'}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'10px'}}>
              {deptStats.map(d=>{
                const R2=32,C2=2*Math.PI*R2;
                const col=COLLEGES.find(c=>c.id===d.collegeId);
                const slices=[{v:d.present,color:'#16A34A'},{v:d.count-d.present,color:'#DC2626'}];
                let cum2=0; const pc=barC(d.pct);
                return(
                  <div key={d.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',padding:'12px 8px',borderRadius:'12px',border:`1px solid ${pc}22`,background:'white',transition:'all .2s',cursor:'pointer'}}
                    onClick={()=>{
                      const emps = employees.filter(e => e.departmentId === d.id || e.department === d.name);
                      setDeptModal({ dept: d, emps, stats: { present: d.present, absent: d.absent, late: d.late, leave: 0 }, onLeaveToday: [], SM2: { present:{c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0'}, late:{c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A'}, left:{c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE'}, absent:{c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA'}, leave:{c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE'} } });
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 14px ${pc}22`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
                    <div style={{position:'relative',width:'70px',height:'70px'}}>
                      <svg width="70" height="70">
                        <circle cx="35" cy="35" r={R2} fill="none" stroke="#F1F5F9" strokeWidth="8"/>
                        {d.count>0&&slices.map((sl,i)=>{const p=sl.v/(d.count||1),dash=C2*p;const offset=C2/4-C2*cum2;cum2+=p;return sl.v>0&&<circle key={i} cx="35" cy="35" r={R2} fill="none" stroke={sl.color} strokeWidth="8" strokeDasharray={`${Math.max(dash-2,0)} ${C2}`} strokeDashoffset={offset} style={{transition:'all 1.2s ease'}}/>;  })}
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:'13px',fontWeight:'900',color:pc}}>{d.pct}%</span>
                      </div>
                    </div>
                    <div style={{textAlign:'center',width:'100%'}}>
                      <div style={{fontSize:'11px',fontWeight:'800',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?d.nameEn:d.name}</div>
                      <div style={{fontSize:'10px',color:'#94A3B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?col?.nameEn:col?.name}</div>
                    </div>
                    <div style={{display:'flex',gap:'5px'}}>
                      <span style={{fontSize:'10px',background:'#DCFCE7',color:'#166534',padding:'1px 6px',borderRadius:'999px',fontWeight:'700'}}>{d.present}</span>
                      <span style={{fontSize:'10px',background:'#FEE2E2',color:'#991B1B',padding:'1px 6px',borderRadius:'999px',fontWeight:'700'}}>{d.count-d.present}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ ROW 2: Monthly chart + Alerts + On leave ══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 220px',gap:'16px',marginBottom:'16px'}}>

        {/* Monthly chart */}
        <div style={{...card,padding:'18px 20px'}}>
          <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>📈 {lang==='ar'?'معدل الحضور الشهري':'Monthly Attendance'}</span>
            <span style={{fontSize:'12px',background:'#EFF6FF',color:'#1565C0',padding:'3px 10px',borderRadius:'999px',fontWeight:'700',border:'1px solid #BFDBFE'}}>{lang==='ar'?'الهدف: 80%':'Target: 80%'}</span>
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'90px',paddingTop:'18px',position:'relative'}}>
            <div style={{position:'absolute',top:'18px',left:0,right:0,marginTop:`${(1-0.8)*72}px`,borderTop:'1.5px dashed #BFDBFE',zIndex:1,pointerEvents:'none'}}/>
            {months.map((m,i)=>{
              const isLast=i===months.length-1;
              const grad=m.pct>=80?'linear-gradient(180deg,#4ADE80,#16A34A)':m.pct>=60?'linear-gradient(180deg,#FCD34D,#D97706)':m.pct>0?'linear-gradient(180deg,#F87171,#DC2626)':null;
              return(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                  {m.pct>0?<span style={{fontSize:'11px',fontWeight:'800',color:barC(m.pct)}}>{m.pct}%</span>:<span style={{fontSize:'11px',color:'#CBD5E1'}}>—</span>}
                  <div style={{width:'100%',background:'#F1F5F9',borderRadius:'6px',height:'58px',display:'flex',alignItems:'flex-end',overflow:'hidden',outline:isLast?'2px solid #1565C0':'none',outlineOffset:'1px'}}>
                    {grad&&<div style={{width:'100%',background:grad,height:`${m.pct}%`,borderRadius:'4px',transition:'height 1s ease',minHeight:'4px'}}/>}
                  </div>
                  <span style={{fontSize:'11px',color:isLast?'#1565C0':'#64748B',fontWeight:isLast?'800':'600'}}>{m.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{display:'flex',gap:'10px',marginTop:'10px',paddingTop:'8px',borderTop:'1px solid #F1F5F9',alignItems:'center',flexWrap:'wrap'}}>
            {(()=>{
              const valid=months.filter(m=>m.pct>0);
              const avg=Math.round(valid.reduce((s,m)=>s+m.pct,0)/(valid.length||1));
              const best=valid.reduce((a,b)=>a.pct>b.pct?a:b,{pct:0,label:'—'});
              const worst=valid.reduce((a,b)=>a.pct<b.pct?a:b,{pct:100,label:'—'});
              const trend=valid.length>=2?valid[valid.length-1].pct-valid[valid.length-2].pct:0;
              return(<>
                <span style={{fontSize:'12px',color:'#64748B',fontWeight:'600'}}>{lang==='ar'?'متوسط:':'Avg:'} <strong style={{color:barC(avg)}}>{avg}%</strong></span>
                <span style={{fontSize:'12px',color:'#166534',fontWeight:'700',background:'#DCFCE7',padding:'2px 8px',borderRadius:'999px'}}>↑ {best.label} {best.pct}%</span>
                <span style={{fontSize:'12px',color:'#991B1B',fontWeight:'700',background:'#FEE2E2',padding:'2px 8px',borderRadius:'999px'}}>↓ {worst.label} {worst.pct}%</span>
                <span style={{fontSize:'12px',fontWeight:'700',marginRight:'auto',color:trend>0?'#166534':trend<0?'#991B1B':'#64748B'}}>{trend>0?'↗':'↘'} {trend>0?'+':''}{trend}%</span>
              </>);
            })()}
          </div>
        </div>

        {/* Smart alerts */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>🔔 {lang==='ar'?'تنبيهات ذكية':'Smart Alerts'}</span>
            <span style={{background:alerts.length>0?'#FEE2E2':'#DCFCE7',color:alerts.length>0?'#DC2626':'#166534',padding:'2px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',border:`1px solid ${alerts.length>0?'#FECACA':'#BBF7D0'}`}}>{alerts.length}</span>
          </div>
          {alerts.length===0?(
            <div style={{textAlign:'center',padding:'32px',color:'#94A3B8'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>✅</div><div style={{fontSize:'13px',fontWeight:'600'}}>{lang==='ar'?'لا توجد تنبيهات':'No alerts'}</div></div>
          ):(
            <>
            <div style={{maxHeight:'170px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {alerts.map((al,i)=>(
                <div key={i} style={{padding:'10px 18px',borderBottom:'1px solid #F8FAFC',display:'flex',alignItems:'center',gap:'10px',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=al.bg}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div style={{width:'26px',height:'26px',borderRadius:'7px',background:al.bg,border:`1px solid ${al.bd}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>{al.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:al.c,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {al.type==='absent'&&`${lang==='en'?al.emp?.nameEn:al.emp?.name} — ${lang==='ar'?`غياب ${al.consec} أيام`:` ${al.consec} days absent`}`}
                      {al.type==='leave_end'&&`${lang==='en'?al.emp?.nameEn:al.emp?.name} — ${lang==='ar'?`إجازة تنتهي ${al.l.to}`:`Leave ends ${al.l.to}`}`}
                      {al.type==='perm'&&`${lang==='en'?al.emp?.nameEn:al.emp?.name} — ${lang==='ar'?`${al.used} د أذونات`:`${al.used} min perms`}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 18px',background:'#F8FAFC',borderTop:'1px solid #F1F5F9',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {(()=>{
                const mAbs=ATTENDANCE.filter(a=>a.status==='absent'&&a.date?.startsWith(thisM)).length;
                const worst=deptStats.sort((a,b)=>a.pct-b.pct)[0];
                return(<>
                  <div style={{textAlign:'center',padding:'8px',background:'white',borderRadius:'9px',border:'1px solid #FEE2E2'}}>
                    <div style={{fontSize:'18px',fontWeight:'900',color:'#DC2626'}}>{mAbs}</div>
                    <div style={{fontSize:'11px',color:'#64748B',marginTop:'2px'}}>{lang==='ar'?'غياب الشهر':'Month absences'}</div>
                  </div>
                  <div style={{textAlign:'center',padding:'8px',background:'white',borderRadius:'9px',border:'1px solid #FDE68A'}}>
                    <div style={{fontSize:'12px',fontWeight:'800',color:'#B45309',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?worst?.nameEn:worst?.name}</div>
                    <div style={{fontSize:'11px',color:'#64748B',marginTop:'2px'}}>{lang==='ar'?'أقل حضوراً':'Lowest'} {worst?.pct}%</div>
                  </div>
                </>);
              })()}
            </div>
            </>
          )}
        </div>

        {/* On leave today */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'13px',fontWeight:'800',color:'#0F172A'}}>🌴 {lang==='ar'?'في إجازة اليوم':'On Leave Today'}</span>
            <span style={{background:'#DBEAFE',color:'#1565C0',padding:'2px 8px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',border:'1px solid #BFDBFE'}}>{todayOnLeave.length}</span>
          </div>
          {todayOnLeave.length===0?(
            <div style={{textAlign:'center',padding:'24px',color:'#94A3B8'}}><div style={{fontSize:'28px',marginBottom:'6px'}}>✅</div><div style={{fontSize:'12px',fontWeight:'600'}}>{lang==='ar'?'لا أحد في إجازة':'No one on leave'}</div></div>
          ):(
            <div style={{maxHeight:'220px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {todayOnLeave.map((l,i)=>{
                const emp=EMPLOYEES.find(e=>e.id===l.employeeId);
                return(<div key={l.id} style={{padding:'9px 16px',borderBottom:'1px solid #F8FAFC',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                  <div style={{fontSize:'11px',color:'#94A3B8',direction:'ltr',marginTop:'1px'}}>{l.from} → {l.to}</div>
                </div>);
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ ROW 3: Pending leaves + Pending perms ══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

        {/* Pending leaves */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>📅 {lang==='ar'?'الإجازات المعلقة':'Pending Leaves'}</span>
            <span style={{background:'#FEF3C7',color:'#B45309',padding:'2px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',border:'1px solid #FDE68A'}}>{pendingLeaves.length}</span>
          </div>
          {pendingLeaves.length===0?(
            <div style={{textAlign:'center',padding:'32px',color:'#94A3B8'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>✅</div><div style={{fontSize:'13px',fontWeight:'600'}}>{lang==='ar'?'لا توجد إجازات معلقة':'No pending leaves'}</div></div>
          ):(
            <div style={{maxHeight:'240px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {pendingLeaves.slice(0,8).map(l=>{
                const emp=EMPLOYEES.find(e=>e.id===l.employeeId);
                return(<div key={l.id} style={{padding:'11px 18px',borderBottom:'1px solid #F8FAFC',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#FAFBFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                    <div style={{fontSize:'11px',color:'#94A3B8',direction:'ltr',marginTop:'1px'}}>{l.from} → {l.to} · {l.days} {lang==='ar'?'يوم':'days'}</div>
                  </div>
                  <span style={{background:'#FEF3C7',color:'#B45309',border:'1px solid #FDE68A',padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{lang==='ar'?'معلق':'Pending'}</span>
                </div>);
              })}
            </div>
          )}
        </div>

        {/* Pending permissions */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>🔖 {lang==='ar'?'الأذونات المعلقة':'Pending Permissions'}</span>
            <span style={{background:'#EDE9FE',color:'#6B21A8',padding:'2px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',border:'1px solid #DDD6FE'}}>{pendingPerms.length}</span>
          </div>
          {pendingPerms.length===0?(
            <div style={{textAlign:'center',padding:'32px',color:'#94A3B8'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>✅</div><div style={{fontSize:'13px',fontWeight:'600'}}>{lang==='ar'?'لا توجد أذونات معلقة':'No pending permissions'}</div></div>
          ):(
            <div style={{maxHeight:'240px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {pendingPerms.slice(0,8).map(p=>{
                const emp=EMPLOYEES.find(e=>e.id===p.employeeId);
                return(<div key={p.id} style={{padding:'11px 18px',borderBottom:'1px solid #F8FAFC',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#FAFBFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
                    <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>{p.duration} {lang==='ar'?'دقيقة':'min'} · {p.date}</div>
                  </div>
                  <span style={{background:'#FEF3C7',color:'#B45309',border:'1px solid #FDE68A',padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{lang==='ar'?'معلق':'Pending'}</span>
                </div>);
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ ROW 4: Latest activity + Leave type stats ══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:'16px',marginBottom:'16px'}}>

        {/* Latest activity */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>🕐 {lang==='ar'?'آخر الأنشطة':'Latest Activity'}</span>
            <span style={{fontSize:'12px',color:'#94A3B8',fontWeight:'600',background:'white',border:'1px solid #E8EDF5',padding:'3px 10px',borderRadius:'999px'}}>
              {lang==='ar'?'آخر 10 عمليات':'Last 10 operations'}
            </span>
          </div>
          <div style={{maxHeight:'220px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
            {[...LEAVES].sort((a,b)=>b.id?.localeCompare(a.id)).slice(0,10).map((l,i)=>{
              const emp=EMPLOYEES.find(e=>e.id===l.employeeId);
              const statusC = l.status==='approved'?'#166534':l.status==='rejected'?'#991B1B':'#B45309';
              const statusBg= l.status==='approved'?'#DCFCE7':l.status==='rejected'?'#FEE2E2':'#FEF3C7';
              const statusBd= l.status==='approved'?'#BBF7D0':l.status==='rejected'?'#FECACA':'#FDE68A';
              const statusL = l.status==='approved'?(lang==='ar'?'موافق':'Approved'):l.status==='rejected'?(lang==='ar'?'مرفوض':'Rejected'):(lang==='ar'?'معلق':'Pending');
              return(
                <div key={l.id} style={{padding:'10px 18px',borderBottom:'1px solid #F8FAFC',display:'flex',alignItems:'center',gap:'12px',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'linear-gradient(135deg,#1565C0,#1E88E5)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'13px',flexShrink:0}}>
                    {(lang==='en'?emp?.nameEn:emp?.name)?.charAt(0)||'?'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {lang==='en'?emp?.nameEn:emp?.name}
                    </div>
                    <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>
                      {lang==='ar'?'طلب إجازة':'Leave request'} · {l.from} {lang==='ar'?'إلى':'to'} {l.to}
                    </div>
                  </div>
                  <span style={{background:statusBg,color:statusC,border:'1px solid '+statusBd,padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',whiteSpace:'nowrap'}}>
                    {statusL}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave type breakdown */}
        <div style={{...card,padding:'18px 20px'}}>
          <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid #F1F5F9'}}>
            📋 {lang==='ar'?'أنواع الإجازات':'Leave Types'}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {[
              {id:'annual',  l:{ar:'اعتيادي',   en:'Annual'},   c:'#1565C0'},
              {id:'sick',    l:{ar:'مرضية',     en:'Sick'},     c:'#991B1B'},
              {id:'urgent',  l:{ar:'عارضة',     en:'Urgent'},   c:'#B45309'},
              {id:'maternity',l:{ar:'وضع',      en:'Maternity'},c:'#BE185D'},
              {id:'grant',   l:{ar:'منحة',      en:'Grant'},    c:'#166534'},
              {id:'unpaid',  l:{ar:'بدون راتب',en:'Unpaid'},   c:'#475569'},
            ].map(lt=>{
              const cnt=LEAVES.filter(l=>l.type===lt.id).length;
              const pct=LEAVES.length?Math.round(cnt/LEAVES.length*100):0;
              return(
                <div key={lt.id} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'12px',fontWeight:'600',color:'#334155',minWidth:'60px',textAlign:lang==='ar'?'right':'left'}}>{lt.l[lang]}</span>
                  <div style={{flex:1,background:'#F1F5F9',borderRadius:'999px',height:'6px',overflow:'hidden'}}>
                    <div style={{width:`${pct}%`,background:lt.c,height:'100%',borderRadius:'999px',transition:'width 1s'}}/>
                  </div>
                  <span style={{fontSize:'12px',fontWeight:'800',color:lt.c,minWidth:'20px',textAlign:'center'}}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ MODALS ══ */}
      <Modal open={showAtt} onClose={()=>setShowAtt(false)} lang={lang} title={lang==='ar'?'تفاصيل الحضور':'Attendance Details'}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{[lang==='ar'?'الموظف':'Employee',lang==='ar'?'القسم':'Dept',lang==='ar'?'حضور':'In',lang==='ar'?'انصراف':'Out',lang==='ar'?'الحالة':'Status'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>
            {ATTENDANCE.map((a,idx)=>{
              const emp  = EMPLOYEES.find(e=>e.id===a.employeeId);
              const dept = DEPARTMENTS.find(d=>d.id===emp?.departmentId);
              const sm   = SM[a.status];
              const bdr  = '1px solid ' + (sm?.bd||'#E2E8F0');
              return(
                <tr key={a.id}
                  style={{background:idx%2===0?'white':'#FAFBFC'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                  <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                  <td style={tdS({fontSize:'12px',color:'#64748B'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                  <td style={tdS({direction:'ltr',color:'#166534',fontWeight:'700'})}>{a.checkIn||'-'}</td>
                  <td style={tdS({direction:'ltr',color:'#1565C0',fontWeight:'700'})}>{a.checkOut||'-'}</td>
                  <td style={tdS()}>
                    <span style={{background:sm?.bg,color:sm?.c,border:bdr,padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{sm?.l[lang]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

      <Modal open={showEmp} onClose={()=>setShowEmp(false)} lang={lang} title={lang==='ar'?'قائمة الموظفين':'Employees'}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{[lang==='ar'?'الاسم':'Name',lang==='ar'?'القسم':'Dept',lang==='ar'?'النوع':'Type',lang==='ar'?'الجنس':'Gender'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>
            {EMPLOYEES.map((e,idx)=>{
              const dept = DEPARTMENTS.find(d=>d.id===e.departmentId);
              const typeBg = e.type==='academic'?'#EDE9FE':'#FEF3C7';
              const typeC  = e.type==='academic'?'#6B21A8':'#B45309';
              const typeLbl= lang==='ar'?(e.type==='academic'?'أكاديمي':'إداري'):(e.type==='academic'?'Academic':'Admin');
              const genderLbl= lang==='ar'?(e.gender==='male'?'رجل':'أنثى'):(e.gender==='male'?'Male':'Female');
              return(
                <tr key={e.id} style={{background:idx%2===0?'white':'#FAFBFC'}}>
                  <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{lang==='en'?e.nameEn:e.name}</td>
                  <td style={tdS({fontSize:'12px',color:'#64748B'})}>{lang==='en'?dept?.nameEn:dept?.name}</td>
                  <td style={tdS()}>
                    <span style={{background:typeBg,color:typeC,padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{typeLbl}</span>
                  </td>
                  <td style={tdS()}>{genderLbl}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

      <Modal open={showLeave} onClose={()=>setShowLeave(false)} lang={lang} title={lang==='ar'?'الإجازات المعلقة':'Pending Leaves'}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{[lang==='ar'?'الموظف':'Employee',lang==='ar'?'النوع':'Type',lang==='ar'?'من':'From',lang==='ar'?'إلى':'To',lang==='ar'?'أيام':'Days'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>
            {pendingLeaves.map((l,idx)=>{
              const emp=EMPLOYEES.find(e=>e.id===l.employeeId);
              return(
                <tr key={l.id} style={{background:idx%2===0?'white':'#FAFBFC'}}>
                  <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{lang==='en'?emp?.nameEn:emp?.name}</td>
                  <td style={tdS()}>{l.type}</td>
                  <td style={tdS({direction:'ltr'})}>{l.from}</td>
                  <td style={tdS({direction:'ltr'})}>{l.to}</td>
                  <td style={tdS({fontWeight:'800',color:'#1565C0'})}>{l.days}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>

      {/* ══ DEPT MODAL ══ */}
      {deptModal&&(
        <div onClick={()=>setDeptModal(null)} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(3px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'420px',maxHeight:'70vh',overflow:'hidden',display:'flex',flexDirection:'column',direction:dir,fontFamily:'Cairo,sans-serif',boxShadow:'0 20px 60px rgba(0,0,0,.18)'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'linear-gradient(135deg,#0D3B7A,#1565C0)',borderRadius:'16px 16px 0 0'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'white'}}>{lang==='en'?deptModal.dept.nameEn:deptModal.dept.name}</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,.6)',marginTop:'2px'}}>{deptModal.emps.length} {lang==='ar'?'موظف':'employees'}</div>
              </div>
              <button onClick={()=>setDeptModal(null)} style={{background:'rgba(255,255,255,.15)',border:'none',borderRadius:'7px',padding:'6px 11px',cursor:'pointer',fontSize:'12px',color:'white',fontFamily:'Cairo',fontWeight:'700'}}>✕</button>
            </div>
            <div style={{display:'flex',background:'#F8FAFC',borderBottom:'1px solid #F1F5F9'}}>
              {[
                {l:{ar:'حاضر',en:'Present'},v:deptModal.stats.present,c:'#166534'},
                {l:{ar:'متأخر',en:'Late'},  v:deptModal.stats.late,   c:'#B45309'},
                {l:{ar:'غائب',en:'Absent'}, v:deptModal.stats.absent, c:'#991B1B'},
                {l:{ar:'إجازة',en:'Leave'}, v:deptModal.stats.leave,  c:'#6B21A8'},
              ].map((s,i)=>(
                <div key={i} style={{flex:1,textAlign:'center',padding:'8px 4px',borderInlineEnd:i<3?'1px solid #F1F5F9':'none'}}>
                  <div style={{fontSize:'18px',fontWeight:'900',color:s.c}}>{s.v}</div>
                  <div style={{fontSize:'10px',color:'#94A3B8',fontWeight:'600'}}>{s.l[lang]}</div>
                </div>
              ))}
            </div>
            <div style={{overflowY:'auto',flex:1,scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {deptModal.emps.map(emp=>{
                const isLeave=deptModal.onLeaveToday.includes(emp.id);
                const rec=ATTENDANCE.filter(a=>a.employeeId===emp.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
                const st=isLeave?'leave':rec?.status||'absent';
                const sm=deptModal.SM2[st]||deptModal.SM2.absent;
                const stL={present:{ar:'حاضر',en:'Present'},late:{ar:'متأخر',en:'Late'},left:{ar:'انصرف',en:'Left'},absent:{ar:'غائب',en:'Absent'},leave:{ar:'إجازة',en:'Leave'}};
                return(
                  <div key={emp.id} style={{padding:'10px 18px',borderBottom:'1px solid #F8FAFC',display:'flex',alignItems:'center',gap:'10px',transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{width:'32px',height:'32px',borderRadius:'9px',background:sm.bg,border:'1.5px solid '+sm.bd,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:sm.c,flexShrink:0}}>
                      {(lang==='en'?emp.nameEn:emp.name)?.charAt(0)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='en'?emp.nameEn:emp.name}</div>
                      <div style={{fontSize:'11px',color:'#94A3B8'}}>{lang==='ar'?(emp.type==='academic'?'أكاديمي':'إداري'):(emp.type==='academic'?'Academic':'Admin')}</div>
                    </div>
                    <div style={{textAlign:'end',flexShrink:0}}>
                      <span style={{background:sm.bg,color:sm.c,border:'1px solid '+sm.bd,padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',display:'block'}}>{stL[st]?.[lang]}</span>
                      {rec?.checkIn&&!isLeave&&<div style={{fontSize:'10px',color:'#94A3B8',marginTop:'2px',direction:'ltr'}}>{rec.checkIn}{rec.checkOut?' → '+rec.checkOut:''}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
