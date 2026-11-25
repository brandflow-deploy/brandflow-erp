import React, { useEffect, useRef, useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  ShieldCheck,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  Cloud,
  Eye,
  EyeOff,
  BadgePercent,
} from 'lucide-react';
import { Brand, User, UserRole } from '../types';
import { getAccessToken, isSupabaseConfigured, testSupabaseConnection } from '../lib/supabase';

interface TeamSettingsViewProps {
  users: User[];
  brands: Brand[];
  currentUser: User;
  ordersCount: number;
  onProfileSaved: (u: User) => void;
  onDeleteUser: (userId: string) => void;
  onClearDemoOrders: () => void;
  onResetToDemoData: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<{ ok: boolean; message: string }>;
  commissionDueDelayDays?: number;
  onCommissionDueDelayChange?: (days: number) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'المدير العام',
  moderator: 'مسؤول مبيعات',
  production: 'مسؤول تصنيع ومخزن',
  shipping: 'مسؤول شحن',
  affiliate: 'مسوّق بالعمولة',
  subscriber: 'عميل مشترك',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'صلاحية كاملة: الأرباح، التكاليف، الفريق، والحذف',
  moderator: 'الأوردرات والرئيسية بدون أرباح، البراندات للعرض فقط',
  production: 'التصنيع والمخزن وأوردرات التجهيز فقط',
  shipping: 'أوردرات الشحن والتسليم للبراندات المحددة فقط، بدون أرباح أو تكاليف',
  affiliate: 'براند واحد خاص به: يسجّل أوردراته ويتابعها ويرى منتجاته ومخزونها وعمولته، بدون تكاليف',
  subscriber: 'براند واحد خاص به مثل المسوّق، لكن يرى تكاليف منتجاته وأوردراته ومكسبه منها',
};

