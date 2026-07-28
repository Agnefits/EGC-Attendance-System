import React from 'react';

function Sidebar({ activePage, setActivePage, t, role, lang }) {
  const dir = lang==='ar'?'rtl':'ltr';

  const allPages = [
    { id:'dashboard',       label:{ar:'الرئيسية',              en:'Home'},               icon:'grid',     roles:['admin','head','employee','hr'] },
    { id:'attendance',      label:{ar:role==='employee'?'تسجيل الحضور':'سجل الحضور', en:role==='employee'?'Check In':'Attendance'}, icon:'clock', roles:['admin','employee','hr'] },
    { id:'hrMyAttendance', label:{ar:'حضوري',        en:'My Attendance'},   icon:'user_clock', roles:['hr'] },
    { id:'hrLeaves',       label:{ar:'إجازاتي',      en:'My Leaves'},       icon:'calendar',   roles:['hr'] },
    { id:'hrPermissions',  label:{ar:'أذوناتي',       en:'My Permissions'},  icon:'key',        roles:['hr'] },
    { id:'employees',       label:{ar:'إدارة الموظفين',        en:'Employees'},          icon:'users',    roles:['admin','head','hr'] },
    { id:'structure',       label:{ar:'الهيكل التنظيمي',       en:'Structure'},          icon:'sitemap',  roles:['admin','hr'] },
    { id:'leaves',          label:{ar:role==='employee'?'طلب إجازة':'تنظيم مواعيد العمل والمنح', en:role==='employee'?'Leave Request':'Work Schedule & Leave Mgmt'}, icon:'calendar', roles:['admin','employee'] },
    { id:'permissions',     label:{ar:'طلب إذن',               en:'Permissions'},        icon:'key',      roles:['employee'] },
    { id:'headLeaves',      label:{ar:'إجازات القسم',          en:'Dept Leaves'},        icon:'calendar', roles:['head'] },
    { id:'headPermissions', label:{ar:'أذونات القسم',          en:'Dept Permissions'},   icon:'key',      roles:['head'] },
    { id:'reports',         label:{ar:'التقارير والإحصاء',     en:'Reports'},            icon:'chart',    roles:['admin','head','hr'] },
  ];

  const pages = allPages.filter(p=>p.roles.includes(role));

  const icons = {
    grid:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    clock:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    users:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    sitemap:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="4"/><rect x="3" y="14" width="6" height="4"/><rect x="15" y="14" width="6" height="4"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="12" y1="11" x2="6" y2="14"/><line x1="12" y1="11" x2="18" y2="14"/></svg>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    key:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    user_clock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h2"/><circle cx="19" cy="17" r="3"/><polyline points="19 15 19 17 21 17"/></svg>,
    chart:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  };

  const roleLabel = {
    admin:    {ar:'مدير النظام', en:'System Admin'},
    head:     {ar:'رئيس القسم', en:'Dept Head'},
    employee: {ar:'موظف',        en:'Employee'},
    hr:       {ar:'موارد بشرية', en:'HR Manager'},
  };

  return (
    <aside style={{
      width:'230px', minWidth:'230px',
      background:'white',
      borderInlineEnd:'1px solid #E2E8F0',
      display:'flex', flexDirection:'column',
      fontFamily:'Cairo, sans-serif',
      direction:dir,
      height:'100vh',
      position:'sticky',
      top:0,
      overflow:'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding:'16px 18px',
        borderBottom:'1px solid #E2E8F0',
        flexShrink:0,
      }}>
        <div style={{fontSize:'12px',fontWeight:'800',color:'#0F172A',lineHeight:1.4}}>
          {lang==='ar'?'نظام تسجيل الحضور والانصراف':'Attendance Management System'}
        </div>
      </div>

      {/* ── Role badge ── */}
      <div style={{padding:'10px 14px',borderBottom:'1px solid #F1F5F9',flexShrink:0}}>
        <div style={{
          display:'flex', alignItems:'center', gap:'8px',
          padding:'8px 12px',
          background:'#F8FAFC',
          borderRadius:'8px',
          border:'1px solid #E8EDF5',
        }}>
          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#16A34A',flexShrink:0}}></div>
          <span style={{fontSize:'13px',fontWeight:'700',color:'#334155'}}>{roleLabel[role]?.[lang]}</span>
        </div>
      </div>

      {/* ── Nav (scrollable) ── */}
      <nav style={{
        flex:1,
        minHeight:0,
        overflowY:'auto',
        overflowX:'hidden',
        padding:'8px 10px',
        display:'flex',
        flexDirection:'column',
        gap:'1px',
      }}>
        {pages.map(page=>{
          const active = activePage===page.id;
          return(
            <button key={page.id} onClick={()=>setActivePage(page.id)}
              style={{
                display:'flex', alignItems:'center', gap:'10px',
                padding:'10px 14px',
                borderRadius:'8px',
                border:'none',
                cursor:'pointer',
                fontFamily:'Cairo',
                fontSize:'13px',
                fontWeight: active?'700':'500',
                textAlign: lang==='ar'?'right':'left',
                width:'100%',
                direction:dir,
                transition:'all .15s ease',
                background: active?'#EFF6FF':'transparent',
                color: active?'#1565C0':'#475569',
                borderInlineStart: active?'3px solid #1565C0':'3px solid transparent',
                flexShrink:0,
              }}
              onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.color='#1E293B'; }}}
              onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#475569'; }}}>
              <span style={{
                flexShrink:0,
                opacity: active?1:0.6,
                color: active?'#1565C0':'currentColor',
                display:'flex', alignItems:'center',
              }}>
                {icons[page.icon]}
              </span>
              <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {page.label[lang]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding:'12px 14px',
        borderTop:'1px solid #F1F5F9',
        flexShrink:0,
      }}>
        <div style={{fontSize:'10px',color:'#94A3B8',textAlign:'center',fontWeight:'500'}}>
          AITU © {new Date().getFullYear()}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;