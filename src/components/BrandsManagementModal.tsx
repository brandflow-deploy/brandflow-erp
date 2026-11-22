import React, { useState } from 'react';
import { X, Tag, Plus, CheckCircle, ShieldCheck, DollarSign, Package, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Brand, Order, User, CurrencyConfig } from '../types';
import { formatCurrency } from '../utils/calculations';

interface BrandsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  orders: Order[];
  currentUser: User;
  currency: CurrencyConfig;
  onAddBrand: (brand: Brand) => void;
  onUpdateBrand: (brand: Brand) => void;
  onDeleteBrand?: (brandId: string) => void;
}

export const BrandsManagementModal: React.FC<BrandsManagementModalProps> = ({
  isOpen,
  onClose,
  brands,
  orders,
  currentUser,
  currency,
  onAddBrand,
  onUpdateBrand,
  onDeleteBrand,
}) => {
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoColor, setLogoColor] = useState('indigo');
  const [description, setDescription] = useState('');
  const [defaultCustomerShipping, setDefaultCustomerShipping] = useState<number>(65);
  const [defaultActualShipping, setDefaultActualShipping] = useState<number>(55);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiImportEnabled, setAiImportEnabled] = useState<boolean>(false);
  const [confirmDeleteBrandId, setConfirmDeleteBrandId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';

  const handleStartAdd = () => {
    setEditingBrandId(null);
    setName('');
    setCode('');
    setDescription('');
    setDefaultCustomerShipping(65);
    setDefaultActualShipping(55);
    setFormError(null);
    setIsAddingOrEditing(true);
  };

  const handleStartEdit = (brand: Brand) => {
    setEditingBrandId(brand.id);
    setName(brand.name);
    setCode(brand.code);
    setDescription(brand.description || '');
    setDefaultCustomerShipping(brand.defaultCustomerShipping);
    setDefaultActualShipping(brand.defaultActualShipping);
    setLogoColor(brand.logoColor);
    setAiImportEnabled(Boolean(brand.aiImportEnabled));
    setFormError(null);
    setIsAddingOrEditing(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('يرجى كتابة اسم البراند');
      return;
    }

    if (editingBrandId) {
      // Update existing brand
      const existing = brands.find((b) => b.id === editingBrandId);
      if (existing) {
        onUpdateBrand({
          ...existing,
          name: name.trim(),
          code: code.trim().toUpperCase() || 'BR',
          description: description.trim() || undefined,
          defaultCustomerShipping: Number(defaultCustomerShipping),
          defaultActualShipping: Number(defaultActualShipping),
          aiImportEnabled,
        });
      }
    } else {
      // Add new brand
      const newBrand: Brand = {
        id: `brand-${Date.now()}`,
        name: name.trim(),
        code: code.trim().toUpperCase() || 'BR',
        logoColor,
        description: description.trim() || undefined,
        defaultCustomerShipping: Number(defaultCustomerShipping),
        defaultActualShipping: Number(defaultActualShipping),
        isActive: true,
        aiImportEnabled,
        createdAt: new Date().toISOString(),
      };
      onAddBrand(newBrand);
    }

    setIsAddingOrEditing(false);
    setEditingBrandId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                إدارة البراندات وتعديل أسعارها ({brands.length} براند)
              </h2>
              <p className="text-xs text-slate-300">
                تعديل أو إضافة براندات جديدة في أي وقت مع ضمان عزل تام للأوردرات السابقة والحسابات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* Guaranteed Independence Callout */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-emerald-950">
                نظام حماية واستقلالية الأوردرات القديمة مفعل:
              </h4>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                أي براند جديد تضيفيه أو تعدليه ينزل ككيان منفصل، ولا يغير أي أرقام أو أسعار في الأوردرات السابقة إطلاقاً، لأن كل أوردر يحتفظ بلقطة أسعاره وتكاليفه وقت تسجيله.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          {!isAddingOrEditing || !isAdmin ? (
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                قائمة البراندات المسجلة:
              </h3>
              {isAdmin && (
                <button
                  onClick={handleStartAdd}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة براند جديد</span>
                </button>
              )}
            </div>
          ) : (
            /* Add/Edit Brand Form */
            <form onSubmit={handleSaveBrand} className="p-4 bg-slate-50 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900">
                  {editingBrandId ? 'تعديل بيانات البراند وأسعار الشحن:' : 'بيانات البراند الجديد:'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  إلغاء
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    اسم البراند التجاري: *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: لورين فاشون - Loren Fashion"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    كود البراند (رمز مختصر):
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثال: LF"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    شحن العميل الافتراضي (ج.م):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={defaultCustomerShipping}
                    onChange={(e) => setDefaultCustomerShipping(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    تكلفة شحن المندوب الفعلية الافتراضية (ج.م):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={defaultActualShipping}
                    onChange={(e) => setDefaultActualShipping(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">
                    الاستيراد الذكي للرسائل (AI)
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    السماح بتحويل رسايل العملاء الملصوقة لأوردرات لهذا البراند - يمكن إيقافه في أي وقت
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiImportEnabled((v) => !v)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                    aiImportEnabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {aiImportEnabled ? 'مفعّل' : 'مغلق'}
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  وصف أو ملاحظات عن البراند:
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="نوع المنتجات، الخامات، سياسة التبديل..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingBrandId ? 'حفظ تعديلات البراند' : 'حفظ وإضافة البراند فورياً'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Brands List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {brands.map((brand) => {
              const brandOrders = orders.filter((o) => o.brandId === brand.id);
              const totalRevenue = brandOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
              const totalNetProfit = brandOrders.reduce((s, o) => s + (o.netProfit || 0), 0);

              return (
                <div
                  key={brand.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                        {brand.code}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {brand.name}
                        </h4>
                        <div className="text-[10px] text-slate-400">
                          كود: {brand.code}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(brand)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200"
                          title="تعديل هذا البراند"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        {onDeleteBrand && brands.length > 1 && (
                          confirmDeleteBrandId === brand.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteBrand(brand.id);
                                  setConfirmDeleteBrandId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg"
                              >
                                تأكيد
                              </button>
                              <button
                                onClick={() => setConfirmDeleteBrandId(null)}
                                className="px-1.5 py-1 text-[11px] font-bold bg-white text-slate-600 rounded-lg border border-slate-200"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteBrandId(brand.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="حذف البراند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {brand.description && (
                    <p className="text-[11px] text-slate-500">
                      {brand.description}
                    </p>
                  )}

                  <div className={`grid gap-2 pt-2 border-t border-slate-200 text-center font-mono ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="bg-white p-2 rounded border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-sans">الأوردرات</div>
                      <div className="font-bold text-slate-800 text-xs">{brandOrders.length}</div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-sans">إجمالي المبيعات</div>
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {formatCurrency(totalRevenue, currency)}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="bg-white p-2 rounded border border-slate-200/80">
                        <div className="text-[10px] text-slate-400 font-sans">صافي المكسب</div>
                        <div className="font-bold text-emerald-600 text-xs truncate">
                          {formatCurrency(totalNetProfit, currency)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                    <span>شحن العميل: {brand.defaultCustomerShipping} ج.م</span>
                    {isAdmin && <span>تكلفة المندوب: {brand.defaultActualShipping} ج.م</span>}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>يمكنك إضافة وتعديل عدد لا نهائي من البراندات</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
