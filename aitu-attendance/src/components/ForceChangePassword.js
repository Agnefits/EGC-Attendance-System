import React, { useState } from 'react';
import logo from '../logo.png';
import api from '../services/api';

function ForceChangePassword({ user, lang, setLang, onDone, onLogout }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(lang === 'ar' ? 'يرجى تعبئة كل الحقول' : 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError(lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      onDone();
    } catch (err) {
      setError(err.message || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(120deg, rgba(21,101,192,0.08), #fff)',
      fontFamily: 'Cairo, sans-serif',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '42px',
        borderRadius: '16px',
        background: 'white',
        boxShadow: '0 30px 80px rgba(0,0,0,0.12)',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden',
          margin: '0 auto 14px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
        }}>
          <img src={logo} alt="AITU" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ fontSize: '30px', marginBottom: '8px' }}>🔒</div>

        <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px', color: '#0F172A' }}>
          {lang === 'ar' ? 'يجب تغيير كلمة المرور' : 'You must change your password'}
        </h1>
        <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '13px', lineHeight: 1.6 }}>
          {lang === 'ar'
            ? `مرحباً ${user?.name || ''} — هذا أول تسجيل دخول لك. يرجى تعيين كلمة مرور جديدة قبل المتابعة.`
            : `Welcome ${user?.nameEn || user?.name || ''} — this is your first login. Please set a new password before continuing.`}
        </p>

        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#64748B' }}>{lang === 'ar' ? 'كلمة المرور المؤقتة' : 'Temporary Password'}</label>
          <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', marginTop: '6px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', fontFamily: 'Cairo', boxSizing: 'border-box', direction: 'ltr' }} />
        </div>
        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#64748B' }}>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', marginTop: '6px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', fontFamily: 'Cairo', boxSizing: 'border-box', direction: 'ltr' }} />
        </div>
        <div style={{ textAlign: 'left', marginBottom: '18px' }}>
          <label style={{ fontSize: '12px', color: '#64748B' }}>{lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '12px', marginTop: '6px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', fontFamily: 'Cairo', boxSizing: 'border-box', direction: 'ltr' }} />
        </div>

        {error && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px' }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            background: '#1565C0', color: 'white', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'Cairo',
            opacity: loading ? .75 : 1,
          }}>
          {loading ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تغيير كلمة المرور والمتابعة' : 'Change Password & Continue')}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{ background: 'transparent', border: '1px solid #E2E8F0', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Cairo' }}>
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
          <button onClick={onLogout}
            style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontFamily: 'Cairo' }}>
            {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForceChangePassword;