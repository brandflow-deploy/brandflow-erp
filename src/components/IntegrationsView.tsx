import React, { useCallback, useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  Link2,
} from 'lucide-react';
import { ShippingCompany, User } from '../types';
import { supabase } from '../lib/supabase';

interface IntegrationsViewProps {
  currentUser: User;
}

interface CompanyRow {
  id: string;
  owner_id: string;
  name: string;
  portal_url: string | null;
  contact_phone: string | null;
  contract_number: string | null;
  notes: string | null;
  status: 'preparing' | 'active';
  created_at: string;
}

const rowToCompany = (r: CompanyRow): ShippingCompany => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  portalUrl: r.portal_url || undefined,
  contactPhone: r.contact_phone || undefined,
  contractNumber: r.contract_number || undefined,
  notes: r.notes || undefined,
  status: r.status,
  createdAt: r.created_at,
});

const companyToRow = (c: ShippingCompany) => ({
  id: c.id,
  owner_id: c.ownerId,
  name: c.name,
  portal_url: c.portalUrl || null,
  contact_phone: c.contactPhone || null,
  contract_number: c.contractNumber || null,
  notes: c.notes || null,
  status: c.status,
});

const genId = () => `ship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ currentUser }) => {
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'preparing' | 'active'>('preparing');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoadError('قسم الربط يحتاج اتصال قاعدة البيانات (غير متاح في وضع التطوير المحلي)');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('shipping_companies')
      .select('*')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (error) {
      setLoadError(error.message || 'تعذر تحميل شركات الشحن');
    } else {
      setCompanies(((data as CompanyRow[]) || []).map(rowToCompany));
    }
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPortalUrl('');
    setContactPhone('');
    setContractNumber('');
    setNotes('');
    setStatus('preparing');
    setFormError(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (c: ShippingCompany) => {
    setEditingId(c.id);
    setName(c.name);
    setPortalUrl(c.portalUrl || '');
    setContactPhone(c.contactPhone || '');
    setContractNumber(c.contractNumber || '');
    setNotes(c.notes || '');
    setStatus(c.status);
    setFormError(null);
    setIsFormOpen(true);
  };

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleSave = async () => {
    if (!supabase) return;
    if (!name.trim()) {
      setFormError('اسم شركة الشحن مطلوب');
      return;
    }
    setSaving(true);
    setFormError(null);
    const company: ShippingCompany = {
      id: editingId || genId(),
      ownerId: currentUser.id,
      name: name.trim(),
      portalUrl: portalUrl.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contractNumber: contractNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('shipping_companies')
      .upsert(companyToRow(company), { onConflict: 'id' });
    setSaving(false);
    if (error) {
      setFormError(error.message || 'فشل الحفظ');
      return;
    }
    setIsFormOpen(false);
    resetForm();
    flashSuccess(editingId ? 'تم تحديث شركة الشحن' : 'تمت إضافة شركة الشحن');
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('shipping_companies').delete().eq('id', id);
    if (!error) {
      setConfirmDeleteId(null);
      flashSuccess('تم حذف شركة الشحن');
      await load();
    } else {
      setLoadError(error.message || 'فشل الحذف');
    }
  };

  const inputCls =
    'w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white';
  const labelCls = 'block text-xs font-bold text-slate-600 mb-1';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-indigo-600" />
            الربط والتكامل
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ربط شركات الشحن والمواقع بالنظام — كل حساب يدير الربط الخاص به
          </p>
        </div>
      </div>

      {/* قسم شركات الشحن */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">شركات الشحن</h2>
              <p className="text-[11px] text-slate-400">
                أضيفي شركات الشحن المتعاقد معاها، والمزامنة التلقائية للحالات تتفعل عند جاهزية الربط
              </p>
            </div>
          </div>
          {!isFormOpen && (
            <button
              onClick={handleStartAdd}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شركة</span>
            </button>
          )}
        </div>

        <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            المزامنة التلقائية (جاري الشحن ← تم التوصيل ← تم التحصيل) هتتفعل لكل شركة لما تعاقدها
            يجهز ونفعّل الربط الفني معاها. سجلي الشركات هنا دلوقتي عشان تكون جاهزة.
          </p>
        </div>

        {successMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{successMsg}</span>
          </div>
        )}

        {isFormOpen && (
          <div className="m-5 p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              {editingId ? 'تعديل شركة شحن' : 'إضافة شركة شحن جديدة'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>اسم الشركة *</label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: ميجا تكنولوجي"
                />
              </div>
              <div>
                <label className={labelCls}>رابط البوابة (اختياري)</label>
                <input
                  className={inputCls}
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>رقم التواصل (اختياري)</label>
                <input
                  className={inputCls}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>رقم/كود التعاقد (اختياري)</label>
                <input
                  className={inputCls}
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>ملاحظات (اختياري)</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>الحالة</label>
                <select
                  className={inputCls}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'preparing' | 'active')}
                >
                  <option value="preparing">قيد التجهيز (التعاقد لسه)</option>
                  <option value="active">مفعّلة (تعاقد قائم)</option>
                </select>
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingId ? 'حفظ التعديلات' : 'إضافة'}</span>
              </button>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="p-5 pt-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">جاري التحميل...</span>
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center gap-2 py-8 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{loadError}</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">لسه مفيش شركات شحن مضافة</p>
              <p className="text-xs text-slate-400 mt-1">
                أضيفي أول شركة من زرار «إضافة شركة» فوق
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {c.status === 'active' ? 'مفعّلة' : 'قيد التجهيز'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 space-x-2" dir="auto">
                        {c.contractNumber && <span>تعاقد: {c.contractNumber}</span>}
                        {c.contactPhone && <span>• {c.contactPhone}</span>}
                        {c.portalUrl && (
                          <span className="inline-flex items-center gap-0.5">
                        • <Globe className="w-3 h-3 inline" /> {c.portalUrl}
                          </span>
                        )}
                      </div>
                      {c.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartEdit(c)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* قسم ربط المواقع — قريبًا */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 overflow-hidden">
        <div className="flex items-center gap-2.5 p-5">
          <span className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-700 text-sm">
              ربط المواقع <span className="text-[10px] text-slate-400">(قريبًا)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              ربط متجرك أو موقعك بالنظام لاستقبال الأوردرات تلقائيًا — جاري تجهيزه
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
