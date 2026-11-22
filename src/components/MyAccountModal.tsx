import React, { useState } from 'react';
import { X, UserCircle2, Mail, KeyRound, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { User } from '../types';
import { supabase, getAccessToken } from '../lib/supabase';

interface MyAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

type Feedback = { type: 'ok' | 'err'; text: string } | null;

export const MyAccountModal: React.FC<MyAccountModalProps> = ({ isOpen, onClose, currentUser, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameFeedback, setNameFeedback] = useState<Feedback>(null);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);
  const [passFeedback, setPassFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<'name' | 'email' | 'pass' | null>(null);

  if (!isOpen) return null;

  const callAccountApi = async (payload: Record<string, string>): Promise<string | null> => {
    const token = await getAccessToken();
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error || `حدث خطأ (${res.status})`;
    }
    return null;
  };

  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    if (!supabase || !currentUser.email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email: currentUser.email, password });
    return !error;
  };

  const handleSaveName = async () => {
    if (!name.trim()) return setNameFeedback({ type: 'err', text: 'اكتب الاسم أولاً' });
    setBusy('name');
    setNameFeedback(null);
    const err = await callAccountApi({ name: name.trim() });
    if (err) {
      setNameFeedback({ type: 'err', text: err });
    } else {
      if (supabase) {
        await supabase.auth.updateUser({ data: { name: name.trim() } }).catch(() => undefined);
      }
      onUpdateUser({ ...currentUser, name: name.trim() });
      setNameFeedback({ type: 'ok', text: 'تم حفظ الاسم بنجاح' });
    }
    setBusy(null);
  };

  const handleChangeEmail = async () => {
    const email = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setEmailFeedback({ type: 'err', text: 'اكتب بريد إلكتروني صحيح' });
    }
    if (!emailPassword) {
      return setEmailFeedback({ type: 'err', text: 'أدخل كلمة السر الحالية للتأكيد' });
    }
    setBusy('email');
    setEmailFeedback(null);
    const ok = await verifyCurrentPassword(emailPassword);
    if (!ok) {
      setBusy(null);
      return setEmailFeedback({ type: 'err', text: 'كلمة السر الحالية غير صحيحة' });
    }
    const { error } = await supabase!.auth.updateUser({ email });
    if (error) {
      setBusy(null);
      return setEmailFeedback({ type: 'err', text: error.message.includes('already') ? 'هذا البريد مستخدم في حساب آخر' : 'فشل طلب تغيير البريد' });
    }
    await callAccountApi({ email });
    onUpdateUser({ ...currentUser, email });
    setEmailFeedback({ type: 'ok', text: 'اتبعت لينك تأكيد للبريد الجديد — افتحيه وأكدي التغيير (ممكن يكون في السبام)' });
    setNewEmail('');
    setEmailPassword('');
    setBusy(null);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      return setPassFeedback({ type: 'err', text: 'املأ كلمة السر الحالية والجديدة' });
    }
    if (newPassword.length < 8) {
      return setPassFeedback({ type: 'err', text: 'كلمة السر الجديدة لازم تكون 8 أحرف على الأقل' });
    }
    if (newPassword !== confirmPassword) {
      return setPassFeedback({ type: 'err', text: 'تأكيد كلمة السر الجديدة غير مطابق' });
    }
    setBusy('pass');
    setPassFeedback(null);
    const ok = await verifyCurrentPassword(currentPassword);
    if (!ok) {
      setBusy(null);
      return setPassFeedback({ type: 'err', text: 'كلمة السر الحالية غير صحيحة' });
    }
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    setBusy(null);
    if (error) {
      return setPassFeedback({ type: 'err', text: 'فشل تحديث كلمة السر' });
    }
    setPassFeedback({ type: 'ok', text: 'تم تغيير كلمة السر بنجاح — استخدميها في الدخول القادم' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const feedbackBox = (fb: Feedback) =>
    fb ? (
      <div
        className={`mt-2 flex items-start gap-2 text-xs font-semibold rounded-lg px-3 py-2 border ${
          fb.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}
      >
        {fb.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
        <span>{fb.text}</span>
      </div>
    ) : null;

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" dir="rtl">
      <div className="bg-slate-50 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white rounded-t-2xl sticky top-0">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-indigo-600" />
            حسابي — تعديل البيانات الشخصية
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* الاسم */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">الاسم الظاهر في النظام</h3>
            <div className="flex gap-2">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" />
              <button
                onClick={handleSaveName}
                disabled={busy !== null}
                className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy === 'name' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                حفظ
              </button>
            </div>
            {feedbackBox(nameFeedback)}
          </section>

          {/* البريد الإلكتروني */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              تغيير البريد الإلكتروني
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              الحالي: <span className="font-mono">{currentUser.email}</span> — بعد الطلب بيوصل لينك تأكيد للبريد الجديد، والتغيير بيتم بعد الضغط عليه.
            </p>
            <div className="space-y-2">
              <input className={inputCls} dir="ltr" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="البريد الإلكتروني الجديد" />
              <input className={inputCls} type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="كلمة السر الحالية للتأكيد" />
              <button
                onClick={handleChangeEmail}
                disabled={busy !== null}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {busy === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                إرسال لينك تأكيد للبريد الجديد
              </button>
            </div>
            {feedbackBox(emailFeedback)}
          </section>

          {/* كلمة السر */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              تغيير كلمة السر
            </h3>
            <div className="space-y-2">
              <input className={inputCls} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="كلمة السر الحالية" />
              <input className={inputCls} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة السر الجديدة (8 أحرف على الأقل)" />
              <input className={inputCls} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة السر الجديدة" />
              <button
                onClick={handleChangePassword}
                disabled={busy !== null}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {busy === 'pass' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                تغيير كلمة السر
              </button>
            </div>
            {feedbackBox(passFeedback)}
          </section>
        </div>
      </div>
    </div>
  );
};
