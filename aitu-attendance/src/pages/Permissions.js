import React, { useState } from 'react';
import { EMPLOYEES, DEPARTMENTS } from '../data';

const PERMISSION_TYPES = [
  {
    id: 'morning',
    icon: '🌅',
    label: { ar: 'إذن صباحي',    en: 'Morning Permission' },
    desc:  { ar: 'تأخير عن الحضور الرسمي', en: 'Late arrival to work' },
    color: '#B45309', bg: '#FEF3C7', border: '#FDE68A',
  },
  {
    id: 'evening',
    icon: '🌆',
    label: { ar: 'إذن مسائي',    en: 'Evening Permission' },
    desc:  { ar: 'انصراف مبكر من العمل',   en: 'Early departure from work' },
    color: '#6B21A8', bg: '#EDE9FE', border: '#DDD6FE',
  },
  {
    id: 'exceptional',
    icon: '⚡',
    label: { ar: 'إذن استثنائي', en: 'Exceptional Permission' },
    desc:  { ar: 'إذن طارئ لمدة 45 دقيقة فقط', en: 'Emergency — 45 minutes only' },
    color: '#991B1B', bg: '#FEE2E2', border: '#FECACA',
    fixed: 45,
  },
  {
    id: 'nursing',
    icon: '👶',
    label: { ar: 'إذن رضاعة',    en: 'Nursing Permission' },
    desc:  { ar: 'ساعة يومياً ضمن ساعات العمل', en: '1 hour daily within working hours' },
    color: '#BE185D', bg: '#FCE7F3', border: '#FBCFE8',
    womenOnly: true,
  },
];

const STATUS_META = {
  pending:  { label:{ar:'معلق',   en:'Pending'},  color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
  approved: { label:{ar:'موافق',  en:'Approved'}, color:'#14532D', bg:'#DCFCE7', border:'#BBF7D0' },
  rejected: { label:{ar:'مرفوض', en:'Rejected'}, color:'#991B1B', bg:'#FEE2E2', border:'#FECACA' },
};

const MONTHLY_BUDGET = 240;

function Permissions({ lang, user }) {
  const dir   = lang==='ar'?'rtl':'ltr';
  const myEmp = EMPLOYEES.find(e=>e.id===user?.employeeId);
  const myDept = DEPARTMENTS.find(d=>d.id===myEmp?.departmentId);
  const isF   = myEmp?.gender==='female' || user?.gender==='female';

  const [modalOpen,    setModalOpen]    = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [nursingType,  setNursingType]  = useState('');
  const [form,         setForm]         = useState({ date:'', reason:'', duration:60 });
  const [formError,    setFormError]    = useState('');
  const [toast,        setToast]        = useState(null);
  const [showNotif,    setShowNotif]    = useState(false);
  const [notifications] = useState([
    { id:1, title:{ar:'تذكير — إذن الرضاعة',       en:'Nursing reminder'},       desc:{ar:'يرجى اختيار النظام الشهري الجديد',     en:'Please select new monthly system'}, time:{ar:'منذ ساعتين',en:'2h ago'} },
    { id:2, title:{ar:'تم قبول طلبك',               en:'Request approved'},        desc:{ar:'تمت الموافقة على الإذن الصباحي',       en:'Morning permission approved'},        time:{ar:'منذ يوم',   en:'1d ago'} },
  ]);

  const [requests, setRequests] = useState([
    { id:1, type:'morning', date:'2026-05-22', time:'09:00', duration:60, status:'approved' },
  ]);

  const usedMins      = requests.filter(r=>r.type!=='exceptional'&&r.type!=='nursing'&&r.status!=='rejected').reduce((s,r)=>s+r.duration,0);
  const remainingMins = Math.max(0, MONTHLY_BUDGET - usedMins);
  const hasNursing    = requests.some(r=>r.type==='nursing'&&r.status!=='rejected');

  const visibleTypes = PERMISSION_TYPES.filter(pt => !(pt.womenOnly && !isF));

  function showToast(msg, type) {
    setToast({msg, type});
    setTimeout(()=>setToast(null), 3500);
  }

  function openModal(pt) {
    setSelectedType(pt);
    setForm({ date:'', reason:'', duration: pt.fixed||60 });
    setNursingType('');
    setFormError('');
    setModalOpen(true);
  }

  function submitRequest() {
    setFormError('');
    if (selectedType.id==='nursing'&&!nursingType) {
      setFormError(lang==='ar'?'يرجى تحديد نظام إذن الرضاعة':'Select nursing type');
      return;
    }
    if (selectedType.id!=='nursing'&&selectedType.id!=='exceptional'&&!form.date) {
      setFormError(lang==='ar'?'اختر التاريخ':'Select date');
      return;
    }
    if (!form.reason.trim()) {
      setFormError(lang==='ar'?'اكتب السبب':'Enter reason');
      return;
    }
    if ((selectedType.id==='morning'||selectedType.id==='evening')&&form.duration>remainingMins) {
      setFormError(lang==='ar'?`الرصيد المتبقي ${remainingMins} دقيقة فقط`:`Remaining balance: ${remainingMins} min`);
      return;
    }
    const newReq = {
      id: Date.now(),
      type: selectedType.id,
      date: selectedType.id==='nursing'?( lang==='ar'?'شهري':'Monthly') : form.date,
      time: selectedType.id==='morning'? (form.duration===60?'09:00':form.duration===90?'09:30':'10:00')
           :selectedType.id==='evening'? (form.duration===60?'15:00':form.duration===90?'14:30':'14:00')
           :selectedType.id==='nursing'? nursingType
           :'—',
      duration: selectedType.fixed||form.duration,
      reason: form.reason.trim(),
      status: 'pending',
    };
    setRequests(p=>[...p, newReq]);
    showToast(lang==='ar'?'✓ تم إرسال الطلب بنجاح':'✓ Request submitted', 'success');
    setModalOpen(false);
  }

  function deleteRequest(id) {
    setRequests(p=>p.filter(r=>r.id!==id));
    showToast(lang==='ar'?'تم حذف الطلب':'Request deleted', 'success');
  }

  function editRequest(req) {
    const pt = PERMISSION_TYPES.find(p=>p.id===req.type);
    setSelectedType(pt);
    setForm({ date: req.date==='شهري'||req.date==='Monthly'?'':req.date, reason: req.reason||'', duration: req.duration });
    setNursingType('');
    setFormError('');
    setModalOpen(true);
  }

  const thS = { background:'#F8FAFC', padding:'13px 16px', textAlign:'center', fontWeight:'700', color:'#475569', fontSize:'13px', borderBottom:'1.5px solid #E2E8F0', whiteSpace:'nowrap' };
  const tdS = (x={}) => ({ padding:'13px 16px', borderBottom:'1px solid #F8FAFC', fontSize:'14px', textAlign:'center', verticalAlign:'middle', ...x });

  const pt = selectedType;

  return (
    <div style={{ padding:'24px', fontFamily:'Cairo, sans-serif', direction:dir }}>

      {/* Toast */}
      {toast&&(
        <div style={{ position:'fixed', top:'24px', left:'50%', transform:'translateX(-50%)', background:toast.type==='error'?'#DC2626':'#16A34A', color:'white', padding:'14px 28px', borderRadius:'16px', zIndex:9999, fontWeight:'800', fontSize:'14px', boxShadow:'0 12px 32px rgba(0,0,0,.2)', whiteSpace:'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderRadius:'16px', marginBottom:'18px', overflow:'hidden', boxShadow:'0 4px 16px rgba(13,59,122,.15)' }}>
        <div style={{ background:'linear-gradient(135deg,#0D3B7A 0%,#1565C0 60%,#1E88E5 100%)', padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            {myEmp&&(
              <div style={{ width:'46px', height:'46px', borderRadius:'13px', background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'900', fontSize:'19px', flexShrink:0 }}>
                {(lang==='en'?myEmp?.nameEn:myEmp?.name)?.charAt(0)||'?'}
              </div>
            )}
            <div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,.55)', marginBottom:'2px' }}>{lang==='ar'?'إدارة الأذونات':'Permissions'}</div>
              <h1 style={{ margin:0, fontSize:'22px', fontWeight:'800', color:'white' }}>{lang==='ar'?'إدارة الأذونات':'Manage Permissions'}</h1>
              {myEmp&&<div style={{ fontSize:'11px', color:'rgba(255,255,255,.6)', marginTop:'2px' }}>{lang==='en'?myEmp?.nameEn:myEmp?.name} · {user?.role==='hr'?(lang==='en'?'HR Manager':'موارد بشرية'):(lang==='en'?myDept?.nameEn:myDept?.name)}</div>}
            </div>
          </div>
          <p style={{ margin:0, color:'rgba(255,255,255,.6)', fontSize:'12px' }}>
            {new Date().toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
      </div>

      {/* Balance + Cards side by side */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'20px', marginBottom:'20px', alignItems:'center' }}>

      {/* Balance — Circular donut */}
      <div style={{ background:'white', borderRadius:'16px', border:'1px solid #E8EDF5', padding:'20px 24px', marginBottom:'20px', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ fontSize:'14px', fontWeight:'800', color:'#0F172A', marginBottom:'16px' }}>
          {lang==='ar'?'رصيد الأذونات الشهري':'Monthly Permission Balance'}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'28px', flexWrap:'wrap' }}>
          {/* Donut */}
          {(()=>{
            const R=52, C=2*Math.PI*R;
            const usedPct=Math.min(usedMins/MONTHLY_BUDGET,1);
            const remPct=1-usedPct;
            const usedColor=usedMins>=MONTHLY_BUDGET?'#DC2626':'#1565C0';
            return(
              <div style={{ position:'relative', width:'120px', height:'120px', flexShrink:0 }}>
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="#E8EDF5" strokeWidth="12"/>
                  {usedPct>0&&<circle cx="60" cy="60" r={R} fill="none" stroke={usedColor} strokeWidth="12"
                    strokeLinecap="round" strokeDasharray={C}
                    strokeDashoffset={C-(C*usedPct)}
                    style={{ transform:'rotate(-90deg)', transformOrigin:'60px 60px', transition:'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}/>}
                  {remPct>0&&usedPct>0&&<circle cx="60" cy="60" r={R} fill="none" stroke="#BBF7D0" strokeWidth="12"
                    strokeLinecap="round" strokeDasharray={C}
                    strokeDashoffset={C-(C*remPct)}
                    style={{ transform:`rotate(${-90+usedPct*360}deg)`, transformOrigin:'60px 60px', transition:'all 1.2s cubic-bezier(.4,0,.2,1)' }}/>}
                  {usedPct===0&&<circle cx="60" cy="60" r={R} fill="none" stroke="#16A34A" strokeWidth="12"
                    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={0}
                    style={{ transform:'rotate(-90deg)', transformOrigin:'60px 60px' }}/>}
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:'20px', fontWeight:'900', color:usedMins>=MONTHLY_BUDGET?'#DC2626':'#1565C0', lineHeight:1 }}>{remainingMins}</span>
                  <span style={{ fontSize:'9px', color:'#94A3B8', fontWeight:'600', marginTop:'2px' }}>{lang==='ar'?'د متبقي':'min left'}</span>
                </div>
              </div>
            );
          })()}
          {/* Stats */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'8px', minWidth:'200px', maxWidth:'320px' }}>
            {[
              {l:{ar:'الرصيد الكلي',en:'Total'}, v:`${MONTHLY_BUDGET} ${lang==='ar'?'د (4 س)':'min (4h)'}`, c:'#334155', bg:'#F1F5F9', b:'#E2E8F0'},
              {l:{ar:'مستخدم',      en:'Used'},  v:`${usedMins} ${lang==='ar'?'دقيقة':'min'}`,               c:'#1565C0', bg:'#DBEAFE', b:'#BFDBFE'},
              {l:{ar:'متبقي',       en:'Left'},  v:`${remainingMins} ${lang==='ar'?'دقيقة':'min'}`,           c:'#14532D', bg:'#DCFCE7', b:'#BBF7D0'},
            ].map(s=>(
              <div key={s.l.ar} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 12px', background:s.bg, borderRadius:'9px', border:`1px solid ${s.b}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:s.c }}/>
                  <span style={{ fontSize:'12px', color:s.c, fontWeight:'600' }}>{s.l[lang]}</span>
                </div>
                <span style={{ fontSize:'12px', fontWeight:'800', color:s.c, whiteSpace:'nowrap' }}>{s.v}</span>
              </div>
            ))}
            <div style={{ fontSize:'11px', color:'#94A3B8', marginTop:'2px' }}>
              💡 {lang==='ar'?'الاستثنائي وإذن الرضاعة لا يخصمان من الرصيد':'Exceptional & nursing do not deduct from balance'}
            </div>
          </div>
        </div>
      </div>

        {/* Right: nursing banner + cards */}
        <div>
      {/* Nursing lock banner */}
      {hasNursing&&(
        <div style={{ background:'linear-gradient(135deg,#FCE7F3,#FDF2F8)', border:'1.5px solid #FBCFE8', borderRadius:'16px', padding:'14px 18px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'14px', boxShadow:'0 2px 10px rgba(190,24,93,.08)' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'#FCE7F3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>👶</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:'800', color:'#BE185D' }}>{lang==='ar'?'إذن الرضاعة مفعّل':'Nursing Permission Active'}</div>
            <div style={{ fontSize:'12px', color:'#9D174D', marginTop:'3px' }}>
              {lang==='ar'?'لا يمكن تقديم أذونات أخرى أثناء تفعيل إذن الرضاعة — يُرجى إلغاؤه أولاً':'Other permissions are blocked while nursing permission is active — cancel it first'}
            </div>
          </div>
          <span style={{ background:'#FBCFE8', color:'#BE185D', border:'1px solid #F9A8D4', padding:'5px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap' }}>
            🔒 {lang==='ar'?'مقفل':'Locked'}
          </span>
        </div>
      )}
      {/* Type Cards */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'16px', marginBottom:'24px', justifyContent:'center', alignItems:'center' }}>
        {visibleTypes.map(pt=>{
          const isNursingCard = pt.id==='nursing';
          const isLocked      = hasNursing && !isNursingCard;
          return(
            <div key={pt.id}
              onClick={()=>{ if(isLocked){ showToast(lang==='ar'?'🔒 لا يمكن تقديم أذونات أثناء تفعيل إذن الرضاعة':'🔒 Cannot request while nursing permission is active','error'); return; } openModal(pt); }}
              onMouseEnter={e=>{
                if(!isLocked){ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 12px 28px ${pt.border}88`; e.currentTarget.style.border=`1.5px solid ${pt.color}`; }
              }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'; e.currentTarget.style.border=`1.5px solid ${isLocked?'#E2E8F0':pt.border}`; }}
              style={{
                width:'260px', background:isLocked?'#F8FAFC':'white',
                borderRadius:'16px', padding:'22px',
                border:`1.5px solid ${isLocked?'#E2E8F0':pt.border}`,
                cursor:isLocked?'not-allowed':'pointer',
                transition:'all .25s cubic-bezier(.34,1.56,.64,1)',
                boxShadow:'0 2px 8px rgba(0,0,0,.04)',
                opacity:isLocked?0.55:1,
                position:'relative',
              }}>
              {isLocked&&<div style={{ position:'absolute', top:'12px', left:lang==='ar'?'12px':'auto', right:lang==='ar'?'auto':'12px', fontSize:'16px' }}>🔒</div>}
              <div style={{ width:'64px', height:'64px', borderRadius:'16px', background:isLocked?'#F1F5F9':pt.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', marginBottom:'16px', filter:isLocked?'grayscale(60%)':'none' }}>{pt.icon}</div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:isLocked?'#94A3B8':pt.color, marginBottom:'8px' }}>{pt.label[lang]}</div>
              <div style={{ fontSize:'13px', color:isLocked?'#CBD5E1':'#64748B', lineHeight:'1.7', marginBottom:'12px' }}>{pt.desc[lang]}</div>
              <div style={{ fontSize:'12px', color:isLocked?'#94A3B8':pt.color, fontWeight:'700', background:isLocked?'#F1F5F9':pt.bg, padding:'4px 10px', borderRadius:'999px', display:'inline-block' }}>
                {pt.fixed?`${pt.fixed} ${lang==='ar'?'د':'min'} — ${lang==='ar'?'ثابت':'fixed'}`
                :pt.id==='nursing'?( lang==='ar'?'60 د / يوم':'60 min / day')
                :`${lang==='ar'?'ساعة / ساعة ونص / ساعتين':'1h / 1.5h / 2h'}`}
              </div>
            </div>
          );
        })}
      </div>
        </div>
      </div>

      {/* Requests Table */}
      <div style={{ background:'white', borderRadius:'16px', border:'1px solid #E8EDF5', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid #F1F5F9', fontSize:'15px', fontWeight:'800', color:'#0F172A' }}>
          📋 {lang==='ar'?'طلباتي':'My Requests'}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={thS}>{lang==='ar'?'النوع':'Type'}</th>
              <th style={thS}>{lang==='ar'?'التاريخ':'Date'}</th>
              <th style={thS}>{lang==='ar'?'الوقت':'Time'}</th>
              <th style={thS}>{lang==='ar'?'المدة':'Duration'}</th>
              <th style={thS}>{lang==='ar'?'الحالة':'Status'}</th>
              <th style={thS}>{lang==='ar'?'إجراءات':'Actions'}</th>
            </tr></thead>
            <tbody>
              {requests.length===0?(
                <tr><td colSpan="6" style={{ textAlign:'center', padding:'48px', color:'#94A3B8' }}>
                  <div style={{ fontSize:'40px', marginBottom:'10px' }}>📋</div>
                  {lang==='ar'?'لا توجد طلبات بعد':'No requests yet'}
                </td></tr>
              ):requests.map((r,idx)=>{
                const pt2 = PERMISSION_TYPES.find(p=>p.id===r.type);
                const sm  = STATUS_META[r.status];
                return(
                  <tr key={r.id} style={{ background:idx%2===0?'white':'#FAFBFC', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'white':'#FAFBFC'}>
                    <td style={tdS()}>
                      <span style={{ background:pt2?.bg, color:pt2?.color, border:`1px solid ${pt2?.border}`, padding:'5px 14px', borderRadius:'999px', fontSize:'13px', fontWeight:'700', whiteSpace:'nowrap' }}>
                        {pt2?.icon} {pt2?.label[lang]}
                      </span>
                    </td>
                    <td style={tdS({ direction:'ltr', color:'#64748B' })}>{r.date}</td>
                    <td style={tdS({ direction:'ltr', color:'#1565C0', fontWeight:'700' })}>{r.time}</td>
                    <td style={tdS({ fontWeight:'800', color:'#334155' })}>{r.duration} {lang==='ar'?'د':'min'}</td>
                    <td style={tdS()}>
                      <span style={{ background:sm?.bg, color:sm?.color, border:`1px solid ${sm?.border}`, padding:'5px 14px', borderRadius:'999px', fontSize:'13px', fontWeight:'700' }}>
                        {sm?.label[lang]}
                      </span>
                    </td>
                    <td style={tdS()}>
                      {r.status==='pending'?(
                        <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                          <button onClick={()=>editRequest(r)}
                            onMouseEnter={e=>e.currentTarget.style.background='#DBEAFE'}
                            onMouseLeave={e=>e.currentTarget.style.background='#EFF6FF'}
                            style={{ padding:'6px 14px', background:'#EFF6FF', color:'#1565C0', border:'1px solid #BFDBFE', borderRadius:'9px', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', transition:'all .15s' }}>
                            ✏️ {lang==='ar'?'تعديل':'Edit'}
                          </button>
                          <button onClick={()=>deleteRequest(r.id)}
                            onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'}
                            onMouseLeave={e=>e.currentTarget.style.background='#FFF5F5'}
                            style={{ padding:'6px 12px', background:'#FFF5F5', color:'#991B1B', border:'1px solid #FECACA', borderRadius:'9px', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo', transition:'all .15s' }}>
                            🗑
                          </button>
                        </div>
                      ):<span style={{ fontSize:'12px', color:'#94A3B8' }}>{lang==='ar'?'لا يمكن التعديل':'Cannot edit'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen&&pt&&(
        <div onClick={()=>setModalOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px', width:'100%', maxWidth:'560px', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.22)', direction:dir, fontFamily:'Cairo, sans-serif' }}>

            {/* Modal Header */}
            <div style={{ background:pt.bg, padding:'22px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`2px solid ${pt.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'60px', height:'60px', borderRadius:'16px', background:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', boxShadow:`0 4px 12px ${pt.border}` }}>
                  {pt.icon}
                </div>
                <div>
                  <div style={{ fontSize:'18px', fontWeight:'800', color:pt.color }}>{pt.label[lang]}</div>
                  <div style={{ fontSize:'12px', color:'#64748B', marginTop:'3px' }}>{pt.desc[lang]}</div>
                </div>
              </div>
              <button onClick={()=>setModalOpen(false)}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.15)';e.currentTarget.style.color='#DC2626';}}
                onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#475569';}}
                style={{ width:'38px', height:'38px', borderRadius:'10px', border:'none', background:'white', cursor:'pointer', fontSize:'16px', color:'#475569', fontWeight:'700', transition:'all .15s' }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding:'24px 26px' }}>

              {/* Date */}
              {pt.id!=='nursing'&&(
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'700', color:'#475569', marginBottom:'6px' }}>{lang==='ar'?'التاريخ':'Date'} *</label>
                  <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                    style={{ width:'100%', padding:'11px 13px', border:`1.5px solid ${formError&&!form.date?'#FCA5A5':'#E2E8F0'}`, borderRadius:'10px', fontFamily:'Cairo', fontSize:'13px', outline:'none', direction:'ltr', boxSizing:'border-box', background:formError&&!form.date?'#FFF5F5':'white' }}/>
                </div>
              )}

              {/* Duration — morning/evening */}
              {(pt.id==='morning'||pt.id==='evening')&&(
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'700', color:'#475569', marginBottom:'8px' }}>{lang==='ar'?'مدة الإذن':'Duration'}</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
                    {[
                      {val:60,  l:{ar:'ساعة',       en:'1 Hour'},    s:{ar:'60 د',en:'60m'}},
                      {val:90,  l:{ar:'ساعة ونصف',  en:'1.5 Hours'}, s:{ar:'90 د',en:'90m'}},
                      {val:120, l:{ar:'ساعتان',      en:'2 Hours'},   s:{ar:'120 د',en:'120m'}},
                    ].map(opt=>{
                      const sel=form.duration===opt.val;
                      const canSelect=opt.val<=remainingMins;
                      return(
                        <button key={opt.val} type="button" onClick={()=>canSelect&&setForm(p=>({...p,duration:opt.val}))}
                          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'12px 8px', borderRadius:'12px', cursor:canSelect?'pointer':'not-allowed',
                            fontFamily:'Cairo', border:sel?`2px solid ${pt.color}`:'1.5px solid #E2E8F0',
                            background:sel?pt.bg:canSelect?'white':'#F8FAFC',
                            color:sel?pt.color:canSelect?'#475569':'#CBD5E1',
                            opacity:canSelect?1:.5, transition:'all .18s',
                            boxShadow:sel?`0 4px 10px ${pt.border}`:'none',
                          }}>
                          <span style={{ fontSize:'14px', fontWeight:'800' }}>{opt.l[lang]}</span>
                          <span style={{ fontSize:'11px', opacity:.8 }}>{opt.s[lang]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Balance */}
                  <div style={{ marginTop:'10px', background:'#E8EDF5', borderRadius:'999px', height:'5px', overflow:'hidden' }}>
                    <div style={{ width:`${Math.min((usedMins/MONTHLY_BUDGET)*100,100)}%`, background:'#6B21A8', height:'100%', borderRadius:'999px' }}></div>
                  </div>
                  <div style={{ fontSize:'11px', color:remainingMins<=60?'#DC2626':'#94A3B8', marginTop:'4px', fontWeight:remainingMins<=60?'700':'400' }}>
                    {lang==='ar'?`رصيد متبقي: ${remainingMins} دقيقة من أصل ${MONTHLY_BUDGET}`:`Remaining: ${remainingMins} of ${MONTHLY_BUDGET} min`}
                  </div>
                </div>
              )}

              {/* Exceptional notice */}
              {pt.id==='exceptional'&&(
                <div style={{ background:'#FEE2E2', borderRadius:'12px', padding:'14px 16px', marginBottom:'18px', border:'1px solid #FECACA' }}>
                  <div style={{ fontSize:'13px', fontWeight:'700', color:'#991B1B', marginBottom:'4px' }}>⚡ {lang==='ar'?'إذن استثنائي — 45 دقيقة ثابتة':'Exceptional — Fixed 45 minutes'}</div>
                  <div style={{ fontSize:'11px', color:'#B91C1C' }}>{lang==='ar'?'لا يخصم من رصيد الأذونات الشهري':'Does NOT deduct from monthly balance'}</div>
                </div>
              )}

              {/* Nursing type */}
              {pt.id==='nursing'&&(
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'700', color:'#475569', marginBottom:'8px' }}>{lang==='ar'?'نظام إذن الرضاعة':'Nursing Type'} *</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                    {[
                      {val:'صباحي',label:{ar:'رضاعة صباحية',en:'Morning Nursing'}},
                      {val:'مسائي',label:{ar:'رضاعة مسائية',en:'Evening Nursing'}},
                    ].map(opt=>{
                      const sel=nursingType===opt.val;
                      return(
                        <button key={opt.val} type="button" onClick={()=>setNursingType(opt.val)}
                          style={{ padding:'14px', borderRadius:'12px', cursor:'pointer', fontFamily:'Cairo', fontSize:'13px', fontWeight:'700',
                            border:sel?`2px solid ${pt.color}`:'1.5px solid #E2E8F0',
                            background:sel?pt.bg:'white', color:sel?pt.color:'#475569',
                            transition:'all .18s', boxShadow:sel?`0 4px 10px ${pt.border}`:'none',
                          }}>{opt.label[lang]}</button>
                      );
                    })}
                  </div>
                  <div style={{ background:pt.bg, padding:'12px 14px', borderRadius:'10px', fontSize:'12px', color:pt.color, fontWeight:'600', lineHeight:'1.8', border:`1px solid ${pt.border}` }}>
                    {lang==='ar'?'يتم تحديد إذن الرضاعة شهرياً، ويمكن اختيار النظام الصباحي أو المسائي مرة واحدة كل شهر.':'Nursing permission is set monthly — choose morning or evening once per month.'}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom:'18px' }}>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'700', color:'#475569', marginBottom:'6px' }}>{lang==='ar'?'السبب':'Reason'} *</label>
                <input value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}
                  placeholder={lang==='ar'?'مثال: موعد طبي، ظرف عائلي...':'e.g. Medical appointment...'}
                  style={{ width:'100%', padding:'11px 13px', border:`1.5px solid ${formError&&!form.reason?'#FCA5A5':'#E2E8F0'}`, borderRadius:'10px', fontFamily:'Cairo', fontSize:'13px', outline:'none', boxSizing:'border-box', background:formError&&!form.reason?'#FFF5F5':'white' }}/>
              </div>

              {formError&&<div style={{ background:'#FEE2E2', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px', fontSize:'13px', color:'#991B1B', fontWeight:'700' }}>⚠️ {formError}</div>}

              <div style={{ display:'flex', gap:'12px' }}>
                <button onClick={submitRequest}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.9'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='1'}
                  style={{ flex:1, padding:'13px', background:pt.color, color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', fontFamily:'Cairo', boxShadow:`0 4px 14px ${pt.border}`, transition:'opacity .18s' }}>
                  {pt.icon} {lang==='ar'?'إرسال الطلب':'Submit Request'}
                </button>
                <button onClick={()=>setModalOpen(false)}
                  style={{ padding:'13px 20px', background:'#F1F5F9', color:'#475569', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo' }}>
                  {lang==='ar'?'إلغاء':'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Permissions;