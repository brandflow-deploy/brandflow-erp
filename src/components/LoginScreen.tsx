import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, AlertCircle, Wrench } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { isSupabaseConfigured, signInWithPassword } from '../lib/supabase';

interface LoginScreenProps {
  devAuthEnabled: boolean;
  onDevLogin: (rememberMe: boolean) => void;
  onOpenSignup?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ devAuthEnabled, onDevLogin, onOpenSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setBusy(true);
    const { error: signInError } = await signInWithPassword(normalizedEmail, password);
    setBusy(false);

    if (signInError) {
      setError(
        signInError.includes('Invalid login')
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : signInError
      );
    }
    // عند النجاح يلتقط التطبيق الجلسة تلقائياً ويحمّل الملف التعريفي
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

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">تسجيل الدخول للنظام</h2>
              <p className="text-xs text-slate-500">أدخل بيانات حسابك للوصول لصلاحياتك</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>

          {!supabaseReady && !devAuthEnabled && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                قاعدة البيانات السحابية غير مضبوطة بعد. اضبط متغيرات VITE_SUPABASE_URL و
                VITE_SUPABASE_ANON_KEY ثم أعد تشغيل النظام. راجع ملف README لخطوات الإعداد.
              </span>
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
                <label className="font-bold text-slate-700 block mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@brandflow.com"
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>حفظ بيانات الدخول على هذا الجهاز</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>{busy ? 'جارٍ تسجيل الدخول...' : 'دخول إلى لوحة التحكم'}</span>
              </button>
            </form>
          )}

          {devAuthEnabled && (
            <button
              type="button"
              onClick={() => onDevLogin(rememberMe)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Wrench className="w-4 h-4" />
              <span>دخول وضع التطوير المحلي (بدون Supabase)</span>
            </button>
          )}

          {onOpenSignup && supabaseReady && (
            <button
              type="button"
              onClick={onOpenSignup}
              className="w-full text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              مسوّق جديد؟ سجّل حسابك وبراندك من هنا
            </button>
          )}

          <PWAInstallButton variant="card" />
        </div>
      </div>
    </div>
  );
};
