import React, { useState } from 'react';
import logo from '../logo.png';
import background from '../background.png';
import { authService } from '../services';

function LoginPage({ onLogin, lang, setLang, t }) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError(lang === 'ar' ? 'يرجى إدخال البيانات' : 'Please enter credentials'); return; }
    setLoading(true); setError('');
    try {
      const user = await authService.login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || t.wrongCredentials);
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(em, pass) { setEmail(em); setPassword(pass); setError(''); }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: `linear-gradient(120deg, rgba(21,101,192,0.08), #fff), url(${background})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fontFamily: 'Cairo, sans-serif',
      padding: '20px',
      boxSizing: 'border-box',
    }}>

      {/* ── CARD ── */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '42px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.12)',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}>

        {/* LOGO */}
        <div style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          overflow: 'hidden',
          margin: '0 auto 10px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
          animation: 'logoFloat 3.5s ease-in-out infinite',
          flexShrink: 0,
        }}>
          <img src={logo} alt="AITU" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* TITLE */}
        <h1 style={{ fontSize: '38px', fontWeight: '800', margin: '0', color: '#1565C0', fontFamily: 'Cairo' }}>AITU</h1>

        {/* SYSTEM NAME */}
        <p style={{ margin: '6px 0 10px', color: '#1D4ED8', fontSize: '20px', fontWeight: '600', fontFamily: 'Cairo' }}>
          {lang === 'ar' ? 'نظام تسجيل الحضور والغياب' : 'Attendance Management System'}
        </p>

        {/* UNIVERSITY */}
        <p style={{ margin: '0 0 18px', color: '#475569', fontSize: '22px', fontWeight: '600', direction: 'rtl', fontFamily: 'Cairo', lineHeight: 1.4 }}>
          جَامِعَةُ أَسْيُوطَ التِّكْنُولُوجِيَّةُ الدَّوْلِيَّةُ
        </p>

        {/* EMAIL */}
        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#64748B', fontFamily: 'Cairo' }}>
            {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '12px', marginTop: '6px',
              borderRadius: '10px', border: '1px solid #E2E8F0',
              outline: 'none', fontSize: '14px', fontFamily: 'Cairo',
              boxSizing: 'border-box', direction: 'ltr',
            }}
          />
        </div>

        {/* PASSWORD */}
        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#64748B', fontFamily: 'Cairo' }}>
            {lang === 'ar' ? 'كلمة المرور' : 'Password'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '12px 70px 12px 12px', marginTop: '6px',
                borderRadius: '10px', border: '1px solid #E2E8F0',
                outline: 'none', fontSize: '14px', fontFamily: 'Cairo',
                boxSizing: 'border-box', direction: 'ltr',
              }}
            />
            <button onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)',
                border: 'none', background: 'none', color: '#1565C0',
                fontWeight: '600', cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Cairo',
              }}>
              {showPass ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '10px', fontFamily: 'Cairo' }}>
            {error}
          </div>
        )}

        {/* LOGIN BUTTON */}
        <button onClick={handleLogin} disabled={loading}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1976D2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1565C0'; }}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            background: '#1565C0', color: 'white', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontFamily: 'Cairo',
            opacity: loading ? .75 : 1, transition: 'all .18s',
          }}>
          {loading
            ? (lang === 'ar' ? 'جاري الدخول...' : 'Loading...')
            : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')
          }
        </button>

        {/* DEMO USERS 
        <div style={{marginTop:'16px',fontSize:'12px',color:'#64748B',fontFamily:'Cairo'}}>
          {[
            {label:'Admin', email:'admin@aitu.edu', color:'#1565C0'},
            {label:'Head',  email:'head@aitu.edu',  color:'#B45309'},
            {label:'Employee', email:'emp@aitu.edu',color:'#64748B'},
            {label:'HR',    email:'hr@aitu.edu',    color:'#166534'},
          ].map(u=>(
            <div key={u.email}
              onClick={()=>quickLogin(u.email,'123456')}
              onMouseEnter={e=>e.currentTarget.style.opacity='.7'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}
              style={{cursor:'pointer',padding:'3px 0',color:u.color,fontWeight:'600',transition:'opacity .15s'}}>
              {u.label}
            </div>
          ))}
        </div>
        */}
        {/* LANGUAGE */}
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          style={{
            marginTop: '14px', background: 'transparent',
            border: '1px solid #E2E8F0', padding: '8px 16px',
            borderRadius: '8px', cursor: 'pointer',
            fontSize: '12px', fontFamily: 'Cairo', transition: 'all .15s',
          }}>
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>

      </div>

      <style>{`
        @keyframes logoFloat {
          0%,100% { transform:translateY(0px);  }
          50%      { transform:translateY(-12px); }
        }
        /* Responsive card padding on small screens */
        @media (max-width: 480px) {
          .login-card-inner { padding: 28px 22px !important; }
          .login-logo       { width:100px !important; height:100px !important; }
          .login-h1         { font-size:28px !important; }
          .login-system     { font-size:16px !important; }
          .login-univ       { font-size:16px !important; }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
