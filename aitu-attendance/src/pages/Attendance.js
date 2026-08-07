import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService, employeesService, structureService } from '../services';

/* ============================================================================
   Constants
============================================================================ */
const CAMPUS_LAT  = 27.184187;
const CAMPUS_LNG  = 31.172920;
const CAMPUS_RADIUS = 500; // meters

/* ============================================================================
   Haversine distance (meters)
============================================================================ */
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ============================================================================
   Multi-strategy GPS resolver
============================================================================ */
function isSecureOrigin() {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

function resolveLocation(lang) {
  return new Promise((resolve, reject) => {
    if (!isSecureOrigin()) {
      reject({ code: 'insecure', message: lang==='ar'
        ? '⚠️ يتطلب تحديد الموقع اتصالاً آمناً (HTTPS)\nالنظام مفتوح حالياً عبر اتصال غير آمن، لذا يمنع المتصفح الوصول للموقع.\nافتح النظام عبر رابط https.'
        : '⚠️ Location requires a secure connection (HTTPS)\nThe app is currently opened over an insecure connection, so the browser blocks location access.\nOpen the system via an https link.' });
      return;
    }

    if (!navigator.geolocation) {
      reject({ code: 0, message: lang==='ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation not supported' });
      return;
    }

    let resolved = false;
    function done(lat, lng, accuracy, method) {
      if (resolved) return;
      resolved = true;
      resolve({ lat, lng, accuracy, method });
    }

    navigator.geolocation.getCurrentPosition(
      pos => done(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'gps-high'),
      err => {
        navigator.geolocation.getCurrentPosition(
          pos => done(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'network'),
          err2 => reject({ code: err2.code, message: lang==='ar' ? 'فشل الحصول على الموقع الجغرافي' : 'Failed to obtain GPS location' }),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/* ============================================================================
   COMPONENT
============================================================================ */
function Attendance({ t, lang, user }) {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [time, setTime]             = useState('');
  const [date, setDate]             = useState('');
  const [gpsState, setGpsState]     = useState('idle'); // idle | loading | success | error
  const [gpsMsg,   setGpsMsg]       = useState('');
  const [gpsMethod,setGpsMethod]    = useState('');
  const [distance, setDistance]     = useState(null);

  const dir = lang==='ar' ? 'rtl' : 'ltr';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [attData, empData, deptData] = await Promise.all([
        (user.role === 'employee'
          ? attendanceService.getMyAttendance()
          : attendanceService.getAttendanceLogs()
        ).catch(() => []),
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
  }, [user.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Clock */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(lang==='ar'?'ar-EG':'en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}));
      setDate(now.toLocaleDateString(lang==='ar'?'ar-EG':'en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'}));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lang]);

  /* Employee data */
  const today      = new Date().toISOString().split('T')[0];
  const myRecord   = attendance.find(a => (a.employeeId === user.employeeId || a.employeeId === user.id) && a.date === today)
                  || attendance.find(a => a.employeeId === user.employeeId || a.employeeId === user.id);
  const checkedIn  = !!myRecord?.checkIn;
  const checkedOut = !!myRecord?.checkOut;
  const myEmp      = employees.find(e => e.id === user.employeeId || e.id === user.id);
  const myDept     = departments.find(d => d.id === myEmp?.departmentId || d.name === myEmp?.department);

  const STATUS_META = {
    present: { label:lang==='ar'?'حاضر':'Present',  color:'#14532D', bg:'#DCFCE7', border:'#BBF7D0' },
    late:    { label:lang==='ar'?'متأخر':'Late',    color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
    left:    { label:lang==='ar'?'انصرف':'Left',    color:'#1565C0', bg:'#DBEAFE', border:'#BFDBFE' },
    absent:  { label:lang==='ar'?'غائب':'Absent',   color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
  };

  /* Main check-in handler */
  const handleCheckIn = useCallback(async () => {
    if (checkedIn || gpsState==='loading') return;
    setGpsState('loading');
    setGpsMsg('');
    setDistance(null);

    try {
      const { lat, lng, accuracy, method } = await resolveLocation(lang);
      const dist = calcDistance(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
      setDistance(Math.round(dist));
      setGpsMethod(method);

      const allowedRadius = CAMPUS_RADIUS;

      if (dist > allowedRadius) {
        setGpsState('error');
        setGpsMsg(lang==='ar'
          ? `❌ أنت خارج نطاق الجامعة\nالمسافة: ${Math.round(dist)} متر — المسموح: ${CAMPUS_RADIUS} متر`
          : `❌ Outside campus range\nDistance: ${Math.round(dist)}m — Allowed: ${CAMPUS_RADIUS}m`);
        return;
      }

      await attendanceService.checkIn({
        latitude: lat,
        longitude: lng,
        gpsAccuracy: accuracy,
        resolutionMethod: method
      });

      setGpsState('success');
      const methodLabel = {
        'gps-high': lang==='ar'?'GPS':'GPS',
        'network':  lang==='ar'?'شبكة الإنترنت':'Network',
      };
      setGpsMsg(lang==='ar'
        ? `✅ تم التحقق من موقعك (${methodLabel[method]}) — المسافة ${Math.round(dist)} متر`
        : `✅ Location verified (${methodLabel[method]}) — ${Math.round(dist)}m from campus`);
      loadData();

    } catch ({ code, message }) {
      setGpsState('error');
      setGpsMsg(message || (lang==='ar' ? 'فشل تسجيل الحضور' : 'Check-in failed'));
    }
  }, [checkedIn, gpsState, lang, loadData]);

  /* Check-out */
  async function handleCheckOut() {
    if (!myRecord?.id) return;
    try {
      await attendanceService.checkOut(myRecord.id);
      setGpsState('idle');
      setGpsMsg('');
      loadData();
    } catch (err) {
      setGpsState('error');
      setGpsMsg(err.message || (lang==='ar' ? 'فشل تسجيل الانصراف' : 'Check-out failed'));
    }
  }

  /* Steps */
  const steps = [
    {label:{ar:'تسجيل الحضور',en:'Check In'},   done:checkedIn,             time:myRecord?.checkIn,  color:'#14532D',bg:'#DCFCE7',icon:'✅'},
    {label:{ar:'في العمل',     en:'Working'},    done:checkedIn&&!checkedOut,time:null,                color:'#1565C0',bg:'#EFF6FF',icon:'💼'},
    {label:{ar:'الانصراف',en:'Check Out'}, done:checkedOut, time:myRecord?.checkOut, color:'#991B1B', bg:'#FEE2E2', icon:'🚪'},
  ];

  /* Method badge color */
  const methodColors = {
    'gps-high':{ bg:'#DCFCE7', color:'#166534', label:{ar:'GPS دقيق',  en:'Precise GPS'} },
    'network': { bg:'#DBEAFE', color:'#1565C0', label:{ar:'شبكة',      en:'Network'} },
  };

  /* ── Style helpers ── */
  const thS = { background:'#F8FAFC', padding:'12px 16px', textAlign:'center', fontWeight:'700', color:'#475569', fontSize:'13px', borderBottom:'1.5px solid #E2E8F0', whiteSpace:'nowrap', position:'sticky', top:0, zIndex:1 };
  const tdS = (x={}) => ({ padding:'12px 16px', borderBottom:'1px solid #F8FAFC', fontSize:'13px', textAlign:'center', verticalAlign:'middle', ...x });

  const myStatus = myRecord ? STATUS_META[myRecord.status] : null;

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={{padding:'24px',fontFamily:'Cairo, sans-serif',direction:dir}}>

      {/* ── Insecure-origin warning banner ── */}
      {(user.role==='employee'||user.role==='hr') && !isSecureOrigin() && (
        <div style={{marginBottom:'16px',padding:'13px 18px',borderRadius:'12px',background:'#FEF3C7',border:'1px solid #FDE68A',color:'#92400E',fontSize:'12.5px',fontWeight:'600',lineHeight:1.7,display:'flex',gap:'10px',alignItems:'flex-start'}}>
          <span style={{fontSize:'16px',flexShrink:0}}>⚠️</span>
          <span>{lang==='ar'
            ? 'تنبيه: النظام مفتوح عبر اتصال غير آمن (HTTP)، وتحديد الموقع لن يعمل على هذا الجهاز. افتح النظام عبر رابط https لتسجيل الحضور.'
            : 'Notice: the system is opened over an insecure (HTTP) connection, so location won\'t work on this device. Open it via an https link to check in.'}</span>
        </div>
      )}

      {/* ══ EMPLOYEE VIEW ══ */}
      {/* ══ EMPLOYEE VIEW ══ */}
      {(user.role==='employee'||user.role==='hr') && (
        <>
          {/* ── Check-in Card ── */}
          <div style={{borderRadius:'16px',overflow:'hidden',marginBottom:'18px',boxShadow:'0 4px 16px rgba(13,59,122,.12)'}}>

            {/* Gradient header */}
            <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
              {/* Employee */}
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'46px',height:'46px',borderRadius:'13px',background:'rgba(255,255,255,.15)',border:'2px solid rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px',fontWeight:'900',color:'white',flexShrink:0}}>
                  {(lang==='en'?myEmp?.nameEn:myEmp?.name)?.charAt(0)||'?'}
                </div>
                <div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginBottom:'2px'}}>{lang==='ar'?'تسجيل الحضور والانصراف':'Attendance Check-in'}</div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:'white'}}>{lang==='en'?myEmp?.nameEn:myEmp?.name}</div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,.6)',marginTop:'2px'}}>{user?.role==='hr'?(lang==='en'?'HR Manager':'موارد بشرية'):(lang==='en'?myDept?.nameEn:myDept?.name)}</div>
                </div>
              </div>
              {/* Right: status + clock */}
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                {myStatus
                  ? <span style={{background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.25)',padding:'5px 16px',borderRadius:'999px',fontSize:'13px',fontWeight:'700',whiteSpace:'nowrap'}}>
                      {myStatus.label}{myRecord?.checkIn&&` · ${myRecord.checkIn}`}
                    </span>
                  : <span style={{background:'rgba(255,255,255,.1)',color:'rgba(255,255,255,.65)',padding:'5px 14px',borderRadius:'999px',fontSize:'12px',fontWeight:'600',border:'1px solid rgba(255,255,255,.15)',whiteSpace:'nowrap'}}>
                      {lang==='ar'?'لم تسجل بعد':'Not checked in'}
                    </span>
                }
                <div style={{width:'1px',height:'32px',background:'rgba(255,255,255,.2)'}}/>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'22px',fontWeight:'800',color:'white',direction:'ltr',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{time}</div>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,.5)',marginTop:'2px',letterSpacing:'.3px'}}>{lang==='ar'?'الوقت الحالي':'CURRENT TIME'}</div>
                </div>
              </div>
            </div>

            {/* White body */}
            <div style={{background:'white'}}>

              {/* Progress steps */}
              <div style={{padding:'22px 40px',borderBottom:'1px solid #F1F5F9'}}>
                <div style={{display:'flex',alignItems:'center'}}>
                  {steps.map((s,i)=>(
                    <React.Fragment key={i}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',flexShrink:0,width:'90px'}}>
                        <div style={{width:'44px',height:'44px',borderRadius:'50%',background:s.done?s.bg:'#F8FAFC',border:`2px solid ${s.done?s.color:'#E2E8F0'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',transition:'all .4s',boxShadow:s.done?`0 4px 12px ${s.color}33`:'none'}}>
                          {s.done?s.icon:<span style={{fontSize:'14px',color:'#CBD5E1',fontWeight:'700'}}>{i+1}</span>}
                        </div>
                        <div style={{fontSize:'11px',fontWeight:'700',color:s.done?s.color:'#94A3B8',textAlign:'center'}}>{s.label[lang]}</div>
                        {s.time&&<div style={{fontSize:'11px',fontWeight:'800',color:s.color,direction:'ltr'}}>{s.time}</div>}
                      </div>
                      {i<steps.length-1&&(
                        <div style={{flex:1,height:'3px',borderRadius:'999px',marginBottom:'22px',transition:'background .5s',
                          background:(i===0&&checkedIn)||(i===1&&checkedOut)?'linear-gradient(90deg,#1565C0,#1E88E5)':'#F1F5F9'}}/>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{padding:'18px 24px',display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
                {/* Check In */}
                <button onClick={handleCheckIn} disabled={checkedIn||gpsState==='loading'}
                  style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 32px',borderRadius:'10px',minWidth:'180px',justifyContent:'center',fontFamily:'Cairo',fontSize:'14px',fontWeight:'700',transition:'all .2s',cursor:checkedIn||gpsState==='loading'?'not-allowed':'pointer',
                    background:checkedIn?'#F0FDF4':gpsState==='loading'?'#EFF6FF':'#166534',
                    color:checkedIn?'#166534':gpsState==='loading'?'#1565C0':'white',
                    border:checkedIn?'1.5px solid #BBF7D0':gpsState==='loading'?'1.5px solid #BFDBFE':'1.5px solid transparent',
                    boxShadow:checkedIn||gpsState==='loading'?'none':'0 4px 14px rgba(22,101,52,.25)'}}>
                  {gpsState==='loading'?<>
                    <svg style={{animation:'spin 1s linear infinite'}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    {lang==='ar'?'جارٍ التحقق...':'Verifying...'}
                  </>:checkedIn?<>
                    ✅ {lang==='ar'?`حاضر · ${myRecord?.checkIn}`:`Present · ${myRecord?.checkIn}`}
                  </>:<>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {lang==='ar'?'تسجيل الحضور':'Check In'}
                  </>}
                </button>

                {/* Check Out */}
                <button onClick={handleCheckOut} disabled={!checkedIn||checkedOut}
                  style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 32px',borderRadius:'10px',minWidth:'180px',justifyContent:'center',fontFamily:'Cairo',fontSize:'14px',fontWeight:'700',transition:'all .2s',cursor:!checkedIn||checkedOut?'not-allowed':'pointer',
                    background:checkedOut?'#EFF6FF':!checkedIn?'#F8FAFC':'#991B1B',
                    color:checkedOut?'#1565C0':!checkedIn?'#CBD5E1':'white',
                    border:checkedOut?'1.5px solid #BFDBFE':!checkedIn?'1.5px solid #E2E8F0':'1.5px solid transparent',
                    boxShadow:!checkedIn||checkedOut?'none':'0 4px 14px rgba(153,27,27,.25)'}}>
                  {checkedOut?<>🚪 {lang==='ar'?`انصرفت · ${myRecord?.checkOut}`:`Left · ${myRecord?.checkOut}`}</>:<>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={!checkedIn?'#CBD5E1':'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    {lang==='ar'?'تسجيل الانصراف':'Check Out'}
                  </>}
                </button>
              </div>

              {/* GPS message */}
              {gpsMsg&&(
                <div style={{margin:'0 20px 16px',padding:'11px 16px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',whiteSpace:'pre-line',lineHeight:1.6,
                  background:gpsState==='success'?'#F0FDF4':gpsState==='error'?'#FEF2F2':'#EFF6FF',
                  color:gpsState==='success'?'#166534':gpsState==='error'?'#DC2626':'#1565C0',
                  border:`1px solid ${gpsState==='success'?'#BBF7D0':gpsState==='error'?'#FECACA':'#BFDBFE'}`}}>
                  {gpsMsg}
                </div>
              )}

              {/* Method badge */}
              {gpsState==='success'&&gpsMethod&&methodColors[gpsMethod]&&(
                <div style={{padding:'0 20px 14px',display:'flex',justifyContent:'center'}}>
                  <span style={{background:methodColors[gpsMethod].bg,color:methodColors[gpsMethod].color,padding:'3px 12px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>
                    📡 {methodColors[gpsMethod].label[lang]}
                  </span>
                </div>
              )}

              {/* Help */}
              {!checkedIn&&gpsState!=='loading'&&(
                <div style={{padding:'0 24px 14px',textAlign:'center',fontSize:'11px',color:'#94A3B8',lineHeight:1.6}}>
                  🔒 {lang==='ar'?'يتطلب تواجدك داخل نطاق الجامعة (500 متر)':'Requires being within 500m of campus'}
                </div>
              )}
            </div>
          </div>

          {/* ── My Attendance History ── */}
          <div style={{background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #F1F5F9',fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>
              📅 {lang==='ar' ? 'سجل حضوري' : 'My Attendance'}
            </div>
            <div style={{overflowX:'auto',maxHeight:'380px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
                    <th style={thS}>{lang==='ar'?'الحضور':'Check In'}</th>
                    <th style={thS}>{lang==='ar'?'الانصراف':'Check Out'}</th>
                    <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.filter(a => a.employeeId===user.employeeId).map((a,idx) => {
                    const sm = STATUS_META[a.status];
                    return (
                      <tr key={a.id} style={{background:idx%2===0?'white':'#FAFBFC'}}>
                        <td style={tdS({direction:'ltr',color:'#64748B'})}>{a.date}</td>
                        <td style={tdS({direction:'ltr',color:'#14532D',fontWeight:'700'})}>{a.checkIn||'—'}</td>
                        <td style={tdS({direction:'ltr',color:'#1565C0',fontWeight:'700'})}>{a.checkOut||'—'}</td>
                        <td style={tdS()}>
                          <span style={{background:sm?.bg,color:sm?.color,border:`1px solid ${sm?.border}`,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{sm?.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ HEAD / ADMIN VIEW ══ */}
      {(user.role!=='employee'&&user.role!=='hr') && (
        <>
        {/* Unified hero */}
        <div style={{borderRadius:'16px',marginBottom:'18px',overflow:'hidden',boxShadow:'0 4px 16px rgba(13,59,122,.15)'}}>
          <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px'}}>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginBottom:'4px'}}>{user.role==='head'?(lang==='ar'?'لوحة رئيس القسم':'Head Dashboard'):(lang==='ar'?'لوحة التحكم':'Dashboard')}</div>
            <h1 style={{margin:0,fontSize:'22px',fontWeight:'800',color:'white'}}>{lang==='ar'?'سجل الحضور والانصراف':'Attendance Log'}</h1>
            <p style={{margin:'4px 0 0',color:'rgba(255,255,255,.6)',fontSize:'12px'}}>{date}</p>
          </div>
        </div>

        <div style={{background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          <div style={{padding:'13px 18px',borderBottom:'1px solid #F1F5F9',fontSize:'14px',fontWeight:'800',color:'#0F172A'}}>
            {t.todayLog || (lang==='ar'?'سجل الحضور اليوم':"Today's Attendance")}
          </div>
          <div style={{overflowX:'auto',maxHeight:'420px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{...thS,textAlign:lang==='ar'?'right':'left'}}>{t.name||'الاسم'}</th>
                  <th style={thS}>{t.department||'القسم'}</th>
                  <th style={thS}>{lang==='ar'?'الحضور':'Check In'}</th>
                  <th style={thS}>{lang==='ar'?'الانصراف':'Check Out'}</th>
                  <th style={thS}>{t.status||'الحالة'}</th>
                </tr>
              </thead>
              <tbody>
                {attendance
                  .filter(a => {
                    if (user.role==='head') {
                      const e = employees.find(x => x.id===a.employeeId || x.name===a.employeeName);
                      return e && (e.departmentId===user.departmentId || e.department===user.department);
                    }
                    return true;
                  })
                  .map((a,idx) => {
                    const emp  = employees.find(e => e.id===a.employeeId || e.name===a.employeeName);
                    const dept = departments.find(d => d.id===emp?.departmentId || d.name===(emp?.department || a.department));
                    const sm   = STATUS_META[a.status];
                    const empName = (lang==='en' ? (emp?.nameEn || a.employeeName) : (emp?.name || a.employeeName)) || a.employeeName || '—';
                    const deptName = (lang==='en' ? (dept?.nameEn || a.department) : (dept?.name || a.department)) || a.department || '—';
                    return (
                      <tr key={a.id || idx}
                        style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                        onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                        <td style={tdS({textAlign:lang==='ar'?'right':'left',fontWeight:'700',color:'#0F172A'})}>{empName}</td>
                        <td style={tdS({color:'#1565C0',fontWeight:'600',fontSize:'12px'})}>{deptName}</td>
                        <td style={tdS({direction:'ltr',color:'#14532D',fontWeight:'700'})}>{a.checkIn||'—'}</td>
                        <td style={tdS({direction:'ltr',color:'#1565C0',fontWeight:'700'})}>{a.checkOut||'—'}</td>
                        <td style={tdS()}>
                          <span style={{background:sm?.bg||'#F1F5F9',color:sm?.color||'#475569',border:`1px solid ${sm?.border||'#E2E8F0'}`,padding:'3px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>{sm?.label||a.status}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

export default Attendance;