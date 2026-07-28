import React from 'react';
import logo from '../logo.png';

function Header({ lang, setLang, t, user, onLogout }) {
  const dir = lang==='ar'?'rtl':'ltr';

  const ROLE_LABELS = {
    admin:    {ar:'مدير النظام', en:'Admin'},
    hr:       {ar:'موارد بشرية', en:'HR'},
    head:     {ar:'رئيس القسم', en:'Dept Head'},
    employee: {ar:'موظف',        en:'Employee'},
  };

  return (
    <>
      <style>{`
        @keyframes floatLogo {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)}
        }

        /* ── Top bar ── */
        .hdr-top {
          background: #0D3B7A;
          padding: 5px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: Cairo, sans-serif;
          direction: ${dir};
        }
        .hdr-top-left  { font-size:13px; color:rgba(255,255,255,.65); white-space:nowrap; }
        .hdr-top-right { display:flex; align-items:center; gap:14px; }
        .hdr-top-sep   { width:1px; height:12px; background:rgba(255,255,255,.2); }
        .hdr-top-user  { font-size:13px; color:rgba(255,255,255,.65); }
        .hdr-top-btn   { font-size:13px; color:rgba(255,255,255,.65); background:none; border:none; cursor:pointer; font-family:Cairo; padding:0; transition:color .15s; }
        .hdr-top-btn:hover { color:white; }
        .hdr-top-logout { font-size:13px; color:#fca5a5; background:none; border:none; cursor:pointer; font-family:Cairo; padding:0; display:flex; align-items:center; gap:4px; transition:color .15s; }
        .hdr-top-logout:hover { color:#f87171; }

        /* ── Main header ── */
        .hdr-main {
          background: white;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #E8EDF5;
          font-family: Cairo, sans-serif;
          direction: ${dir};
          position: sticky;
          top: 0;
          z-index: 200;
          box-shadow: 0 2px 8px rgba(15,23,42,.06);
        }

        .hdr-brand { display:flex; align-items:center; gap:14px; }
        .hdr-logo-wrap { animation:floatLogo 3.5s ease-in-out infinite; flex-shrink:0; }

        .hdr-univ { border-inline-end: 1.5px solid #E8EDF5; padding-inline-end: 14px; }
        .hdr-univ-name { font-size:17px; font-weight:700; color:#0D3B7A; white-space:nowrap; }
        .hdr-univ-en   { font-size:12px; color:#94A3B8; margin-top:2px; white-space:nowrap; }

        .hdr-system { font-size:15px; color:#1565C0; font-weight:600; white-space:nowrap; }

        .hdr-center {
          position: absolute; left:50%; transform:translateX(-50%);
          text-align: center; pointer-events:none;
        }
        .hdr-center-title { font-size:22px; font-weight:700; color:#1565C0; white-space:nowrap; font-family:Cairo; }
        .hdr-center-sub   { font-size:10px; color:#94A3B8; margin-top:1px; white-space:nowrap; font-family:Cairo; }

        /* Responsive */
        @media (max-width:1023px) {
          .hdr-center       { display:none; }
          .hdr-univ-en      { display:none; }
          .hdr-hamburger    { display:flex !important; }
        }
        @media (max-width:767px) {
          .hdr-system       { display:none; }
          .hdr-top-left     { display:none; }
        }
        @media (max-width:639px) {
          .hdr-main         { padding: 8px 14px; }
          .hdr-top          { padding: 4px 14px; }
          .hdr-univ-name    { font-size:12px; }
          .hdr-top-user     { display:none; }
        }

        .hdr-hamburger {
          display: none; align-items:center; justify-content:center;
          width:32px; height:32px; border-radius:7px;
          background:transparent; border:1px solid #E8EDF5;
          cursor:pointer; flex-shrink:0; transition:background .15s;
        }
        .hdr-hamburger:hover { background:#F1F5F9; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="hdr-top">
        <span className="hdr-top-left">
          {lang==='ar'?'جامعة أسيوط التكنولوجية الدولية — AITU':'Assiut International Technological University — AITU'}
        </span>
        <div className="hdr-top-right">
          <span className="hdr-top-user">
            {lang==='ar'?user.name:user.nameEn} · {ROLE_LABELS[user.role]?.[lang]}
          </span>
          <div className="hdr-top-sep"/>
          <button className="hdr-top-btn" onClick={()=>setLang(lang==='ar'?'en':'ar')}>
            {lang==='ar'?'English':'عربي'}
          </button>
          <div className="hdr-top-sep"/>
          <button className="hdr-top-logout" onClick={onLogout}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {t.logout||'خروج'}
          </button>
        </div>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className="hdr-main">

        {/* Brand: Hamburger + Logo + Name + System */}
        <div className="hdr-brand">
          {/* Hamburger */}
          <button className="hdr-hamburger" onClick={()=>{
            document.querySelector('.sidebar')?.classList.toggle('open');
            document.querySelector('.sidebar-overlay')?.classList.toggle('open');
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Logo */}
          <div className="hdr-logo-wrap">
            <img src={logo} alt="AITU" style={{width:'48px',height:'48px',objectFit:'contain'}}/>
          </div>

          {/* University name */}
          <div className="hdr-univ">
            <div className="hdr-univ-name">
              {lang==='ar'?'جامعة أسيوط التكنولوجية الدولية':'Assiut Int\'l Technological University'}
            </div>
            <div className="hdr-univ-en">
              {lang==='ar'?'Assiut International Technological University':'جامعة أسيوط التكنولوجية الدولية'}
            </div>
          </div>

          {/* System name - removed */}
        </div>

        {/* Center title */}
        <div className="hdr-center">
          <div className="hdr-center-title">
            {lang==='ar'?'نظام تسجيل الحضور والانصراف':'Attendance Management System'}
          </div>
          <div className="hdr-center-sub">
            {lang==='ar'?'Attendance Management System':'نظام تسجيل الحضور والانصراف'}
          </div>
        </div>

        {/* Spacer to balance center */}
        <div style={{flexShrink:0,minWidth:'200px'}}/>
      </header>

      {/* Overlay */}
      <div className="sidebar-overlay" onClick={()=>{
        document.querySelector('.sidebar')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('open');
      }}/>
    </>
  );
}

export default Header;
