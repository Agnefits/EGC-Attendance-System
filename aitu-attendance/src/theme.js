/* ═══════════════════════════════════════════════
   AITU Attendance System — Unified Design System
   Import: import { T, pageWrapper, card, btn, tbl } from '../theme';
═══════════════════════════════════════════════ */

/* ── Color Palette ── */
export const C = {
  /* Backgrounds */
  pageBg:    '#F1F5F9',
  cardBg:    'white',
  stripeBg:  '#FAFBFC',
  hoverRow:  '#F0F7FF',

  /* Borders */
  border:    '#E8EDF5',
  borderMd:  '#E2E8F0',

  /* Text */
  textPrimary:   '#0F172A',
  textSecondary: '#334155',
  textMuted:     '#64748B',
  textFaint:     '#94A3B8',

  /* Brand */
  blue:      '#1565C0',
  blueHover: '#1976D2',
  blueBg:    '#DBEAFE',
  blueBdr:   '#BFDBFE',
  blueLight: '#EFF6FF',

  green:      '#166534',
  greenHover: '#14532D',
  greenBg:    '#DCFCE7',
  greenBdr:   '#BBF7D0',
  greenLight: '#F0FDF4',

  red:      '#991B1B',
  redBg:    '#FEE2E2',
  redBdr:   '#FECACA',

  amber:    '#B45309',
  amberBg:  '#FEF3C7',
  amberBdr: '#FDE68A',

  purple:   '#6B21A8',
  purpleBg: '#EDE9FE',
  purpleBdr:'#DDD6FE',

  /* Overlay */
  overlay: 'rgba(15,23,42,0.55)',
};

/* ── Spacing & Shape ── */
export const S = {
  pagePadding:    '24px 28px',
  cardRadius:     '16px',
  cardRadiusSm:   '12px',
  cardRadiusLg:   '20px',
  modalRadius:    '20px',
  btnRadius:      '10px',
  badgeRadius:    '999px',
  cardShadow:     '0 2px 8px rgba(0,0,0,.04)',
  cardShadowHover:'0 8px 24px rgba(0,0,0,.08)',
  modalShadow:    '0 32px 80px rgba(0,0,0,.22)',
  btnShadowBlue:  '0 4px 12px rgba(21,101,192,.25)',
  btnShadowGreen: '0 4px 12px rgba(22,101,52,.25)',
  btnShadowRed:   '0 4px 12px rgba(153,27,27,.2)',
};