async function adminHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = (await getAccessToken()) || window.__DEV_TOKEN__;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const TeamSettingsView: React.FC<TeamSettingsViewProps> = ({
  users,
  brands,
  currentUser,
  ordersCount,
  onProfileSaved,
  onDeleteUser,
  onClearDemoOrders,
  onResetToDemoData,
  onExportBackup,
  onImportBackup,
  commissionDueDelayDays = 0,
  onCommissionDueDelayChange,
}) => {
  const supabaseReady = isSupabaseConfigured();

  // حالة نموذج الإضافة/التعديل
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<UserRole>('moderator');
  const [allBrands, setAllBrands] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [delayInput, setDelayInput] = useState<string>(String(commissionDueDelayDays));
  useEffect(() => {
    setDelayInput(String(commissionDueDelayDays));
  }, [commissionDueDelayDays]);

  // الموافقة على حساب معلّق مع تحديد نوعه (مسوّق بالعمولة أو عميل مشترك)
  const handleApprove = async (u: User) => {
    const chosenRole = pendingRoles[u.id] || u.role;
    const headers = await adminHeaders();
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isActive: true, role: chosenRole }),
    });
    if (res.ok) {
      onProfileSaved({ ...u, isActive: true, role: chosenRole });
    } else {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error || 'فشل تفعيل المستخدم');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setName('');
    setEmail('');
    setPassword('');
    setRole('moderator');
    setAllBrands(true);
    setSelectedBrands([]);
    setFormError(null);
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setShowForm(true);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    const access = u.brandsAccess || ['all'];
    setAllBrands(access.includes('all'));
    setSelectedBrands(access.filter((b) => b !== 'all'));
    setFormError(null);
  };

  const toggleBrand = (id: string) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      setFormError('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }
    if (!editingId && password.length < 8) {
      setFormError('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }
    if (password && password.length < 8) {
      setFormError('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }
    const brandsAccess = allBrands ? ['all'] : selectedBrands;
    if (brandsAccess.length === 0) {
      setFormError('اختر برانداً واحداً على الأقل أو "كل البراندات"');
      return;
    }

    setBusy(true);
    try {
      const headers = await adminHeaders();
      if (editingId) {
        const res = await fetch(`/api/admin/users/${editingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: cleanName,
            role,
            brandsAccess,
            ...(password ? { password } : {}),
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError(body.error || 'فشل تحديث المستخدم');
          setBusy(false);
          return;
        }
        const existing = users.find((u) => u.id === editingId);
        if (existing) {
          onProfileSaved({ ...existing, name: cleanName, role, brandsAccess });
        }
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
            role,
            brandsAccess,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError(body.error || 'فشل إنشاء المستخدم');
          setBusy(false);
          return;
        }
        if (body.user) {
          onProfileSaved({
            id: body.user.id,
            name: body.user.name,
            email: body.user.email,
            role: body.user.role,
            isActive: true,
            isOwner: false,
            createdAt: body.user.created_at,
            brandsAccess: body.user.brands_access,
          });
        }
      }
      resetForm();
    } catch (err: any) {
      setFormError(err?.message || 'خطأ في الاتصال بالسيرفر');
    }
    setBusy(false);
  };

  const handleToggleActive = async (u: User) => {
    const headers = await adminHeaders();
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isActive: u.isActive === false ? true : false }),
    });
    if (res.ok) {
      onProfileSaved({ ...u, isActive: u.isActive === false ? true : false });
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`حذف حساب "${u.name}" نهائياً؟ لن يتمكن من الدخول للنظام.`)) return;
    const headers = await adminHeaders();
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', headers });
    if (res.ok) {
      onDeleteUser(u.id);
    } else {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error || 'فشل حذف المستخدم');
    }
  };

  const handleTestCloud = async () => {
    setCloudStatus('جارٍ فحص الاتصال...');
    const res = await testSupabaseConnection();
    setCloudStatus(res.message);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await onImportBackup(file);
    setImportMessage(res.message);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* رأس الصفحة */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>فريق العمل والإعدادات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة حسابات الدخول والصلاحيات وبراندات كل مستخدم، وإعدادات البيانات والنسخ الاحتياطي
          </p>
        </div>
        {supabaseReady && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      {!supabaseReady && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            إدارة المستخدمين تتطلب ربط قاعدة بيانات Supabase (وضع التطوير المحلي يعمل بحساب مدير
            واحد فقط). اضبط متغيرات البيئة كما في ملف README لتفعيل تعدد المستخدمين.
          </span>
        </div>
      )}

      {/* طلبات التسجيل الجديدة بانتظار الموافقة */}
      {supabaseReady && users.some((u) => u.isActive === false && !u.isOwner) && (
        <div className="bg-amber-50 rounded-2xl border border-amber-300 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>طلبات تسجيل بانتظار الموافقة</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {users.filter((u) => u.isActive === false && !u.isOwner).length}
            </span>
          </h2>
          <p className="text-[11px] text-amber-800">
            هذه الحسابات سجّلت من صفحة التسجيل العامة (أو عُطّلت سابقاً) ولا تستطيع الدخول حتى
            توافقي عليها. الموافقة تفعّل الحساب فوراً، والرفض يحذفه نهائياً مع برانده إن كان
            مسوّقاً جديداً.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {users
              .filter((u) => u.isActive === false && !u.isOwner)
              .map((u) => {
                const access = u.brandsAccess || [];
                const accessLabel = access
                  .filter((id) => id !== 'all')
                  .map((id) => brands.find((b) => b.id === id)?.name || id)
                  .join('، ');
                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-xl border border-amber-200 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {u.email}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                    {accessLabel && (
                      <p className="text-[11px] text-slate-500">
                        <span className="font-bold text-slate-600">البراند: </span>
                        {accessLabel}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                      <select
                        aria-label="نوع الحساب"
                        value={pendingRoles[u.id] || u.role}
                        onChange={(e) =>
                          setPendingRoles((prev) => ({ ...prev, [u.id]: e.target.value as UserRole }))
                        }
                        className="px-2 py-1.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="affiliate">مسوّق بالعمولة</option>
                        <option value="subscriber">عميل مشترك</option>
                      </select>
                      <button
                        onClick={() => handleApprove(u)}
                        className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>موافقة وتفعيل</span>
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>رفض وحذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل مستخدم */}
      {showForm && supabaseReady && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {editingId ? 'تعديل بيانات مستخدم' : 'إضافة مستخدم جديد'}
            </h2>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">الاسم</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="اسم الموظف"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                dir="ltr"
                disabled={Boolean(editingId)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                placeholder="name@brandflow.com"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                {editingId ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="8 أحرف على الأقل"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">الدور والصلاحية</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          </div>

          <div className="text-xs">
            <label className="font-bold text-slate-700 block mb-1.5">البراندات المسموح له برؤيتها</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllBrands(true)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                  allBrands
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                كل البراندات
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setAllBrands(false);
                    toggleBrand(b.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    !allBrands && selectedBrands.includes(b.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              مثال: اجعل مسؤول الشحن يرى برانده فقط باختيار براند واحد بدل "كل البراندات"
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors"
            >
              {busy ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إنشاء الحساب'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* قائمة المستخدمين */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>المستخدمون المسجلون ({users.length})</span>
        </h2>

        {users.length === 0 && (
          <p className="text-xs text-slate-400 py-4 text-center">
            {supabaseReady
              ? 'لا يوجد مستخدمون بعد. أضف أول مستخدم من الزر أعلاه.'
              : 'وضع التطوير المحلي: حساب مدير واحد فقط.'}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => {
            const access = u.brandsAccess || ['all'];
            const accessLabel = access.includes('all')
              ? 'كل البراندات'
              : access
                  .map((id) => brands.find((b) => b.id === id)?.name || id)
                  .join('، ');
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className={`p-4 rounded-xl border space-y-2 ${
                  u.isActive === false ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{u.name}</span>
                      {u.isOwner && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                          المالك
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">
                          أنت
                        </span>
                      )}
                      {u.isActive === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                          معطّل
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                      {u.email}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  <span className="font-bold text-slate-600">يرى: </span>
                  {accessLabel}
                </p>

                {supabaseReady && !isSelf && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => startEdit(u)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {u.isActive === false ? 'تفعيل' : 'تعطيل'}
                    </button>
                    {!u.isOwner && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* إعدادات استحقاق عمولة المسوّق — للإدارة فقط */}
      {currentUser.role === 'admin' && supabaseReady && onCommissionDueDelayChange && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-violet-600" />
            <span>إعدادات استحقاق العمولة</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            عمولة المسوّق تُصبح <b>مستحقة الصرف</b> بعد تسليم الأوردر وتحصيل قيمته. تقدري تحددي
            عدد أيام انتظار إضافية بعد التسليم قبل اعتبار العمولة مستحقة (0 = مستحقة فور
            التسليم والتحصيل).
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-slate-700">أيام الانتظار بعد التسليم:</label>
            <input
              type="number"
              min={0}
              max={90}
              value={delayInput}
              onChange={(e) => setDelayInput(e.target.value)}
              className="w-24 px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={() => {
                const n = Math.max(0, Math.min(90, parseInt(delayInput, 10) || 0));
                setDelayInput(String(n));
                onCommissionDueDelayChange(n);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
            >
              حفظ الإعداد
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            الإعداد الحالي: {commissionDueDelayDays === 0 ? 'مستحقة فور التسليم والتحصيل' : `مستحقة بعد ${commissionDueDelayDays} يوم من التسليم والتحصيل`}
          </p>
        </div>
      )}

      {/* إعدادات البيانات */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>البيانات والنسخ الاحتياطي</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            onClick={onExportBackup}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-right space-y-1"
          >
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>تنزيل نسخة احتياطية كاملة</span>
            </div>
            <p className="text-[11px] text-slate-500">ملف JSON بكل البراندات والمنتجات والأوردرات</p>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-right space-y-1"
          >
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>استيراد نسخة احتياطية</span>
            </div>
            <p className="text-[11px] text-slate-500">استعادة البيانات من ملف نسخة سابقة</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {importMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            onClick={() => {
              if (window.confirm('تحميل بيانات تجريبية (براندات ومنتجات وأوردرات وهمية) لغرض التجربة؟ يمكن مسحها لاحقاً.')) {
                onResetToDemoData();
              }
            }}
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors text-right space-y-1"
          >
            <div className="font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>تحميل بيانات تجريبية للتجربة</span>
            </div>
            <p className="text-[11px] text-amber-700">
              حزمة وهمية واضحة للتدريب على النظام - ليست بيانات حقيقية
            </p>
          </button>

          <button
            onClick={() => {
              if (window.confirm(`حذف كل الأوردرات (${ordersCount}) نهائياً؟ لا يمكن التراجع.`)) {
                onClearDemoOrders();
              }
            }}
            className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors text-right space-y-1"
          >
            <div className="font-bold text-rose-800 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>تفريغ كل الأوردرات</span>
            </div>
            <p className="text-[11px] text-rose-700">يمسح كل الأوردرات ويبدأ عدّاد المبيعات من الصفر</p>
          </button>
        </div>

        {/* حالة الاتصال السحابي */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-bold">
            <Cloud className="w-4 h-4 text-indigo-600" />
            <span>قاعدة البيانات السحابية (Supabase)</span>
          </div>
          <button
            onClick={handleTestCloud}
            className="px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            فحص الاتصال
          </button>
        </div>
        {cloudStatus && (
          <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold">
            {cloudStatus}
          </div>
        )}
      </div>
    </div>
  );
};
