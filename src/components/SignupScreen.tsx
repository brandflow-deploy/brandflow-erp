import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  User,
  Store,
  ArrowRight,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface SignupScreenProps {
  onBackToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onBackToLogin }) => {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanBrand = brandName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanBrand) {
      setError('يرجى إدخال الاسم واسم البراند');
      return;
    }
    if (!cleanEmail) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          brandName: cleanBrand,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'تعذر إتمام التسجيل، حاول مرة أخرى');
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError('خطأ في الاتصال بالسيرفر، تحقق من الإنترنت وحاول مرة أخرى');
    }
    setBusy(false);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans antialiased text-slate-900"
    >
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-xl flex items-center justify-center mx-auto border border-slate-800 shadow-sm">
            BF
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              براند فلو <span className="text-indigo-600 font-mono text-lg">BrandFlow ERP</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              نظام إدارة الأوردرات والتصنيع والمخزون والعمل الجماعي
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">تسجيل مسوّق جديد</h2>
              <p className="text-xs text-slate-500">
                سجّل بياناتك وبراندك، وسيتم تفعيل حسابك بعد مراجعة الإدارة
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>

          {done ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">تم استلام طلبك بنجاح</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  حسابك الآن قيد المراجعة من الإدارة. بعد الموافقة ستتمكن من تسجيل الدخول
                  ومتابعة أوردرات ومنتجات براندك من نفس الصفحة.
                </p>
              </div>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لتسجيل الدخول</span>
              </button>
            </div>
          ) : (
            <>
              {!supabaseReady && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>التسجيل غير متاح حالياً: قاعدة البيانات السحابية غير مضبوطة.</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {supabaseReady && (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">الاسم بالكامل</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="اسمك"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">اسم البراند</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="اسم البراند الذي تسوّق له"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        dir="ltr"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="8 أحرف على الأقل"
                        dir="ltr"
                        className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-700"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور"
                        dir="ltr"
                        className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{busy ? 'جارٍ إرسال الطلب...' : 'إرسال طلب التسجيل'}</span>
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                لديك حساب بالفعل؟ تسجيل الدخول
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