/* ── Typography ── */
export const F = {
  family: 'Cairo, sans-serif',
  h1:     { fontSize:'24px', fontWeight:'800', color:C.textPrimary, margin:0 },
  h2:     { fontSize:'18px', fontWeight:'800', color:C.textPrimary },
  h3:     { fontSize:'15px', fontWeight:'800', color:C.textPrimary },
  label:  { fontSize:'13px', fontWeight:'700', color:'#334155', display:'block', marginBottom:'7px' },
  sub:    { fontSize:'13px', color:C.textFaint, marginTop:'4px', margin:'4px 0 0' },
  badge:  { fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap' },
  th:     { fontSize:'13px', fontWeight:'700', color:'#475569' },
  td:     { fontSize:'14px', color:C.textSecondary },
};

/* ══════════════════════════════════════════════
   STYLE OBJECTS — ready to spread
══════════════════════════════════════════════ */

/* Page wrapper */
export const pageWrap = (dir='rtl') => ({
  padding: S.pagePadding,
  fontFamily: F.family,
  direction: dir,
  background: C.pageBg,
  minHeight: '100%',
});

/* White card */
export const card = (extra={}) => ({
  background: C.cardBg,
  borderRadius: S.cardRadius,
  border: `1px solid ${C.border}`,
  boxShadow: S.cardShadow,
  ...extra,
});

/* Section header divider inside a card */
export const cardHeader = {
  fontSize: '15px',
  fontWeight: '800',
  color: C.textPrimary,
  paddingBottom: '12px',
  marginBottom: '16px',
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

/* Page header row */
export const pageHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '14px',
  marginBottom: '22px',
  paddingBottom: '20px',
  borderBottom: `1.5px solid ${C.border}`,
};

/* Table header cell */
export const thS = {
  background: '#F8FAFC',
  padding: '13px 18px',
  textAlign: 'center',
  fontWeight: '700',
  color: '#475569',
  fontSize: '13px',
  borderBottom: `1.5px solid ${C.borderMd}`,
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

/* Table data cell */
export const tdS = (extra={}) => ({
  padding: '13px 18px',
  borderBottom: `1px solid #F8FAFC`,
  color: C.textSecondary,
  fontSize: '14px',
  textAlign: 'center',
  verticalAlign: 'middle',
  ...extra,
});

/* Input field */
export const inputS = {
  width: '100%',
  padding: '10px 13px',
  border: `1.5px solid ${C.borderMd}`,
  borderRadius: S.btnRadius,
  fontSize: '14px',
  fontFamily: F.family,
  outline: 'none',
  background: 'white',
  boxSizing: 'border-box',
  color: C.textPrimary,
  transition: 'border-color .15s',
};

/* Modal overlay */
export const modalOverlay = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: C.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  backdropFilter: 'blur(4px)',
};

/* Modal box */
export const modalBox = (maxWidth=600, extra={}) => ({
  background: 'white',
  borderRadius: S.modalRadius,
  width: '100%',
  maxWidth,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: S.modalShadow,
  fontFamily: F.family,
  ...extra,
});

/* Modal header */
export const modalHead = {
  padding: '18px 24px',
  borderBottom: `1px solid #F1F5F9`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  background: 'white',
  zIndex: 1,
};

/* Badge */
export const badge = (color, bg, border) => ({
  background: bg,
  color,
  border: `1px solid ${border}`,
  padding: '4px 12px',
  borderRadius: S.badgeRadius,
  fontSize: '12px',
  fontWeight: '700',
  whiteSpace: 'nowrap',
  display: 'inline-block',
});

/* Status meta — single source of truth */
export const STATUS_ATT = {
  present: { label:{ar:'حاضر',  en:'Present'}, color:C.green,  bg:C.greenBg,  border:C.greenBdr },
  late:    { label:{ar:'متأخر', en:'Late'},    color:C.amber,  bg:C.amberBg,  border:C.amberBdr },
  left:    { label:{ar:'انصرف', en:'Left'},    color:C.blue,   bg:C.blueBg,   border:C.blueBdr  },
  absent:  { label:{ar:'غائب',  en:'Absent'},  color:C.red,    bg:C.redBg,    border:C.redBdr   },
};

export const STATUS_LEAVE = {
  pending:  { label:{ar:'معلق',  en:'Pending'},  color:C.amber, bg:C.amberBg, border:C.amberBdr },
  approved: { label:{ar:'موافق', en:'Approved'}, color:C.green, bg:C.greenBg, border:C.greenBdr },
  rejected: { label:{ar:'مرفوض',en:'Rejected'}, color:C.red,   bg:C.redBg,   border:C.redBdr   },
};

/* ══════════════════════════════════════════════
   REUSABLE REACT COMPONENTS
══════════════════════════════════════════════ */

import React from 'react';

/* ── Primary Button ── */
export function Btn({ onClick, color=C.blue, hoverColor=C.blueHover, shadow=S.btnShadowBlue, size='md', children, disabled=false, style={} }) {
  const pad = size==='sm' ? '7px 14px' : size==='lg' ? '12px 26px' : '10px 20px';
  const fz  = size==='sm' ? '12px' : '13px';
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.background=hoverColor; e.currentTarget.style.transform='translateY(-1px)'; }}}
      onMouseLeave={e=>{ e.currentTarget.style.background=color; e.currentTarget.style.transform='translateY(0)'; }}
      style={{ display:'flex', alignItems:'center', gap:'7px', padding:pad, background:color, color:'white', border:'none',
               borderRadius:S.btnRadius, fontSize:fz, fontWeight:'700', cursor:disabled?'not-allowed':'pointer',
               fontFamily:F.family, transition:'all .18s', boxShadow:shadow, opacity:disabled?.5:1, ...style }}>
      {children}
    </button>
  );
}

/* ── Ghost/Outline Button ── */
export function BtnOutline({ onClick, children, size='md', style={} }) {
  const pad = size==='sm' ? '7px 14px' : '10px 20px';
  return (
    <button onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
      onMouseLeave={e=>e.currentTarget.style.background='white'}
      style={{ display:'flex', alignItems:'center', gap:'7px', padding:pad, background:'white', color:'#475569',
               border:`1.5px solid ${C.borderMd}`, borderRadius:S.btnRadius, fontSize:'13px', fontWeight:'700',
               cursor:'pointer', fontFamily:F.family, transition:'all .18s', ...style }}>
      {children}
    </button>
  );
}

/* ── Close (✕) Button ── */
export function BtnClose({ onClick }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,.9)'; e.currentTarget.style.color='white'; }}
      onMouseLeave={e=>{ e.currentTarget.style.background='#F1F5F9'; e.currentTarget.style.color='#475569'; }}
      style={{ background:'#F1F5F9', border:'none', borderRadius:'8px', padding:'8px 14px', cursor:'pointer',
               fontSize:'13px', color:'#475569', fontFamily:F.family, fontWeight:'700', transition:'all .18s' }}>
      ✕
    </button>
  );
}

/* ── Approve Button ── */
export function BtnApprove({ onClick, lang='ar' }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.background=C.greenBdr}
      onMouseLeave={e=>e.currentTarget.style.background=C.greenBg}
      style={{ padding:'6px 14px', background:C.greenBg, color:C.green, border:`1px solid ${C.greenBdr}`,
               borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:F.family, transition:'all .15s' }}>
      {lang==='ar'?'موافقة':'Approve'}
    </button>
  );
}

/* ── Reject Button ── */
export function BtnReject({ onClick, lang='ar' }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.background=C.redBdr}
      onMouseLeave={e=>e.currentTarget.style.background=C.redBg}
      style={{ padding:'6px 14px', background:C.redBg, color:C.red, border:`1px solid ${C.redBdr}`,
               borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:F.family, transition:'all .15s' }}>
      {lang==='ar'?'رفض':'Reject'}
    </button>
  );
}

/* ── Download Icon ── */
export function IconDownload({ size=14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

/* ── Plus Icon ── */
export function IconPlus({ size=14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

/* ── Eye Icon ── */
export function IconEye({ size=14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

/* ── Badge Component ── */
export function StatusBadge({ status, type='att', lang='ar' }) {
  const meta = type==='att' ? STATUS_ATT[status] : STATUS_LEAVE[status];
  if (!meta) return null;
  return (
    <span style={badge(meta.color, meta.bg, meta.border)}>
      {meta.label[lang]}
    </span>
  );
}

/* ── Modal Component ── */
export function Modal({ open, onClose, title, subtitle, footer, maxWidth=1000, lang='ar', children }) {
  if (!open) return null;
  const dir = lang==='ar'?'rtl':'ltr';
  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={e=>e.stopPropagation()}
        style={{ ...modalBox(maxWidth), maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', direction:dir }}>
        <div style={{...modalHead, flexShrink:0}}>
          <div>
            <div style={{fontSize:'16px',fontWeight:'800',color:C.textPrimary}}>{title}</div>
            {subtitle && <div style={{fontSize:'12px',color:C.textFaint,marginTop:'2px'}}>{subtitle}</div>}
          </div>
          <BtnClose onClick={onClose}/>
        </div>
        <div style={{overflowY:'auto',overflowX:'auto',flex:1}}>{children}</div>
        {footer && <div style={{padding:'14px 24px',borderTop:`1px solid #F1F5F9`,background:'#F8FAFC',flexShrink:0}}>{footer}</div>}
      </div>
    </div>
  );
}

/* ── Stat Card ── */
export function StatCard({ icon, label, value, note, color, bg, border, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:'white', borderRadius:S.cardRadius, padding:'20px', border:`1.5px solid ${border}`,
               boxShadow:S.cardShadow, transition:'all .2s ease', display:'flex', alignItems:'center', gap:'16px',
               cursor:onClick?'pointer':'default' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${border}55`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=S.cardShadow; }}>
      <div style={{width:'52px',height:'52px',borderRadius:'14px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {icon}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'14px',color:C.textMuted,fontWeight:'700',marginBottom:'4px'}}>{label}</div>
        <div style={{fontSize:'32px',fontWeight:'900',color,lineHeight:1}}>{value}</div>
        {note && <div style={{fontSize:'12px',color:C.textMuted,fontWeight:'600',marginTop:'4px'}}>{note}</div>}
      </div>
    </div>
  );
}

/* ── Page Header Component ── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={pageHeader}>
      <div>
        <h1 style={F.h1}>{title}</h1>
        {subtitle && <p style={F.sub}>{subtitle}</p>}
      </div>
      {actions && <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>{actions}</div>}
    </div>
  );
}

/* ── Empty State ── */
export function EmptyState({ icon='🔍', title, subtitle }) {
  return (
    <div style={{textAlign:'center',padding:'52px 24px',color:C.textFaint}}>
      <div style={{fontSize:'44px',marginBottom:'14px'}}>{icon}</div>
      <div style={{fontSize:'15px',fontWeight:'700',color:C.textPrimary,marginBottom:'5px'}}>{title}</div>
      {subtitle && <div style={{fontSize:'13px'}}>{subtitle}</div>}
    </div>
  );
}

/* ── Excel Export Helper ── */
export function exportExcel(rows, sheetName, fileName) {
  const XLSX = window.XLSX;
  if (!XLSX) {
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
