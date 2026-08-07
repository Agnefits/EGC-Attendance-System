import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { getToken, API_BASE_URL, API_ORIGIN } from '../services/api';

const ROLE_LABEL = {
  Admin: { ar: 'مدير النظام', en: 'Admin' },
  Hr: { ar: 'موارد بشرية', en: 'HR' },
  Head: { ar: 'رئيس قسم', en: 'Head' },
  Employee: { ar: 'موظف', en: 'Employee' },
};

function Profile({ lang, user }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', nameEn: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      const data = res?.data;
      setProfile(data);
      setForm({
        name: data?.employee?.name || '',
        nameEn: data?.employee?.nameEn || '',
        phone: data?.employee?.phone || '',
      });
    } catch (e) {
      showToast(e.message || (lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load profile'), 'error');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function saveProfile() {
    if (!form.name.trim()) {
      showToast(lang === 'ar' ? 'الاسم مطلوب' : 'Name is required', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/auth/me', { name: form.name.trim(), nameEn: form.nameEn.trim(), phone: form.phone.trim() });
      showToast(lang === 'ar' ? '✅ تم تحديث البيانات' : '✅ Profile updated');
      setEditMode(false);
      loadProfile();
    } catch (e) {
      showToast(e.message || (lang === 'ar' ? 'فشل تحديث البيانات' : 'Failed to update profile'), 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast(lang === 'ar' ? 'الصور المسموحة: JPG, PNG, WEBP فقط' : 'Only JPG, PNG, or WEBP images are allowed', 'error');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast(lang === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 3 ميجابايت' : 'Image must be under 3MB', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/auth/me/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || (lang === 'ar' ? 'فشل رفع الصورة' : 'Photo upload failed'));

      showToast(lang === 'ar' ? '✅ تم تحديث الصورة الشخصية' : '✅ Profile photo updated');
      loadProfile();
    } catch (err) {
      showToast(err.message || (lang === 'ar' ? 'فشل رفع الصورة' : 'Photo upload failed'), 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }


  async function changePassword() {
    setPwError('');
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError(lang === 'ar' ? 'يرجى تعبئة كل الحقول' : 'Please fill in all fields');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError(lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      showToast(lang === 'ar' ? '✅ تم تغيير كلمة المرور' : '✅ Password changed');
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setPwError(e.message || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  }

  const inp = { width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontFamily: 'Cairo', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box', color: '#0F172A' };
  const inpDisabled = { ...inp, background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' };
  const lbl = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: 'Cairo' }}>{lang === 'ar' ? 'جارِ التحميل...' : 'Loading...'}</div>;
  }

  const emp = profile?.employee;
  const roleLabel = ROLE_LABEL[profile?.role]?.[lang] || profile?.role;

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Cairo,sans-serif', direction: dir, background: '#F1F5F9', minHeight: '100%' }}>

      {toast && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#16A34A', color: 'white', padding: '12px 24px', borderRadius: '14px', zIndex: 9999, fontWeight: '800', fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,.2)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Hero */}
      <div style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '18px', boxShadow: '0 4px 20px rgba(13,59,122,.15)' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D3B7A, #1565C0, #1E88E5)', padding: '24px 26px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
              style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '26px', overflow: 'hidden', cursor: uploadingPhoto ? 'wait' : 'pointer' }}>
              {emp?.photoUrl
                ? <img src={`${API_ORIGIN}${emp.photoUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : ((lang === 'en' ? emp?.nameEn : emp?.name)?.charAt(0) || '?')}
            </div>
            <div onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: '-4px', insetInlineEnd: '-4px', width: '24px', height: '24px', borderRadius: '50%', background: '#1565C0', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingPhoto ? 'wait' : 'pointer', fontSize: '11px' }}
              title={lang === 'ar' ? 'تغيير الصورة' : 'Change photo'}>
              {uploadingPhoto ? '⏳' : '📷'}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginBottom: '3px' }}>{lang === 'ar' ? 'بروفايلي' : 'My Profile'}</div>
            <h1 style={{ margin: 0, fontSize: '21px', fontWeight: '800', color: 'white' }}>{lang === 'en' ? emp?.nameEn : emp?.name}</h1>
            <span style={{ background: 'rgba(255,255,255,.18)', color: 'white', padding: '3px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', marginTop: '6px', display: 'inline-block' }}>{roleLabel}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px', alignItems: 'stretch' }}>

        {/* Personal info card */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{lang === 'ar' ? 'البيانات الشخصية' : 'Personal Information'}</div>
            {!editMode ? (
              <button onClick={() => setEditMode(true)}
                style={{ padding: '7px 16px', background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
              </button>
            ) : (
              <button onClick={() => { setEditMode(false); setForm({ name: emp?.name || '', nameEn: emp?.nameEn || '', phone: emp?.phone || '' }); }}
                style={{ padding: '7px 16px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo' }}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={lbl}>{lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</label>
              {editMode
                ? <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp} />
                : <input value={emp?.name || ''} disabled style={inpDisabled} />}
            </div>
            <div>
              <label style={lbl}>{lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
              {editMode
                ? <input value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} style={inp} dir="ltr" />
                : <input value={emp?.nameEn || ''} disabled style={inpDisabled} dir="ltr" />}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={lbl}>{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
              {editMode
                ? <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inp} dir="ltr" />
                : <input value={emp?.phone || ''} disabled style={inpDisabled} dir="ltr" />}
            </div>
            <div>
              <label style={lbl}>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <input value={profile?.email || ''} disabled style={inpDisabled} dir="ltr" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: editMode ? '18px' : 0 }}>
            <div>
              <label style={lbl}>{lang === 'ar' ? 'القسم' : 'Department'}</label>
              <input value={emp?.department || '—'} disabled style={inpDisabled} />
            </div>
            <div>
              <label style={lbl}>{lang === 'ar' ? 'الكلية' : 'College'}</label>
              <input value={emp?.college || '—'} disabled style={inpDisabled} />
            </div>
          </div>

          {editMode && (
            <button onClick={saveProfile} disabled={savingProfile}
              style={{ width: '100%', padding: '12px', background: '#1565C0', color: 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '800', cursor: savingProfile ? 'default' : 'pointer', fontFamily: 'Cairo', opacity: savingProfile ? 0.7 : 1 }}>
              {savingProfile ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? '💾 حفظ التعديلات' : '💾 Save Changes')}
            </button>
          )}

          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: 'auto', paddingTop: '10px' }}>
            {lang === 'ar' ? 'ملاحظة: القسم والكلية والدور تُدار من الإدارة فقط.' : 'Note: department, college, and role are managed by admin/HR only.'}
          </div>
        </div>

        {/* Change password card */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8EDF5', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
            🔒 {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
            <input type="password" value={pwForm.oldPassword} onChange={e => setPwForm(p => ({ ...p, oldPassword: e.target.value }))} style={inp} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} style={inp} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>{lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
            <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} style={inp} />
          </div>

          {pwError && <div style={{ background: '#FEE2E2', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#991B1B', fontWeight: '700' }}>⚠️ {pwError}</div>}

          <button onClick={changePassword} disabled={savingPw}
            style={{ width: '100%', padding: '12px', background: '#991B1B', color: 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '800', cursor: savingPw ? 'default' : 'pointer', fontFamily: 'Cairo', opacity: savingPw ? 0.7 : 1, marginTop: 'auto' }}>
            {savingPw ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? '🔒 تغيير كلمة المرور' : '🔒 Change Password')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;