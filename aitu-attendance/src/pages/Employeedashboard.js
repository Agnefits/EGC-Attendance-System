import { calcUsedPermsMins, getLeaveYearPeriod } from './leaveValidation';
import useNotifications from './useNotifications';
import React, { useState, useEffect, useRef } from 'react';
import { attendanceService, employeesService, leavesService, permissionsService, structureService, scheduleService } from '../services';

const ATT={
  present:{l:{ar:'حاضر', en:'Present'},c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0',dot:'#16A34A'},
  late:   {l:{ar:'متأخر',en:'Late'},   c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A',dot:'#D97706'},
  left:   {l:{ar:'انصرف',en:'Left'},   c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE',dot:'#1565C0'},
  absent: {l:{ar:'غائب', en:'Absent'}, c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA',dot:'#DC2626'},
};
const LV={
  annual:      {l:{ar:'اعتيادي',  en:'Annual'},     c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE',dot:'#1565C0'},
  sick:        {l:{ar:'مرضية',    en:'Sick'},        c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA',dot:'#DC2626'},
  urgent:      {l:{ar:'عارضة',    en:'Urgent'},      c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A',dot:'#D97706'},
  maternity:   {l:{ar:'وضع',      en:'Maternity'},   c:'#BE185D',bg:'#FCE7F3',bd:'#FBCFE8',dot:'#BE185D'},
  compensatory:{l:{ar:'بدل راحة',en:'Comp'},         c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE',dot:'#6B21A8'},
  grant:       {l:{ar:'منحة',     en:'Grant'},       c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0',dot:'#16A34A'},
  unpaid:      {l:{ar:'بدون راتب',en:'Unpaid'},      c:'#374151',bg:'#F3F4F6',bd:'#D1D5DB',dot:'#64748B'},
};
const ROLE={
  academic:       {l:{ar:'أكاديمي',  en:'Academic'},c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE'},
  administrative: {l:{ar:'إداري',    en:'Admin'},    c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A'},
  head_department:{l:{ar:'رئيس قسم',en:'Head'},     c:'#166534',bg:'#DCFCE7',bd:'#BBF7D0'},
  dean:           {l:{ar:'عميد',     en:'Dean'},     c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE'},
  employee:       {l:{ar:'موظف',     en:'Employee'}, c:'#374151',bg:'#F3F4F6',bd:'#D1D5DB'},
};
const MN={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const DN={ar:['أح','اث','ث','أر','خ','ج','س'],en:['Su','Mo','Tu','We','Th','Fr','Sa']};
const DAYS={ar:['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']};

function Badge({c,bg,bd,children}){
  return <span style={{background:bg,color:c,border:`1px solid ${bd}`,padding:'4px 11px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>{children}</span>;
}
function Donut({pct,color,size=80,stroke=9,label}){
  const R=(size-stroke*2)/2,C=2*Math.PI*R,cx=size/2,cy=size/2;
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#F1F5F9" strokeWidth={stroke}/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C-(C*Math.min(pct,100)/100)}
          style={{transform:`rotate(-90deg)`,transformOrigin:`${cx}px ${cy}px`,transition:'stroke-dashoffset 1.2s ease'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>{label}</div>
    </div>
  );
}

function WeekSummary({lang,dir,schedule,card,mini=false}){
  const [activeWeekTab, setActiveWeekTab] = React.useState('week');
  const [exams, setExams] = React.useState([]);
  const [addExamOpen, setAddExamOpen] = React.useState(false);
  const [newExam, setNewExam] = React.useState({title:'',date:'',time:'',room:'',notes:''});
  const [examErr, setExamErr] = React.useState('');

  // Load exams from the API and map backend fields to what this component reads.
  const loadExams = async () => {
    try {
      const data = await scheduleService.getMyExams();
      const mapped = (Array.isArray(data) ? data : []).map(e => ({
        id: e.id ?? e.Id,
        title: e.title ?? e.Title ?? '',
        date: e.date ?? e.Date ?? '',
        time: e.timeSlot ?? e.TimeSlot ?? '',
        room: e.roomLocation ?? e.RoomLocation ?? '',
        notes: e.notes ?? e.Notes ?? '',
      }));
      setExams(mapped);
    } catch (e) { console.error(e); }
  };

  React.useEffect(() => {
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveExam = async () => {
    if(!newExam.title.trim()){setExamErr(lang==='ar'?'أدخل اسم الامتحان':'Enter exam name');return;}
    if(!newExam.date){setExamErr(lang==='ar'?'اختر التاريخ':'Select date');return;}
    try {
      await scheduleService.createExam({
        title: newExam.title.trim(),
        date: newExam.date,
        timeSlot: newExam.time || '',
        roomLocation: newExam.room || '',
        notes: newExam.notes || '',
      });
      setAddExamOpen(false); setExamErr('');
      setNewExam({title:'',date:'',time:'',room:'',notes:''});
      await loadExams();
    } catch (e) {
      setExamErr(e?.message || (lang==='ar'?'فشل حفظ الامتحان':'Failed to save exam'));
    }
  };

  const deleteExam = async (id) => {
    try { await scheduleService.deleteExam(id); await loadExams(); }
    catch (e) { console.error(e); }
  };

  const nextWeekDays = Array.from({length:7}).map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()+1+i);
    return {date:d.toISOString().slice(0,10),dayName:DAYS[lang][d.getDay()],dayNum:d.getDate(),isWeekend:d.getDay()===5};
  }).filter(d=>!d.isWeekend);

  const weekWithSlots = nextWeekDays.map(d=>{
    const slots=schedule.find(s=>s.day===new Date(d.date).getDay())?.entries||[];
    return {...d,slots};
  });

  const hasSlots = weekWithSlots.some(d=>d.slots.length>0);

  return(
    <div style={{...card,overflow:'hidden',borderInlineStart:'3px solid #6B21A8'}}>
      <div style={{padding:mini?'10px 14px':'14px 20px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:'3px',background:'#F1F5F9',padding:'3px',borderRadius:'9px'}}>
          {[{id:'week',l:{ar:'الأسبوع القادم',en:'Next Week'}},{id:'exams',l:{ar:'جدول الامتحانات',en:'Exams'}}].map(t=>(
            <button key={t.id} onClick={()=>setActiveWeekTab(t.id)}
              style={{padding:'6px 14px',border:'none',borderRadius:'7px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s',
                background:activeWeekTab===t.id?'white':'transparent',
                color:activeWeekTab===t.id?'#6B21A8':'#64748B',
                boxShadow:activeWeekTab===t.id?'0 1px 4px rgba(0,0,0,.1)':'none'}}>
              {t.id==='week'?'📅':'📝'} {t.l[lang]}
            </button>
          ))}
        </div>
        {activeWeekTab==='exams'&&(
          <button onClick={()=>{setAddExamOpen(true);setNewExam({title:'',date:'',time:'',room:'',notes:''});setExamErr('');}}
            style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'#6B21A8',color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}
            onMouseEnter={e=>e.currentTarget.style.background='#7C3AED'}
            onMouseLeave={e=>e.currentTarget.style.background='#6B21A8'}>
            + {lang==='ar'?'إضافة امتحان':'Add Exam'}
          </button>
        )}
      </div>

      {activeWeekTab==='week'&&(
        <div style={{padding:mini?'10px 12px':'14px 16px'}}>
          {!hasSlots?(
            <div style={{textAlign:'center',padding:mini?'12px':'24px',color:'#94A3B8'}}>
              <div style={{fontSize:mini?'22px':'32px',marginBottom:'6px'}}>📅</div>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#475569'}}>{lang==='ar'?'لا توجد حصص الأسبوع القادم':'No slots next week'}</div>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fill,minmax(${mini?'80px':'120px'},1fr))`,gap:'6px'}}>
              {weekWithSlots.map(d=>(
                <div key={d.date} style={{borderRadius:'10px',border:'1px solid #E8EDF5',overflow:'hidden',background:d.slots.length>0?'white':'#FAFBFC'}}>
                  <div style={{padding:'7px 10px',background:d.slots.length>0?'#EDE9FE':'#F8FAFC',borderBottom:'1px solid #E8EDF5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'12px',fontWeight:'800',color:d.slots.length>0?'#6B21A8':'#94A3B8'}}>{d.dayName}</span>
                    <span style={{fontSize:'10px',color:d.slots.length>0?'#6B21A8':'#CBD5E1',fontWeight:'600'}}>{d.dayNum}</span>
                  </div>
                  <div style={{padding:'6px',display:'flex',flexDirection:'column',gap:'4px',minHeight:'50px'}}>
                    {d.slots.length===0
                      ?<div style={{textAlign:'center',padding:'8px 0',color:'#E2E8F0',fontSize:'16px'}}>—</div>
                      :d.slots.map(sl=>(
                        <div key={sl.id} style={{padding:'5px 7px',borderRadius:'7px',background:`${sl.color}15`,borderInlineStart:`2px solid ${sl.color}`}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:sl.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sl.subject}</div>
                          <div style={{fontSize:'9px',color:'#64748B',direction:'ltr'}}>{sl.from}–{sl.to}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeWeekTab==='exams'&&(
        <div style={{padding:'14px 16px'}}>
          {exams.length===0?(
            <div style={{textAlign:'center',padding:'24px',color:'#94A3B8'}}>
              <div style={{fontSize:'32px',marginBottom:'8px'}}>📝</div>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#475569'}}>{lang==='ar'?'لا توجد امتحانات مضافة':'No exams added yet'}</div>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:'8px',maxHeight:'260px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {exams.sort((a,b)=>a.date.localeCompare(b.date)).map(ex=>{
                const isPast=ex.date<new Date().toISOString().slice(0,10);
                const isToday=ex.date===new Date().toISOString().slice(0,10);
                return(
                  <div key={ex.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'11px',border:`1px solid ${isToday?'#6B21A8':isPast?'#E2E8F0':'#DDD6FE'}`,background:isToday?'#F5F3FF':isPast?'#FAFBFC':'white',opacity:isPast?.6:1}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:isToday?'#6B21A8':isPast?'#F1F5F9':'#EDE9FE',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <div style={{fontSize:'14px',fontWeight:'900',color:isToday?'white':isPast?'#94A3B8':'#6B21A8',lineHeight:1}}>{new Date(ex.date).getDate()}</div>
                      <div style={{fontSize:'8px',color:isToday?'rgba(255,255,255,.7)':isPast?'#CBD5E1':'#9CA3AF',fontWeight:'600'}}>{MN[lang][new Date(ex.date).getMonth()]?.slice(0,3)}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:'700',color:isPast?'#94A3B8':'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ex.title}</div>
                      <div style={{fontSize:'11px',color:'#64748B',marginTop:'2px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        {ex.time&&<span style={{direction:'ltr'}}>🕐 {ex.time}</span>}
                        {ex.room&&<span>🏫 {ex.room}</span>}
                      </div>
                      {ex.notes&&<div style={{fontSize:'10px',color:'#94A3B8',marginTop:'2px'}}>{ex.notes}</div>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
                      {isToday&&<span style={{background:'#6B21A8',color:'white',padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontWeight:'700'}}>{lang==='ar'?'اليوم':'Today'}</span>}
                      {isPast&&<span style={{background:'#F1F5F9',color:'#94A3B8',padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontWeight:'700'}}>{lang==='ar'?'انتهى':'Done'}</span>}
                      <button onClick={()=>deleteExam(ex.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#CBD5E1',fontSize:'14px',lineHeight:1,transition:'color .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.color='#DC2626'}
                        onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {addExamOpen&&(
        <div onClick={()=>setAddExamOpen(false)} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'18px',width:'100%',maxWidth:'400px',overflow:'hidden',direction:dir,fontFamily:'Cairo',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{background:'linear-gradient(135deg,#4C1D95,#6B21A8)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'15px',fontWeight:'800',color:'white'}}>📝 {lang==='ar'?'إضافة امتحان':'Add Exam'}</span>
              <button onClick={()=>setAddExamOpen(false)} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.2)',borderRadius:'7px',padding:'5px 11px',cursor:'pointer',color:'white',fontFamily:'Cairo',fontWeight:'700',fontSize:'12px'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>✕</button>
            </div>
            <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:'12px'}}>
              {[
                {key:'title',label:{ar:'اسم المادة / الامتحان',en:'Subject / Exam'},ph:{ar:'مثال: رياضيات — امتحان نهائي',en:'e.g. Math — Final'},type:'text',req:true},
                {key:'room', label:{ar:'القاعة',en:'Room'},                         ph:{ar:'مثال: B201',en:'e.g. B201'},           type:'text',req:false},
                {key:'notes',label:{ar:'ملاحظات',en:'Notes'},                       ph:{ar:'الفصل الأول + الثاني',en:'Chapters 1-4'},type:'text',req:false},
              ].map(f=>(
                <div key={f.key}>
                  <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'6px'}}>{f.label[lang]}{f.req?' *':''}</label>
                  <input value={newExam[f.key]} onChange={e=>setNewExam(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph[lang]}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',transition:'border-color .15s'}}
                    onFocus={e=>e.target.style.borderColor='#6B21A8'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'6px'}}>{lang==='ar'?'التاريخ':'Date'} *</label>
                  <input type="date" value={newExam.date} onChange={e=>setNewExam(p=>({...p,date:e.target.value}))}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',direction:'ltr'}}
                    onFocus={e=>e.target.style.borderColor='#6B21A8'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'6px'}}>{lang==='ar'?'الوقت':'Time'}</label>
                  <input type="time" value={newExam.time} onChange={e=>setNewExam(p=>({...p,time:e.target.value}))}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',direction:'ltr'}}
                    onFocus={e=>e.target.style.borderColor='#6B21A8'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
              </div>
              {examErr&&<div style={{padding:'8px 12px',background:'#FEE2E2',borderRadius:'8px',color:'#DC2626',fontSize:'12px',fontWeight:'700',border:'1px solid #FECACA'}}>⚠️ {examErr}</div>}
            </div>
            <div style={{padding:'14px 22px',borderTop:'1px solid #F1F5F9',display:'flex',gap:'10px',background:'#F8FAFC'}}>
              <button onClick={()=>setAddExamOpen(false)}
                style={{flex:1,padding:'10px',background:'white',color:'#475569',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}
                onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                {lang==='ar'?'إلغاء':'Cancel'}
              </button>
              <button onClick={saveExam}
                style={{flex:2,padding:'10px',background:'linear-gradient(135deg,#4C1D95,#6B21A8)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',boxShadow:'0 4px 12px rgba(107,33,168,.3)'}}>
                📝 {lang==='ar'?'إضافة الامتحان':'Add Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeDashboard({lang,user,setActivePage}){
  const dir=lang==='ar'?'rtl':'ltr';

  const [employees, setEmployees]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges]       = useState([]);
  const [attendance, setAttendance]   = useState([]);
  const [leavesList, setLeavesList]   = useState([]);
  const [permsList, setPermsList]     = useState([]);
  const [loading, setLoading]         = useState(true);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [empData, deptData, colData, attData, leaveData, permData] = await Promise.all([
        employeesService.getEmployees().catch(() => []),
        structureService.getDepartments().catch(() => []),
        structureService.getColleges().catch(() => []),
        attendanceService.getMyAttendance().catch(() => []),
        leavesService.getMyLeaves().catch(() => []),
        permissionsService.getMyPermissions().catch(() => [])
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setColleges(Array.isArray(colData) ? colData : []);
      setAttendance(Array.isArray(attData) ? attData : []);
      setLeavesList(Array.isArray(leaveData) ? leaveData : []);
      setPermsList(Array.isArray(permData) ? permData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const emp = employees.find(e=>e.id===user?.employeeId || e.id===user?.id) || { name: user?.name, email: user?.email };
  const dept= departments.find(d=>d.id===emp?.departmentId || d.name===emp?.department);
  const col = colleges.find(c=>c.id===emp?.collegeId || c.name===emp?.college);
  const role= ROLE[emp?.type||user?.role||'employee'];

  const [time,setTime]=useState('');
  const [greet,setGreet]=useState('');
  const [notifOpen,setNotifOpen]=useState(false);
  const [calM,setCalM]=useState(new Date().getMonth());
  const [calY,setCalY]=useState(new Date().getFullYear());
  const [selDay,setSelDay]=useState(null);
  const [tab,setTab]=useState('cal');
  const [tasks,setTasks]=useState([
    {id:1,title:{ar:'اجتماع القسم',en:'Dept Meeting'},   date:'2026-06-03',time:'09:00',type:'meeting',done:false,remind:true},
    {id:2,title:{ar:'تسليم التقرير',en:'Monthly Report'},date:'2026-06-10',time:'14:00',type:'task',   done:false,remind:true},
    {id:3,title:{ar:'مراجعة المشروع',en:'Project Review'},date:'2026-06-15',time:'11:00',type:'meeting',done:true,remind:false},
  ]);
  const [addOpen,setAddOpen]=useState(false);
  const [newT,setNewT]=useState({title:'',date:'',time:'',type:'task',remind:false});
  const [tErr,setTErr]=useState('');
  const notRef=useRef(null);

  // ── Schedule ──
  const rank      = emp?.academicRank||'';
  const isDemo    = rank.includes('معيد')||rank.includes('مدرس مساعد')||rank.includes('Demonstrator')||rank.includes('Asst');
  const schedTitle= isDemo?{ar:'جدول السكاشن',en:'Sections Schedule'}:{ar:'جدول المحاضرات',en:'Lectures Schedule'};
  const SLOT_COLORS=['#1565C0','#166534','#B45309','#6B21A8','#0891B2','#991B1B'];
  const SCHEDULE_DAYS=[0,1,2,3,4,6];
  const [schedule,setSchedule]=useState(SCHEDULE_DAYS.map(d=>({day:d,entries:[]})));
  const [addSlotOpen,setAddSlotOpen]=useState(false);
  const [newSlot,setNewSlot]=useState({day:0,from:'08:00',to:'09:00',subject:'',room:'',group:''});
  const [slotErr,setSlotErr]=useState('');

  // Build the grouped-by-day shape the UI expects from the flat API rows.
  // Backend times are TimeOnly -> "HH:mm:ss"; trim to "HH:mm".
  const timeHHMM=(t)=> t ? String(t).slice(0,5) : '';
  const buildSchedule=(sessions)=>SCHEDULE_DAYS.map(d=>({
    day:d,
    entries:(Array.isArray(sessions)?sessions:[])
      .filter(s=>Number(s.dayOfWeek ?? s.DayOfWeek)===d)
      .map((s,i)=>({
        id:s.id ?? s.Id,
        subject:s.subject ?? s.Subject ?? '',
        from:timeHHMM(s.startTime ?? s.StartTime),
        to:timeHHMM(s.endTime ?? s.EndTime),
        room:s.room ?? s.Room ?? '',
        group:s.groupName ?? s.GroupName ?? '',
        color:SLOT_COLORS[i%SLOT_COLORS.length],
      })),
  }));

  const loadSessions=async()=>{
    try{
      const data=await scheduleService.getMySessions();
      setSchedule(buildSchedule(data));
    }catch(e){ console.error(e); }
  };

  async function addSlot(){
    if(!newSlot.subject.trim()){setSlotErr(lang==='ar'?'أدخل اسم المادة':'Enter subject');return;}
    if(newSlot.to<=newSlot.from){setSlotErr(lang==='ar'?'وقت النهاية يجب أن يكون بعد البداية':'End must be after start');return;}
    try{
      await scheduleService.createSession({
        subject:newSlot.subject.trim(),
        dayOfWeek:newSlot.day,
        startTime:newSlot.from,
        endTime:newSlot.to,
        groupName:newSlot.group||'',
        room:newSlot.room||'',
      });
      setAddSlotOpen(false);setNewSlot({day:0,from:'08:00',to:'09:00',subject:'',room:'',group:''});setSlotErr('');
      await loadSessions();
    }catch(e){
      setSlotErr(e?.message||(lang==='ar'?'فشل حفظ الحصة':'Failed to save session'));
    }
  }
  async function removeSlot(di,id){
    try{
      await scheduleService.deleteSession(id);
      await loadSessions();
    }catch(e){ console.error(e); }
  }

  const { notifs: NOTIFS, unread } = useNotifications({ user, lang });

  useEffect(()=>{
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const tick=()=>{
      const now=new Date(),h=now.getHours();
      setTime(now.toLocaleTimeString(lang==='ar'?'ar-EG':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}));
      setGreet(lang==='ar'?(h<12?'صباح الخير 🌅':h<17?'مساء الخير ☀️':'مساء النور 🌙'):(h<12?'Good Morning 🌅':h<17?'Good Afternoon ☀️':'Good Evening 🌙'));
    };
    tick();const t=setInterval(tick,1000);return()=>clearInterval(t);
  },[lang]);

  useEffect(()=>{
    const fn=e=>{if(notRef.current&&!notRef.current.contains(e.target))setNotifOpen(false);};
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[]);

  const EMPLOYEES = employees;
  const ATTENDANCE = attendance;
  // Normalize backend field names (leaveTypeId/fromDate/toDate/daysCount/status)
  // to what this component reads (type/from/to/days). The /Leave/requests/my
  // endpoint already scopes results to the current employee, so employeeId
  // isn't returned — default it to the current user so the myLv filter below
  // still matches instead of silently filtering everything out.
  const LEAVES = leavesList.map(l => ({
    ...l,
    employeeId: l.employeeId ?? l.EmployeeId ?? user?.employeeId ?? user?.id,
    type: l.leaveTypeId ?? l.LeaveTypeId ?? l.type ?? '',
    from: l.fromDate ?? l.FromDate ?? l.from ?? '',
    to: l.toDate ?? l.ToDate ?? l.to ?? '',
    days: l.daysCount ?? l.DaysCount ?? l.days ?? 0,
    status: String(l.status ?? l.Status ?? 'pending').toLowerCase(),
  }));
  const PERMISSIONS = permsList;
  const DEPARTMENTS = departments;
  const COLLEGES = colleges;

  const myAtt  =ATTENDANCE.filter(a=>a.employeeId===user?.employeeId || a.employeeId===user?.id);
  const myLv   =LEAVES.filter(l=>(l.employeeId===user?.employeeId||l.employeeId===user?.id)&&l.status==='approved');
  const myPend =LEAVES.filter(l=>(l.employeeId===user?.employeeId||l.employeeId===user?.id)&&l.status==='pending');
  const thisMonth = new Date().toISOString().slice(0,7);
  const usedPermsMin = calcUsedPermsMins(user?.employeeId, PERMISSIONS);
  const todayR =myAtt[myAtt.length-1];
  const todaySt=todayR?ATT[todayR.status]:null;
  const tot    =myAtt.length||1;
  const pres   =myAtt.filter(a=>a.status==='present'||a.status==='left').length;
  const abs    =myAtt.filter(a=>a.status==='absent').length;
  const late   =myAtt.filter(a=>a.status==='late').length;
  const pct    =Math.round(pres/tot*100);
  const pctC   =pct>=80?'#16A34A':pct>=60?'#D97706':'#DC2626';

  // Monthly hours calculation
  const now2=new Date();
  const monthAtts=myAtt.filter(a=>{
    if(!a.date)return false;
    const d=new Date(a.date);
    return d.getMonth()===now2.getMonth()&&d.getFullYear()===now2.getFullYear();
  });
  const totalHrs=monthAtts.reduce((s,a)=>{
    if(!a.checkIn||!a.checkOut)return s;
    const[ih,im]=a.checkIn.split(':').map(Number);
    const[oh,om]=a.checkOut.split(':').map(Number);
    return s+Math.max(0,(oh*60+om-ih*60-im)/60);
  },0);
  const reqHrs=monthAtts.length*8;
  const hrsPct=reqHrs>0?Math.round(totalHrs/reqHrs*100):0;

  // Weekly attendance last 7 days
  const last7=Array.from({length:7}).map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    const ds=d.toISOString().slice(0,10);
    const a=myAtt.find(x=>x.date===ds);
    return{day:DN[lang][d.getDay()],status:a?.status||null,date:ds};
  });

  // Attendance goal
  const goalPct=90;
  const badge=pct>=goalPct;

  // Next upcoming leave
  const today2=new Date().toISOString().slice(0,10);
  const nextLv=myLv.find(l=>l.to>=today2);
  const nextTask=tasks.filter(t=>!t.done&&t.date>=today2).sort((a,b)=>a.date.localeCompare(b.date))[0];

  // Average check-in time
  const checkIns=myAtt.filter(a=>a.checkIn).map(a=>{const[h,m]=a.checkIn.split(':').map(Number);return h*60+m;});
  const avgMin=checkIns.length?Math.round(checkIns.reduce((s,v)=>s+v,0)/checkIns.length):0;
  const avgH=Math.floor(avgMin/60),avgM=avgMin%60;
  const avgTime=checkIns.length?`${String(avgH).padStart(2,'0')}:${String(avgM).padStart(2,'0')}`:'--:--';

  const firstDay=new Date(calY,calM,1).getDay();
  const dim=new Date(calY,calM+1,0).getDate();
  const today3=new Date();

  function getDayData(day){
    const ds=`${calY}-${String(calM+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const a=myAtt.find(x=>x.date===ds);if(a)return{type:'att',m:ATT[a.status],d:a};
    const l=myLv.find(x=>ds>=x.from&&ds<=x.to);if(l)return{type:'lv',m:LV[l.type]||LV.annual,d:l};
    return null;
  }
  function prevM(){if(calM===0){setCalM(11);setCalY(y=>y-1);}else setCalM(m=>m-1);setSelDay(null);}
  function nextM(){if(calM===11){setCalM(0);setCalY(y=>y+1);}else setCalM(m=>m+1);setSelDay(null);}

  const card={background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',boxShadow:'0 2px 8px rgba(0,0,0,.04)'};
  const inp2={width:'100%',padding:'10px 12px',border:'1.5px solid #E8EDF5',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',background:'white',boxSizing:'border-box',transition:'border-color .15s'};

  const LEAVE_BALANCES=[
    {id:'annual',days:21,c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE',l:{ar:'اعتيادي',en:'Annual'}},
    {id:'sick',  days:14,c:'#991B1B',bg:'#FEE2E2',bd:'#FECACA',l:{ar:'مرضية',  en:'Sick'}},
    {id:'urgent',days:7, c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A',l:{ar:'عارضة',  en:'Urgent'}},
  ];

  const secTitle=(icon,text)=>(
    <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:'8px'}}>
      {icon}{text}
    </div>
  );

  return(
    <div style={{padding:'24px 28px',fontFamily:'Cairo,sans-serif',direction:dir,background:'#F1F5F9',minHeight:'100%'}}>

      {/* ══ HERO ══ */}
      <div style={{borderRadius:'16px',marginBottom:'18px',overflow:'hidden',boxShadow:'0 4px 16px rgba(13,59,122,.15)'}}>

        {/* ── Gradient band ── */}
        <div style={{background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)',padding:'20px 26px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'50px',height:'50px',borderRadius:'14px',background:'rgba(255,255,255,.15)',border:'2px solid rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'900',color:'white',flexShrink:0}}>
              {(lang==='en'?emp?.nameEn:emp?.name)?.charAt(0)||'?'}
            </div>
            <div>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginBottom:'3px',letterSpacing:'.5px'}}>{greet}</div>
              <div style={{fontSize:'20px',fontWeight:'800',color:'white',lineHeight:1.2}}>{lang==='en'?emp?.nameEn:emp?.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:'7px',marginTop:'6px',flexWrap:'wrap'}}>
                <span style={{background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)',border:'1px solid rgba(255,255,255,.2)',padding:'2px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'600'}}>{role?.l[lang]}</span>
                {dept&&<span style={{color:'rgba(255,255,255,.55)',fontSize:'11px'}}>· {lang==='en'?dept.nameEn:dept.name}</span>}
                {pct>=85&&<span style={{background:'rgba(255,215,0,.2)',color:'#FCD34D',border:'1px solid rgba(255,215,0,.3)',padding:'2px 10px',borderRadius:'999px',fontSize:'11px',fontWeight:'600'}}>⭐ {lang==='ar'?'منتظم':'Punctual'}</span>}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'16px',flexShrink:0}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.5)',marginBottom:'4px',letterSpacing:'.5px'}}>{lang==='ar'?'اليوم':'TODAY'}</div>
              {todaySt
                ?<span style={{background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.25)',padding:'5px 16px',borderRadius:'999px',fontSize:'13px',fontWeight:'700',display:'block',whiteSpace:'nowrap'}}>{todaySt.l[lang]}{todayR?.checkIn&&` · ${todayR.checkIn}`}</span>
                :<span style={{background:'rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',padding:'5px 16px',borderRadius:'999px',fontSize:'12px',fontWeight:'600',display:'block',border:'1px solid rgba(255,255,255,.15)',whiteSpace:'nowrap'}}>{lang==='ar'?'لم تسجل بعد':'Not checked in'}</span>
              }
            </div>
            <div style={{width:'1px',height:'36px',background:'rgba(255,255,255,.15)'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.5)',marginBottom:'3px',letterSpacing:'.5px'}}>{lang==='ar'?'الوقت':'TIME'}</div>
              <div style={{fontSize:'20px',fontWeight:'800',color:'white',direction:'ltr',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{time}</div>
            </div>
            <div style={{width:'1px',height:'36px',background:'rgba(255,255,255,.15)'}}/>
            <div ref={notRef} style={{position:'relative'}}>
              <button onClick={()=>setNotifOpen(p=>!p)}
                style={{width:'40px',height:'40px',borderRadius:'11px',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',transition:'all .15s',position:'relative'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.22)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.12)'}>
                🔔
                {unread>0&&<span style={{position:'absolute',top:'-4px',right:'-4px',width:'17px',height:'17px',borderRadius:'50%',background:'#DC2626',color:'white',fontSize:'10px',fontWeight:'900',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #1565C0'}}>{unread}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',background:'white'}}>
          {[
            {v:pres,     l:{ar:'حضور',       en:'Present'},  c:'#166534',bg:'#F0FDF4'},
            {v:abs,      l:{ar:'غياب',        en:'Absent'},   c:'#991B1B',bg:'#FEF2F2'},
            {v:late,     l:{ar:'تأخر',        en:'Late'},     c:'#B45309',bg:'#FFFBEB'},
            {v:`${pct}%`,l:{ar:'نسبة الحضور',en:'Rate'},     c:'#1565C0',bg:'#EFF6FF'},
          ].map((s,i)=>(
            <div key={i}
              style={{textAlign:'center',padding:'14px 8px',borderInlineEnd:i<3?'1px solid #F1F5F9':'none',transition:'background .15s',cursor:'default'}}
              onMouseEnter={e=>e.currentTarget.style.background=s.bg}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div style={{fontSize:'26px',fontWeight:'900',color:s.c,lineHeight:1,marginBottom:'4px'}}>{s.v}</div>
              <div style={{fontSize:'11px',color:'#94A3B8',fontWeight:'600'}}>{s.l[lang]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ LEAVE BALANCES ══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'16px'}}>
        {LEAVE_BALANCES.map(lb=>{
          const { start:lyStart, end:lyEnd } = getLeaveYearPeriod();
          const used=myLv.filter(l=>l.type===lb.id&&l.from>=lyStart&&l.from<=lyEnd).reduce((s,l)=>s+l.days,0);
          const rem=Math.max(0,lb.days-used);
          const p=lb.days>0?Math.round(used/lb.days*100):0;
          return(
            <div key={lb.id} style={{...card,padding:'15px 18px',display:'flex',alignItems:'center',gap:'14px',transition:'all .2s',borderInlineStart:`3px solid ${lb.c}`}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${lb.bd}55`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)';}}>
              <Donut pct={p} color={lb.c} size={64} stroke={7}
                label={<><span style={{fontSize:'18px',fontWeight:'900',color:lb.c,lineHeight:1}}>{rem}</span><span style={{fontSize:'10px',color:lb.c,opacity:.7}}>{lang==='ar'?'ي':'d'}</span></>}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'15px',fontWeight:'800',color:lb.c,marginBottom:'4px'}}>{lb.l[lang]}</div>
                <div style={{fontSize:'12px',color:'#64748B',marginBottom:'7px'}}>{used}/{lb.days} {lang==='ar'?'مستخدم':'used'}</div>
                <div style={{background:'#F1F5F9',borderRadius:'999px',height:'4px',overflow:'hidden'}}>
                  <div style={{width:`${p}%`,background:lb.c,height:'100%',borderRadius:'999px',transition:'width 1s'}}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'16px'}}>
        {[
          {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
           l:{ar:'تسجيل الحضور',en:'Check In'},    ic:'#166534',ib:'#DCFCE7',ibd:'#BBF7D0',page:'attendance',
           desc:{ar:'سجل حضورك الآن',en:'Mark your attendance'}},
          {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
           l:{ar:'طلب إجازة',   en:'Request Leave'},ic:'#1565C0',ib:'#DBEAFE',ibd:'#BFDBFE',page:'leaves',
           desc:{ar:'قدم طلب إجازة',en:'Submit a leave request'}},
          {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
           l:{ar:'طلب إذن',     en:'Permission'},   ic:'#6B21A8',ib:'#EDE9FE',ibd:'#DDD6FE',page:'permissions',
           desc:{ar:'اطلب إذن مؤقت',en:'Request a permission'}},
        ].map((a,i)=>(
          <div key={i} onClick={()=>setActivePage&&setActivePage(a.page)}
            style={{background:'white',borderRadius:'16px',padding:'18px 20px',border:'1px solid #E8EDF5',display:'flex',alignItems:'center',gap:'14px',cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 20px ${a.ibd}66`;e.currentTarget.style.borderColor=a.ibd;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)';e.currentTarget.style.borderColor='#E8EDF5';}}>
            <div style={{width:'52px',height:'52px',borderRadius:'14px',background:a.ib,border:`1px solid ${a.ibd}`,display:'flex',alignItems:'center',justifyContent:'center',color:a.ic,flexShrink:0}}>{a.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'15px',fontWeight:'800',color:'#0F172A',marginBottom:'2px'}}>{a.l[lang]}</div>
              <div style={{fontSize:'12px',color:'#94A3B8',fontWeight:'500'}}>{a.desc[lang]}</div>
            </div>
            <svg style={{flexShrink:0,color:'#CBD5E1'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={lang==='ar'?'9 18 15 12 9 6':'15 18 9 12 15 6'}/></svg>
          </div>
        ))}
      </div>

      {/* ══ MAIN ROW ══ */}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 360px',gap:'16px',marginBottom:'18px'}}>

        {/* LEFT: stats column */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px',minWidth:0,overflow:'hidden'}}>

          {/* Weekly chart */}
          <div style={{...card,padding:'16px 18px',borderInlineStart:'3px solid #1565C0'}}>
            <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                {lang==='ar'?'الحضور الأسبوعي — آخر 7 أيام':'Weekly Attendance — Last 7 Days'}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'80px',marginBottom:'10px',paddingTop:'20px'}}>
              {last7.map((d,i)=>{
                const h    = d.status==='present'||d.status==='left'?100:d.status==='late'?60:d.status==='absent'?30:0;
                const grad = d.status==='present'||d.status==='left'
                  ? 'linear-gradient(180deg,#4ADE80,#16A34A)'
                  : d.status==='late'
                  ? 'linear-gradient(180deg,#FCD34D,#D97706)'
                  : d.status==='absent'
                  ? 'linear-gradient(180deg,#F87171,#DC2626)'
                  : 'linear-gradient(180deg,#E2E8F0,#CBD5E1)';
                const isToday = d.ds === new Date().toISOString().slice(0,10);
                return (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'5px'}}>
                    {/* percentage label */}
                    {d.status && (
                      <span style={{fontSize:'11px',fontWeight:'800',
                        color:d.status==='present'||d.status==='left'?'#16A34A':d.status==='late'?'#D97706':d.status==='absent'?'#DC2626':'#94A3B8',
                        minHeight:'14px',lineHeight:1}}>
                        {d.status==='present'||d.status==='left'?'✓':d.status==='late'?'!':d.status==='absent'?'✗':''}
                      </span>
                    )}
                    {!d.status && <span style={{minHeight:'14px',display:'block'}}/>}
                    {/* bar container */}
                    <div style={{width:'100%',background:'#F1F5F9',borderRadius:'6px',height:'52px',display:'flex',alignItems:'flex-end',overflow:'hidden',
                      boxShadow:isToday?'0 0 0 2px #1565C0':'none',position:'relative'}}>
                      <div style={{
                        width:'100%',
                        background: h>0 ? grad : 'transparent',
                        height:`${h}%`,
                        borderRadius:'6px',
                        transition:'height 1s cubic-bezier(.34,1.2,.64,1)',
                        minHeight: h>0?'6px':'0',
                      }}/>
                    </div>
                    {/* day label */}
                    <span style={{fontSize:'11px',color:isToday?'#1565C0':'#64748B',fontWeight:isToday?'800':'600'}}>{d.day}</span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',paddingTop:'8px',borderTop:'1px solid #F1F5F9'}}>
              {[
                {grad:'linear-gradient(90deg,#4ADE80,#16A34A)',l:{ar:'حاضر',en:'Present'}},
                {grad:'linear-gradient(90deg,#FCD34D,#D97706)',l:{ar:'متأخر',en:'Late'}},
                {grad:'linear-gradient(90deg,#F87171,#DC2626)',l:{ar:'غائب',en:'Absent'}},
                {grad:'linear-gradient(90deg,#E2E8F0,#CBD5E1)',l:{ar:'لا يوجد',en:'No data'}},
              ].map(x=>(
                <div key={x.l.en} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <div style={{width:'20px',height:'7px',borderRadius:'999px',background:x.grad,flexShrink:0}}/>
                  <span style={{fontSize:'11px',color:'#64748B',fontWeight:'600'}}>{x.l[lang]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row: 4 mini stats ── */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px'}}>

            {/* Hours */}
            <div style={{...card,padding:'16px 18px',borderInlineStart:'3px solid #1565C0',display:'flex',alignItems:'center',gap:'12px'}}>
              <Donut pct={hrsPct} color="#1565C0" size={46} stroke={5}
                label={<span style={{fontSize:'11px',fontWeight:'900',color:'#1565C0'}}>{Math.round(totalHrs)}</span>}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:'#64748B',marginBottom:'2px',display:'flex',alignItems:'center',gap:'5px'}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {lang==='ar'?'ساعات الشهر':'Monthly Hours'}
                </div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'#1565C0',lineHeight:1}}>{Math.round(totalHrs)}<span style={{fontSize:'11px',opacity:.7}}>{lang==='ar'?' س':' h'}</span></div>
                <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>{lang==='ar'?`من ${reqHrs}س`:` of ${reqHrs}h`}</div>
              </div>
            </div>

            {/* Avg check-in */}
            <div style={{...card,padding:'16px 18px',borderInlineStart:'3px solid #6B21A8',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'46px',height:'46px',borderRadius:'12px',background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B21A8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="12" x2="15" y2="14"/></svg>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:'#64748B',marginBottom:'2px'}}>{lang==='ar'?'متوسط الحضور':'Avg Check-in'}</div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'#6B21A8',lineHeight:1,direction:'ltr'}}>{avgTime}</div>
                <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>{lang==='ar'?`${checkIns.length} يوم`:`${checkIns.length} days`}</div>
              </div>
            </div>

            {/* Next leave */}
            <div style={{...card,padding:'16px 18px',borderInlineStart:'3px solid #166534',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'46px',height:'46px',borderRadius:'12px',background:'#DCFCE7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:'#64748B',marginBottom:'4px'}}>{lang==='ar'?'الإجازة القادمة':'Next Leave'}</div>
                {nextLv
                  ?<><Badge c={LV[nextLv.type]?.c||'#166534'} bg={LV[nextLv.type]?.bg||'#DCFCE7'} bd={LV[nextLv.type]?.bd||'#BBF7D0'}>{LV[nextLv.type]?.l[lang]}</Badge><div style={{fontSize:'11px',color:'#94A3B8',marginTop:'3px',direction:'ltr'}}>{nextLv.from}</div></>
                  :<div style={{fontSize:'11px',color:'#94A3B8'}}>{lang==='ar'?'لا توجد':'No upcoming'}</div>
                }
              </div>
            </div>

            {/* Pending requests */}
            <div style={{...card,padding:'16px 18px',borderInlineStart:'3px solid #B45309',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'46px',height:'46px',borderRadius:'12px',background:'#FEF3C7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:'#64748B',marginBottom:'4px'}}>{lang==='ar'?'طلبات معلقة':'Pending'}</div>
                {myPend.length===0
                  ?<div style={{fontSize:'11px',color:'#94A3B8'}}>{lang==='ar'?'لا يوجد':'None'}</div>
                  :<><div style={{fontSize:'22px',fontWeight:'900',color:'#B45309',lineHeight:1}}>{myPend.length}</div><div style={{fontSize:'11px',color:'#94A3B8',marginTop:'1px'}}>{lang==='ar'?'طلب':'requests'}</div></>
                }
              </div>
            </div>
          </div>

          {/* ── Attendance donut + Permissions full width ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>

            {/* Attendance donut */}
            <div style={{...card,padding:'16px 18px',borderInlineStart:'3px solid #1565C0'}}>
              <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                {lang==='ar'?'نسبة الحضور الكلية':'Attendance Rate'}
              </div>
              {(()=>{
                const R=48, C=2*Math.PI*R;
                const rows=[
                  {v:pres,color:'#16A34A',label:{ar:'حاضر',en:'Present'}},
                  {v:late,color:'#D97706',label:{ar:'متأخر',en:'Late'}},
                  {v:abs, color:'#DC2626',label:{ar:'غائب', en:'Absent'}},
                  {v:myAtt.filter(a=>a.status==='left').length,color:'#1565C0',label:{ar:'انصرف',en:'Left'}},
                ];
                let cum=0;
                return(<>
                  <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}>
                    <div style={{position:'relative',width:'110px',height:'110px'}}>
                      <svg width="110" height="110">
                        <circle cx="55" cy="55" r={R} fill="none" stroke="#F1F5F9" strokeWidth="9"/>
                        {tot>1&&rows.map((row,i)=>{
                          const p=row.v/tot,dash=C*p,offset=C/4-C*cum;cum+=p;
                          return row.v>0&&<circle key={i} cx="55" cy="55" r={R} fill="none" stroke={row.color} strokeWidth="9"
                            strokeDasharray={`${Math.max(dash-2,0)} ${C}`} strokeDashoffset={offset} style={{transition:'all 1.2s ease'}}/>;
                        })}
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        <div style={{fontSize:'20px',fontWeight:'900',color:pctC,lineHeight:1}}>{pct}%</div>
                        <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'2px'}}>{lang==='ar'?'حضور':'rate'}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {rows.map(row=>{
                      const rp=tot>0?Math.round(row.v/tot*100):0;
                      return(<div key={row.label.ar} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:row.color,flexShrink:0}}/>
                        <span style={{fontSize:'11px',fontWeight:'700',color:'#334155',minWidth:'36px'}}>{row.label[lang]}</span>
                        <div style={{flex:1,background:'#F1F5F9',borderRadius:'999px',height:'5px',overflow:'hidden'}}>
                          <div style={{width:`${rp}%`,height:'100%',background:row.color,borderRadius:'999px',transition:'width 1s',minWidth:row.v>0?'3px':'0'}}/>
                        </div>
                        <span style={{fontSize:'11px',fontWeight:'800',color:row.color,minWidth:'16px',textAlign:'center'}}>{row.v}</span>
                      </div>);
                    })}
                  </div>
                </>);
              })()}
            </div>

            {/* Permissions */}
            {(()=>{
              const MONTHLY=240,usedMin=usedPermsMin||0,remMin=Math.max(0,MONTHLY-usedMin);
              const usedPct=Math.round(usedMin/MONTHLY*100);
              const remPct=Math.round(remMin/MONTHLY*100);
              const isLow=remMin<MONTHLY*0.3;
              const mainC=isLow?'#DC2626':'#0891B2';
              const R=48,C=2*Math.PI*R;
              const rows=[
                {l:{ar:'متبقي', en:'Left'},  v:remMin,  pct:remPct,  c:'#0891B2'},
                {l:{ar:'مستخدم',en:'Used'},  v:usedMin, pct:usedPct, c:isLow?'#DC2626':'#DC2626'},
              ];
              let cum=0;
              return(
                <div style={{...card,padding:'16px 18px',borderInlineStart:`3px solid ${mainC}`}}>
                  <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={mainC} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    {lang==='ar'?'رصيد الأذونات':'Permissions Balance'}
                  </div>
                  {/* Donut centered */}
                  <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}>
                    <div style={{position:'relative',width:'110px',height:'110px'}}>
                      <svg width="110" height="110">
                        <circle cx="55" cy="55" r={R} fill="none" stroke="#F1F5F9" strokeWidth="9"/>
                        {[
                          {v:remMin, c:'#0891B2'},
                          {v:usedMin,c:'#DC2626'},
                        ].map((sl,i)=>{
                          const p=sl.v/MONTHLY,dash=C*p,offset=C/4-C*cum;
                          cum+=p;
                          return sl.v>0&&<circle key={i} cx="55" cy="55" r={R} fill="none" stroke={sl.c} strokeWidth="9"
                            strokeDasharray={`${Math.max(dash-2,0)} ${C}`} strokeDashoffset={offset}
                            style={{transition:'all 1.2s ease'}}/>;
                        })}
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        <div style={{fontSize:'20px',fontWeight:'900',color:mainC,lineHeight:1}}>{remMin}</div>
                        <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'2px'}}>{lang==='ar'?'د':'min'}</div>
                      </div>
                    </div>
                  </div>
                  {/* Bars */}
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {rows.map(row=>(
                      <div key={row.l.ar} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:row.c,flexShrink:0}}/>
                        <span style={{fontSize:'11px',fontWeight:'700',color:'#334155',minWidth:'40px'}}>{row.l[lang]}</span>
                        <div style={{flex:1,background:'#F1F5F9',borderRadius:'999px',height:'5px',overflow:'hidden'}}>
                          <div style={{width:`${row.pct}%`,height:'100%',background:row.c,borderRadius:'999px',transition:'width 1s',minWidth:row.v>0?'3px':'0'}}/>
                        </div>
                        <span style={{fontSize:'11px',fontWeight:'800',color:row.c,minWidth:'28px',textAlign:'center'}}>{row.v}</span>
                      </div>
                    ))}
                    <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                      🔄 {lang==='ar'?`يتجدد شهرياً · الكلي: ${MONTHLY} د`:`Monthly reset · Total: ${MONTHLY} min`}
                    </div>
                  </div>
                  {isLow&&<div style={{marginTop:'10px',fontSize:'11px',color:'#DC2626',fontWeight:'700',textAlign:'center',padding:'6px',background:'#FEF2F2',borderRadius:'8px',border:'1px solid #FECACA'}}>⚠️ {lang==='ar'?'رصيد الأذونات منخفض':'Permission balance is low'}</div>}
                </div>
              );
            })()}
          </div>
        </div>

        {/* RIGHT: Calendar / Planner + Week Summary */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <div style={{...card,padding:'18px 20px',height:'fit-content',borderInlineStart:'3px solid #1565C0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <div style={{display:'flex',gap:'3px',background:'#F1F5F9',padding:'3px',borderRadius:'9px'}}>
              {[{id:'cal',l:{ar:'التقويم',en:'Calendar'}},{id:'planner',l:{ar:'مخططي',en:'Planner'}}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{padding:'6px 13px',border:'none',borderRadius:'7px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s',
                    background:tab===t.id?'white':'transparent',color:tab===t.id?'#1565C0':'#64748B',
                    boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,.1)':'none'}}>
                  {t.l[lang]}
                </button>
              ))}
            </div>
            {tab==='planner'&&(
              <button onClick={()=>{setAddOpen(true);setNewT({title:'',date:'',time:'',type:'task',remind:false});setTErr('');}}
                style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'#1565C0',color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}
                onMouseEnter={e=>e.currentTarget.style.background='#1976D2'}
                onMouseLeave={e=>e.currentTarget.style.background='#1565C0'}>
                + {lang==='ar'?'إضافة':'Add'}
              </button>
            )}
          </div>

          {tab==='cal'&&(<>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              {[prevM,null,nextM].map((fn,i)=>i===1
                ?<span key={i} style={{fontSize:'15px',fontWeight:'800',color:'#0F172A'}}>{MN[lang][calM]} {calY}</span>
                :<button key={i} onClick={fn} style={{width:'24px',height:'24px',borderRadius:'6px',border:'1px solid #E8EDF5',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={i===0?(lang==='ar'?'9 18 15 12 9 6':'15 18 9 12 15 6'):(lang==='ar'?'15 18 9 12 15 6':'9 18 15 12 9 6')}/></svg>
                  </button>
              )}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px',marginBottom:'2px'}}>
              {DN[lang].map(d=><div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:'700',color:'#94A3B8',padding:'2px 0'}}>{d}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px'}}>
              {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:dim}).map((_,i)=>{
                const day=i+1;
                const ds=getDayData(day);
                const isT=day===today3.getDate()&&calM===today3.getMonth()&&calY===today3.getFullYear();
                const isSel=selDay===day;
                const wknd=new Date(calY,calM,day).getDay()===5||new Date(calY,calM,day).getDay()===6;
                const dotC=ds?.type==='att'?ds.m.dot:ds?.type==='lv'?ds.m.dot:null;
                const circleBg=isSel?'#1565C0':isT?'#1565C0':ds?.type==='att'?ds.m.c:ds?.type==='lv'?ds.m.c:null;
                return(
                  <div key={day} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'2px 0',cursor:'pointer'}}
                    onClick={()=>setSelDay(isSel?null:day)}>
                    <div style={{width:'30px',height:'30px',borderRadius:'50%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                      fontSize:'13px',fontWeight:isT||isSel?'800':'500',
                      background:circleBg||'transparent',
                      color:circleBg?'white':wknd?'#CBD5E1':'#334155',
                      boxShadow:isSel||isT?'0 2px 6px rgba(21,101,192,.3)':'none',
                      outline:isT&&!isSel?'2px solid #93C5FD':'none',outlineOffset:'1px',
                      transition:'all .12s'}}
                      onMouseEnter={e=>{if(!circleBg){e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.color='#1565C0';}}}
                      onMouseLeave={e=>{if(!circleBg){e.currentTarget.style.background='transparent';e.currentTarget.style.color=wknd?'#CBD5E1':'#334155';}}}>
                      <span style={{lineHeight:1}}>{day}</span>
                      {dotC&&!circleBg&&<div style={{width:'3px',height:'3px',borderRadius:'50%',background:dotC,marginTop:'1px'}}/>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'8px',paddingTop:'8px',borderTop:'1px solid #F1F5F9'}}>
              {[{dot:'#16A34A',l:{ar:'حاضر',en:'Present'}},{dot:'#D97706',l:{ar:'متأخر',en:'Late'}},{dot:'#DC2626',l:{ar:'غائب',en:'Absent'}},{dot:'#3B82F6',l:{ar:'إجازة',en:'Leave'}}].map(s=>(
                <div key={s.l.ar} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:s.dot}}/>
                  <span style={{fontSize:'12px',color:'#64748B',fontWeight:'600'}}>{s.l[lang]}</span>
                </div>
              ))}
            </div>
            {selDay&&getDayData(selDay)&&(
                <div style={{marginTop:'8px',padding:'10px 12px',background:'#F8FAFC',borderRadius:'10px',border:'1px solid #E8EDF5'}}>
                  <div style={{fontSize:'12px',fontWeight:'700',color:'#0F172A',marginBottom:'6px'}}>{selDay} {MN[lang][calM]}</div>
                  {getDayData(selDay)?.type==='att'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'#64748B',fontWeight:'600'}}>{lang==='ar'?'الحالة':'Status'}</span><Badge c={getDayData(selDay).m.c} bg={getDayData(selDay).m.bg} bd={getDayData(selDay).m.bd}>{getDayData(selDay).m.l[lang]}</Badge></div>
                      {getDayData(selDay).d.checkIn&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'#64748B',fontWeight:'600'}}>{lang==='ar'?'حضور':'In'}</span><span style={{color:'#166534',fontWeight:'700',direction:'ltr'}}>{getDayData(selDay).d.checkIn}</span></div>}
                      {getDayData(selDay).d.checkOut&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'#64748B',fontWeight:'600'}}>{lang==='ar'?'انصراف':'Out'}</span><span style={{color:'#1565C0',fontWeight:'700',direction:'ltr'}}>{getDayData(selDay).d.checkOut}</span></div>}
                    </div>
                  )}
                  {getDayData(selDay)?.type==='lv'&&(
                    <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'#64748B',fontWeight:'600'}}>{lang==='ar'?'الإجازة':'Type'}</span><Badge c={getDayData(selDay).m.c} bg={getDayData(selDay).m.bg} bd={getDayData(selDay).m.bd}>{getDayData(selDay).m.l[lang]}</Badge></div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'#64748B',fontWeight:'600'}}>{lang==='ar'?'الفترة':'Period'}</span><span style={{color:'#334155',fontWeight:'600',direction:'ltr'}}>{getDayData(selDay).d.from} → {getDayData(selDay).d.to}</span></div>
                    </div>
                  )}
                </div>
            )}
          </>)}

          {tab==='planner'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'7px',maxHeight:'380px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
              {tasks.length===0&&<div style={{textAlign:'center',padding:'30px',color:'#94A3B8',fontSize:'13px'}}>{lang==='ar'?'لا توجد مهام':'No tasks'}</div>}
              {tasks.sort((a,b)=>a.date.localeCompare(b.date)).map(task=>{
                const TC={task:{c:'#1565C0',bg:'#DBEAFE',bd:'#BFDBFE'},meeting:{c:'#6B21A8',bg:'#EDE9FE',bd:'#DDD6FE'},reminder:{c:'#B45309',bg:'#FEF3C7',bd:'#FDE68A'}};
                const TL={task:{ar:'مهمة',en:'Task'},meeting:{ar:'اجتماع',en:'Meeting'},reminder:{ar:'تذكير',en:'Reminder'}};
                const tc=TC[task.type]||TC.task;const tl=TL[task.type]||TL.task;
                const isT2=task.date===today2;
                return(
                  <div key={task.id} style={{display:'flex',gap:'9px',padding:'10px 12px',borderRadius:'11px',border:`1px solid ${task.done?'#E2E8F0':tc.bd}`,background:task.done?'#F8FAFC':tc.bg,opacity:task.done?.65:1,transition:'all .15s',alignItems:'flex-start'}}>
                    <div onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,done:!t.done}:t))}
                      style={{width:'17px',height:'17px',borderRadius:'4px',border:`2px solid ${task.done?'#CBD5E1':tc.c}`,background:task.done?'#CBD5E1':tc.c,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,marginTop:'1px',transition:'all .15s'}}>
                      {task.done&&<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'2px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'12px',fontWeight:'700',color:task.done?'#94A3B8':tc.c,textDecoration:task.done?'line-through':'none',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {lang==='en'?(task.title.en||task.title):(task.title.ar||task.title)}
                        </span>
                        <Badge c={task.done?'#94A3B8':tc.c} bg={task.done?'#F1F5F9':tc.bg} bd={task.done?'#E2E8F0':tc.bd}>{tl[lang]}</Badge>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'#64748B',flexWrap:'wrap'}}>
                        <span style={{direction:'ltr'}}>{task.date}{task.time&&` · ${task.time}`}</span>
                        {isT2&&!task.done&&<Badge c='#B45309' bg='#FEF3C7' bd='#FDE68A'>{lang==='ar'?'اليوم':'Today'}</Badge>}
                        {task.remind&&!task.done&&<span style={{color:'#6B21A8',fontSize:'11px'}}>🔔</span>}
                      </div>
                    </div>
                    <button onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#CBD5E1',fontSize:'15px',lineHeight:1,transition:'color .15s',flexShrink:0}}
                      onMouseEnter={e=>e.currentTarget.style.color='#DC2626'}
                      onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}>×</button>
                  </div>
                );
              })}
            </div>
          )}

        </div>

          {/* Mini Week Summary */}
          <WeekSummary lang={lang} dir={dir} schedule={schedule} card={card} mini={true}/>
        </div>
      </div>

      {/* ══ SCHEDULE CARD (standalone below calendar) ══ */}
      <div style={{...card,marginBottom:'18px',overflow:'hidden',borderInlineStart:'3px solid #166534'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:'14px',fontWeight:'800',color:'#0F172A',display:'flex',alignItems:'center',gap:'7px'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {lang==='ar'?(isDemo?'جدول السكاشن':'جدولي'):(isDemo?'Sections Schedule':'My Schedule')}
          </div>
          <button onClick={()=>setAddSlotOpen(true)}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'#166534',color:'white',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',boxShadow:'0 4px 10px rgba(22,101,52,.2)',transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#14532D'}
            onMouseLeave={e=>e.currentTarget.style.background='#166534'}>
            + {lang==='ar'?(isDemo?'إضافة سكشن':'إضافة حصة'):(isDemo?'Add Section':'Add Slot')}
          </button>
        </div>

        {schedule.every(d=>d.entries.length===0) ? (
          <div style={{textAlign:'center',padding:'36px',color:'#94A3B8'}}>
            <div style={{fontSize:'40px',marginBottom:'10px'}}>📚</div>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#475569',marginBottom:'4px'}}>{lang==='ar'?'الجدول فارغ':'Schedule is empty'}</div>
            <div style={{fontSize:'12px'}}>{lang==='ar'?'اضغط + إضافة لإضافة حصة':'Press + Add to add a slot'}</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',borderTop:'none'}}>
            {schedule.map((day,idx)=>(
              <div key={day.day} style={{borderInlineEnd:idx<5?'1px solid #F1F5F9':'none'}}>
                {/* Day header */}
                <div style={{padding:'10px 12px',textAlign:'center',background:'#F8FAFC',borderBottom:'1px solid #F1F5F9'}}>
                  <div style={{fontSize:'12px',fontWeight:'800',color:day.entries.length>0?'#1565C0':'#94A3B8'}}>{DAYS[lang][day.day]}</div>
                  {day.entries.length>0 && <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{day.entries.length} {lang==='ar'?'حصة':'slot'}</div>}
                </div>
                {/* Slots */}
                <div style={{padding:'8px',display:'flex',flexDirection:'column',gap:'6px',minHeight:'80px',alignItems:'center'}}>
                  {day.entries.length===0
                    ? <div style={{textAlign:'center',padding:'12px 0',color:'#E2E8F0',fontSize:'18px'}}>—</div>
                    : day.entries.sort((a,b)=>a.from.localeCompare(b.from)).map(entry=>(
                      <div key={entry.id}
                        style={{padding:'8px 10px',borderRadius:'9px',background:`${entry.color}12`,border:`1.5px solid ${entry.color}30`,borderInlineStart:`3px solid ${entry.color}`,position:'relative',transition:'all .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background=`${entry.color}20`}
                        onMouseLeave={e=>e.currentTarget.style.background=`${entry.color}12`}>
                        <div style={{fontSize:'11px',fontWeight:'800',color:entry.color,direction:'ltr',marginBottom:'2px'}}>{entry.from} – {entry.to}</div>
                        <div style={{fontSize:'12px',fontWeight:'700',color:'#0F172A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.subject}</div>
                        {(entry.room||entry.group) && (
                          <div style={{fontSize:'11px',color:'#64748B',marginTop:'3px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                            {entry.room  && <span>🏫 {entry.room}</span>}
                            {entry.group && <span>👥 {entry.group}</span>}
                          </div>
                        )}
                        <button onClick={()=>removeSlot(day.day,entry.id)}
                          style={{position:'absolute',top:'5px',[lang==='ar'?'left':'right']:'5px',background:'none',border:'none',cursor:'pointer',color:'#CBD5E1',fontSize:'12px',lineHeight:1,transition:'color .15s',padding:'2px'}}
                          onMouseEnter={e=>e.currentTarget.style.color='#DC2626'}
                          onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}>✕</button>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ ADD SLOT MODAL ══ */}
      {addSlotOpen&&(
        <div onClick={()=>setAddSlotOpen(false)}
          style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'480px',direction:dir,fontFamily:'Cairo',boxShadow:'0 32px 80px rgba(0,0,0,.22)',overflow:'hidden'}}>

            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#0D3B7A,#1565C0)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'15px',fontWeight:'800',color:'white'}}>
                  📚 {lang==='ar'?(isDemo?'إضافة سكشن جديد':'إضافة حصة جديدة'):(isDemo?'Add New Section':'Add New Slot')}
                </div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,.55)',marginTop:'2px'}}>
                  {lang==='ar'?'الحقول المميزة * مطلوبة':'Fields marked * are required'}
                </div>
              </div>
              <button onClick={()=>{setAddSlotOpen(false);setSlotErr('');}}
                style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.2)',borderRadius:'8px',padding:'7px 13px',cursor:'pointer',color:'white',fontFamily:'Cairo',fontWeight:'700',fontSize:'12px',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>✕</button>
            </div>

            {/* Body */}
            <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:'16px',maxHeight:'65vh',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>

              {/* Day selector */}
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'8px'}}>{lang==='ar'?'اليوم':'Day'} *</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'7px'}}>
                  {schedule.map((d)=>{
                    const dayName=DAYS[lang][d.day];
                    const isSel=newSlot.day===d.day;
                    return(
                      <button key={d.day} onClick={()=>setNewSlot(p=>({...p,day:d.day}))}
                        style={{padding:'8px 10px',border:`1.5px solid ${isSel?'#1565C0':'#E2E8F0'}`,borderRadius:'10px',
                          background:isSel?'#1565C0':'white',color:isSel?'white':'#475569',
                          fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s',
                          boxShadow:isSel?'0 4px 10px rgba(21,101,192,.25)':'none',textAlign:'center'}}>
                        {dayName}
                        {d.entries.length>0&&<span style={{marginRight:'4px',marginLeft:'4px',fontSize:'11px',opacity:.7}}>({d.entries.length})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'7px'}}>
                  {lang==='ar'?(isDemo?'اسم المادة / السكشن':'اسم المادة'):(isDemo?'Subject / Section':'Subject')} *
                </label>
                <input value={newSlot.subject} onChange={e=>setNewSlot(p=>({...p,subject:e.target.value}))}
                  placeholder={lang==='ar'?(isDemo?'مثال: برمجة — سكشن 1':'مثال: هندسة البرمجيات'):(isDemo?'e.g. Programming - Sec 1':'e.g. Software Engineering')}
                  style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',transition:'border-color .15s'}}
                  onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>

              {/* Time */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'7px'}}>{lang==='ar'?'من':'From'} *</label>
                  <input type="time" value={newSlot.from} onChange={e=>setNewSlot(p=>({...p,from:e.target.value}))}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',direction:'ltr',transition:'border-color .15s'}}
                    onFocus={e=>e.target.style.borderColor='#166534'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'7px'}}>{lang==='ar'?'إلى':'To'} *</label>
                  <input type="time" value={newSlot.to} onChange={e=>setNewSlot(p=>({...p,to:e.target.value}))}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',direction:'ltr',transition:'border-color .15s'}}
                    onFocus={e=>e.target.style.borderColor='#DC2626'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
              </div>

              {/* Duration preview */}
              {newSlot.from&&newSlot.to&&(()=>{
                const[fh,fm]=newSlot.from.split(':').map(Number);
                const[th,tm]=newSlot.to.split(':').map(Number);
                const diff=(th*60+tm)-(fh*60+fm);
                return diff>0?(
                  <div style={{padding:'9px 14px',background:'#F0FDF4',borderRadius:'10px',border:'1px solid #BBF7D0',display:'flex',alignItems:'center',gap:'8px'}}>
                    <span>⏱️</span>
                    <span style={{fontSize:'13px',fontWeight:'700',color:'#166534',direction:'ltr'}}>
                      {newSlot.from} → {newSlot.to}
                    </span>
                    <span style={{fontSize:'12px',color:'#64748B',fontWeight:'600'}}>
                      · {Math.floor(diff/60)>0?`${Math.floor(diff/60)}${lang==='ar'?'س ':' h '}`:''}
                        {diff%60>0?`${diff%60}${lang==='ar'?'د':' m'}`:''}
                    </span>
                  </div>
                ):null;
              })()}

              {/* Room + Group */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'7px'}}>🏫 {lang==='ar'?'القاعة':'Room'}</label>
                  <input value={newSlot.room||''} onChange={e=>setNewSlot(p=>({...p,room:e.target.value}))}
                    placeholder={lang==='ar'?'مثال: A101':'e.g. A101'}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',transition:'border-color .15s'}}
                    onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#334155',marginBottom:'7px'}}>
                    👥 {lang==='ar'?(isDemo?'المجموعة':'الشعبة'):(isDemo?'Group':'Division')}
                  </label>
                  <input value={newSlot.group||''} onChange={e=>setNewSlot(p=>({...p,group:e.target.value}))}
                    placeholder={lang==='ar'?'مثال: A1':'e.g. A1'}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontFamily:'Cairo',fontSize:'13px',outline:'none',boxSizing:'border-box',transition:'border-color .15s'}}
                    onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
              </div>

              {slotErr&&(
                <div style={{padding:'10px 14px',background:'#FEE2E2',borderRadius:'10px',color:'#DC2626',fontSize:'13px',fontWeight:'700',border:'1px solid #FECACA',display:'flex',alignItems:'center',gap:'7px'}}>
                  ⚠️ {slotErr}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{padding:'14px 22px',borderTop:'1px solid #F1F5F9',display:'flex',flexDirection:lang==='ar'?'row':'row-reverse',gap:'10px',background:'#F8FAFC'}}>
              <button onClick={addSlot}
                style={{flex:2,padding:'11px',background:'linear-gradient(135deg,#166534,#16A34A)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',boxShadow:'0 4px 12px rgba(22,101,52,.3)',transition:'all .18s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='.9'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                📚 {lang==='ar'?(isDemo?'إضافة السكشن':'إضافة الحصة'):(isDemo?'Add Section':'Add Slot')}
              </button>
              <button onClick={()=>{setAddSlotOpen(false);setSlotErr('');}}
                style={{flex:1,padding:'11px',background:'white',color:'#475569',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                {lang==='ar'?'إلغاء':'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{...card,overflow:'hidden',border:'1px solid #E8EDF5'}}>
        <div style={{padding:'13px 18px',borderBottom:'1px solid #F1F5F9',fontSize:'13px',fontWeight:'800',color:'#0F172A',display:'flex',alignItems:'center',gap:'7px'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {lang==='ar'?'آخر سجلات الحضور':'Recent Attendance'}
        </div>
        <div style={{overflowX:'auto',maxHeight:'320px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#94A3B8 #E2E8F0'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {[lang==='ar'?'التاريخ':'Date',lang==='ar'?'الحضور':'In',lang==='ar'?'الانصراف':'Out',lang==='ar'?'الحالة':'Status'].map(h=>(
                <th key={h} style={{background:'#F8FAFC',padding:'12px 16px',textAlign:'center',fontWeight:'700',color:'#475569',fontSize:'13px',borderBottom:'1.5px solid #E2E8F0',whiteSpace:'nowrap',position:'sticky',top:0,zIndex:1}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {myAtt.length===0?(
                <tr><td colSpan="4" style={{textAlign:'center',padding:'28px',color:'#94A3B8',fontSize:'13px'}}>{lang==='ar'?'لا توجد سجلات':'No records'}</td></tr>
              ):myAtt.map((a,idx)=>{
                const sm=ATT[a.status];
                return(
                  <tr key={a.id} style={{background:idx%2===0?'white':'#FAFBFC',transition:'background .12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F8FAFC',fontSize:'13px',textAlign:'center',direction:'ltr',color:'#64748B'}}>{a.date}</td>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F8FAFC',fontSize:'13px',textAlign:'center',direction:'ltr',color:'#166534',fontWeight:'700'}}>{a.checkIn||'—'}</td>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F8FAFC',fontSize:'13px',textAlign:'center',direction:'ltr',color:'#1565C0',fontWeight:'700'}}>{a.checkOut||'—'}</td>
                    <td style={{padding:'10px 16px',borderBottom:'1px solid #F8FAFC',textAlign:'center'}}>
                      <Badge c={sm?.c} bg={sm?.bg} bd={sm?.bd}>{sm?.l[lang]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ NOTIFICATION PORTAL ══ */}
      {notifOpen&&(
        <div style={{position:'fixed',top:'68px',[lang==='ar'?'left':'right']:'16px',width:'300px',background:'white',borderRadius:'16px',border:'1px solid #E8EDF5',boxShadow:'0 8px 32px rgba(0,0,0,.15)',zIndex:99999,overflow:'hidden',fontFamily:'Cairo,sans-serif',direction:dir}}>
          <div style={{padding:'13px 16px',fontSize:'13px',fontWeight:'800',color:'#0F172A',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#FAFBFC'}}>
            <span>{lang==='ar'?'الإشعارات':'Notifications'}</span>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              {unread>0&&<span style={{background:'#FEE2E2',color:'#DC2626',borderRadius:'999px',fontSize:'11px',padding:'2px 8px',fontWeight:'700'}}>{unread} {lang==='ar'?'جديد':'new'}</span>}
              <button onClick={()=>setNotifOpen(false)} style={{background:'#F1F5F9',border:'none',borderRadius:'6px',padding:'4px 9px',cursor:'pointer',fontSize:'12px',color:'#475569',fontWeight:'700',fontFamily:'Cairo',transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#DC2626';}} onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#475569';}}>✕</button>
            </div>
          </div>
          {NOTIFS.map((n,ni)=>(
            <div key={n.id} style={{padding:'11px 15px',borderBottom:'1px solid #F8FAFC',display:'flex',gap:'10px',alignItems:'flex-start',background:n.unread?`${n.c}07`:'white',cursor:'pointer',transition:'background .12s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
              onMouseLeave={e=>e.currentTarget.style.background=n.unread?`${n.c}07`:'white'}>
              <div style={{width:'34px',height:'34px',borderRadius:'10px',background:`${n.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>{n.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'12px',fontWeight:'700',color:'#0F172A',marginBottom:'2px'}}>{n.title[lang]}</div>
                <div style={{fontSize:'11px',color:'#64748B'}}>{n.desc[lang]}</div>
                <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{n.time[lang]}</div>
              </div>
              {n.unread&&<div style={{width:'7px',height:'7px',borderRadius:'50%',background:n.c,flexShrink:0,marginTop:'4px'}}/>}
            </div>
          ))}
        </div>
      )}

      {/* ══ ADD TASK MODAL ══ */}
      {addOpen&&(
        <div onClick={()=>setAddOpen(false)} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'18px',width:'100%',maxWidth:'400px',padding:'20px 22px',direction:dir,fontFamily:'Cairo,sans-serif',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:'15px',fontWeight:'800',color:'#0F172A',marginBottom:'16px',paddingBottom:'11px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              {lang==='ar'?'إضافة مهمة':'Add Task'}
              <button onClick={()=>setAddOpen(false)} style={{background:'#F1F5F9',border:'none',borderRadius:'7px',padding:'5px 11px',cursor:'pointer',color:'#475569',fontFamily:'Cairo',fontWeight:'700',fontSize:'12px'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'5px'}}>{lang==='ar'?'العنوان':'Title'} *</label>
                <input value={newT.title} onChange={e=>setNewT(p=>({...p,title:e.target.value}))} placeholder={lang==='ar'?'مثال: اجتماع القسم...':'e.g. Dept meeting...'}
                  onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} style={inp2}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',alignItems:'start'}}>
                <div>
                  <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'5px'}}>{lang==='ar'?'التاريخ':'Date'} *</label>
                  <input type="date" value={newT.date} onChange={e=>setNewT(p=>({...p,date:e.target.value}))}
                    onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} style={{...inp2,direction:'ltr'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'5px'}}>{lang==='ar'?'الوقت':'Time'}</label>
                  <input type="time" value={newT.time} onChange={e=>setNewT(p=>({...p,time:e.target.value}))}
                    onFocus={e=>e.target.style.borderColor='#1565C0'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} style={{...inp2,direction:'ltr'}}/>
                </div>
              </div>
              <div>
                <label style={{display:'block',fontSize:'12px',fontWeight:'700',color:'#475569',marginBottom:'6px'}}>{lang==='ar'?'النوع':'Type'}</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px'}}>
                  {[{id:'task',l:{ar:'مهمة',en:'Task'}},{id:'meeting',l:{ar:'اجتماع',en:'Meeting'}},{id:'reminder',l:{ar:'تذكير',en:'Reminder'}}].map(t=>{
                    const sel=newT.type===t.id;
                    return(<button key={t.id} onClick={()=>setNewT(p=>({...p,type:t.id}))}
                      style={{padding:'8px',border:`1.5px solid ${sel?'#1565C0':'#E2E8F0'}`,borderRadius:'8px',background:sel?'#1565C0':'white',color:sel?'white':'#475569',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s'}}>
                      {t.l[lang]}
                    </button>);
                  })}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 11px',background:newT.remind?'#EEF2FF':'#F8FAFC',borderRadius:'9px',border:`1px solid ${newT.remind?'#C7D2FE':'#E2E8F0'}`,cursor:'pointer'}}
                onClick={()=>setNewT(p=>({...p,remind:!p.remind}))}>
                <div style={{width:'17px',height:'17px',borderRadius:'4px',border:`2px solid ${newT.remind?'#6B21A8':'#CBD5E1'}`,background:newT.remind?'#6B21A8':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                  {newT.remind&&<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{fontSize:'12px',fontWeight:'600',color:newT.remind?'#6B21A8':'#475569',flex:1}}>{lang==='ar'?'تفعيل المنبه':'Enable Reminder'}</span>
                <span>🔔</span>
              </div>
            </div>
            {tErr&&<div style={{marginTop:'10px',padding:'8px 12px',background:'#FEE2E2',borderRadius:'8px',color:'#DC2626',fontSize:'12px',fontWeight:'700',border:'1px solid #FECACA'}}>{tErr}</div>}
            <div style={{display:'flex',gap:'9px',marginTop:'16px'}}>
              <button onClick={()=>setAddOpen(false)} style={{flex:1,padding:'10px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:'9px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo'}}>{lang==='ar'?'إلغاء':'Cancel'}</button>
              <button onClick={()=>{
                if(!newT.title.trim()){setTErr(lang==='ar'?'اكتب العنوان':'Enter title');return;}
                if(!newT.date){setTErr(lang==='ar'?'اختر التاريخ':'Select date');return;}
                setTasks(p=>[...p,{...newT,id:Date.now(),done:false}]);
                setAddOpen(false);setNewT({title:'',date:'',time:'',type:'task',remind:false});setTErr('');
              }} style={{flex:2,padding:'10px',background:'#1565C0',color:'white',border:'none',borderRadius:'9px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Cairo',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#1976D2'}
                onMouseLeave={e=>e.currentTarget.style.background='#1565C0'}>
                {lang==='ar'?'إضافة':'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}