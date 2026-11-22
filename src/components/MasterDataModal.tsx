import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Trash2, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Layers, 
  Package, 
  Tag, 
  Lock, 
  RefreshCw,
  Sparkles,
  Download,
  Upload
} from 'lucide-react';
import { Order, Product, Brand, User } from '../types';
import { INITIAL_BRANDS, INITIAL_PRODUCTS, INITIAL_ORDERS } from '../data/seedData';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  products: Product[];
  orders: Order[];
  currentUser: User;
  onUpdateBrands: (brands: Brand[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onSaveImmediately: () => Promise<void>;
  isSyncing: boolean;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({
  isOpen,
  onClose,
  brands,
  products,
  orders,
  currentUser,
  onUpdateBrands,
  onUpdateProducts,
  onUpdateOrders,
  onSaveImmediately,
  isSyncing,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'products' | 'brands' | 'backup'>('orders');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';

  // Quick Action: Delete all demo orders to start fresh
  const handleClearAllOrders = () => {
    if (!isAdmin) return;
    if (confirm('هل أنتِ متأكدة من رغبتك في حذف كافة الأوردرات الحالية للبدء من الصفر بقائمة نظيفة؟ (المنتجات والبراندات ستظل محفوظة)')) {
      onUpdateOrders([]);
      setSaveSuccessMsg('تم تفريغ الأوردرات بنجاح. يمكنك الآن البدء بتسجيل أوردراتك الحقيقية!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Quick Action: Reset to initial default demo data
  const handleResetToSeedData = () => {
    if (!isAdmin) return;
    if (confirm('هل ترغبين في استعادة البيانات التجريبية الأولية للنظام؟')) {
      onUpdateBrands(INITIAL_BRANDS);
      onUpdateProducts(INITIAL_PRODUCTS);
      onUpdateOrders(INITIAL_ORDERS);
      setSaveSuccessMsg('تمت استعادة البيانات الافتراضية الأولية بنجاح.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Manual trigger save
  const handleTriggerSave = async () => {
    if (!isAdmin) return;
    await onSaveImmediately();
    setSaveSuccessMsg('تم حفظ كافة التعديلات في قاعدة البيانات على السيرفر! أي مستخدم جديد يسجل سيشاهد هذه البيانات المحدثة.');
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Export JSON backup
  const handleDownloadBackup = () => {
    const data = {
      exportDate: new Date().toISOString(),
      brands,
      products,
      orders,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.brands) onUpdateBrands(json.brands);
        if (json.products) onUpdateProducts(json.products);
        if (json.orders) onUpdateOrders(json.orders);
        setSaveSuccessMsg('تم استيراد النسخة الاحتياطية بنجاح!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } catch (err: any) {
        alert('الملف غير صالح أو به خطأ: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>إدارة وتهيئة كافة بيانات النظام وقاعدة البيانات</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  حفظ دائم
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                تعديل كافة الأوردرات السابقة، تكاليف التصنيع، وتفريغ أو تحديث البيانات لأي مستخدم جديد
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

        {/* Protection Warning if not Admin */}
        {!isAdmin && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>وضع المشاهدة فقط:</b> أنت تعمل بحساب ({currentUser.name}). تعديل وحفظ أو تصفير بيانات النظام مقتصر على مدير النظام (المالك: منار حسين).
            </span>
          </div>
        )}

        {/* Success toast inside modal */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'orders'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>الأوردرات ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('products')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'products'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>المنتجات وتكاليف التصنيع ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('brands')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'brands'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>البراندات ({brands.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('backup')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'backup'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>النسخ الاحتياطي والحفظ</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 1: Orders Data Management */}
          {activeSubTab === 'orders' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">الأوردرات المسجلة حالياً في النظام:</h4>
                  <p className="text-slate-500 text-xs">
                    يمكنك تعديل أي أوردر مباشرة من جدول الأوردرات، أو مسح كافة الأوردرات التجريبية هنا للبدء بأوردراتك الحقيقية.
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearAllOrders}
                      className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                      title="حذف جميع الأوردرات الحالية للبدء من الصفر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تفريغ كافة الأوردرات (بدء من الصفر)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Orders List Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم الأوردر</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3">البراند</th>
                      <th className="p-3">المبلغ الإجمالي</th>
                      <th className="p-3">صافي المكسب</th>
                      <th className="p-3">الحالة</th>
                      {isAdmin && <th className="p-3 text-center">إجراء سريع</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          لا توجد أي أوردرات حالياً. النظام جاهز لاستقبال أوردراتك الجديدة عبر الاستيراد الذكي أو الأوردر اليدوي.
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                          <td className="p-3 font-semibold">{ord.customerName}</td>
                          <td className="p-3 text-indigo-600 font-bold">{ord.brandName}</td>
                          <td className="p-3 font-mono font-bold">{ord.totalAmount} ج.م</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">+{ord.netProfit} ج.م</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-[11px]">
                              {ord.status}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  onUpdateOrders(orders.filter((o) => o.id !== ord.id));
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="حذف هذا الأوردر"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Products & Manufacturing Costs */}
          {activeSubTab === 'products' && (
            <div className="space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                <h4 className="font-bold text-sky-950 text-sm">تكاليف التصنيع الثابتة المخزنة في المنتجات:</h4>
                <p className="text-sky-800 text-xs mt-0.5">
                  هذه هي التكاليف التي يتم جلبها تلقائياً بمجرد اختيار المنتج أو كتابة اسمه في الأوردر (دون الحاجة لإدخالها يدوياً).
                  يمكنك تعديل أي سعر هنا وسيتم تطبيقه فورياً.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">اسم المنتج</th>
                      <th className="p-3">البراند</th>
                      <th className="p-3">تكلفة التصنيع الثابتة (ج.م)</th>
                      <th className="p-3">تكلفة الخام قبل التصنيع</th>
                      <th className="p-3">سعر البيع المقترح</th>
                      <th className="p-3">المخزون</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod) => {
                      const brand = brands.find((b) => b.id === prod.brandId);
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{prod.name}</td>
                          <td className="p-3 text-indigo-600 font-semibold">{brand?.name || prod.brandId}</td>
                          <td className="p-3 font-mono font-bold text-sky-900 bg-sky-50/50">
                            {isAdmin ? (
                              <input
                                type="number"
                                min={0}
                                value={prod.manufacturingCost}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  onUpdateProducts(
                                    products.map((p) => (p.id === prod.id ? { ...p, manufacturingCost: val } : p))
                                  );
                                }}
                                className="w-20 px-2 py-1 bg-white border border-sky-300 rounded font-bold text-center"
                              />
                            ) : (
                              <span>{prod.manufacturingCost} ج.م</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-700">
                            {isAdmin ? (
                              <input
                                type="number"
                                min={0}
                                value={prod.rawMaterialCost}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  onUpdateProducts(
                                    products.map((p) => (p.id === prod.id ? { ...p, rawMaterialCost: val } : p))
                                  );
                                }}
                                className="w-20 px-2 py-1 bg-white border border-amber-300 rounded font-bold text-center"
                              />
                            ) : (
                              <span>{prod.rawMaterialCost} ج.م</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {isAdmin ? (
                              <input
                                type="number"
                                min={0}
                                value={prod.defaultSellingPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  onUpdateProducts(
                                    products.map((p) => (p.id === prod.id ? { ...p, defaultSellingPrice: val } : p))
                                  );
                                }}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-center"
                              />
                            ) : (
                              <span>{prod.defaultSellingPrice} ج.م</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-semibold">{prod.stockQuantity} قطعة</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Brands Management */}
          {activeSubTab === 'brands' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-900 text-sm">البراندات المسجلة ({brands.length} براند):</h4>
                <p className="text-slate-500 text-xs">
                  البراندات كيانات منفصلة؛ تعديل أسعار الشحن أو الأسماء هنا لا يغير أو يؤثر على أي أوردرات سابقة تم تسجيلها.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brands.map((b) => (
                  <div key={b.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                        {b.code}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-500 block">شحن العميل:</span>
                        <b className="text-slate-900">{b.defaultCustomerShipping} ج.م</b>
                      </div>
                      <div>
                        <span className="text-slate-500 block">شحن المندوب:</span>
                        <b className="text-slate-900">{b.defaultActualShipping} ج.م</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Backup & Server Synchronization */}
          {activeSubTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-emerald-950 text-sm">
                    حفظ قاعدة البيانات على السيرفر (Server Database Persistence)
                  </h4>
                </div>
                <p className="text-emerald-800 text-xs leading-relaxed">
                  يتم حفظ أي تعديل تجرينه تلقائياً في ملف قاعدة البيانات على السيرفر.
                  وعندما يدخل أي شخص جديد أو تفتحين من جهاز آخر، يتم تحميل هذه البيانات المحفوظة فورياً ليرى النسخة الجديدة دون القدرة على تعديلها إلا بحساب المدير.
                </p>
                {isAdmin && (
                  <div className="pt-2">
                    <button
                      onClick={handleTriggerSave}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSyncing ? 'جاري الحفظ...' : 'حفظ فوري لقاعدة البيانات الآن'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Reset to Default */}
              {isAdmin && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">إعادة التعيين للبيانات الافتراضية:</h4>
                  <p className="text-slate-500 text-[11px]">
                    إذا رغبتِ في أي وقت باستعادة البيانات الافتراضية الأصلية للأوردرات والبراندات الخمسة:
                  </p>
                  <button
                    onClick={handleResetToSeedData}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة البيانات الافتراضية الأصلية</span>
                  </button>
                </div>
              )}

              {/* Export / Import JSON */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">تصدير واستيراد نسخة احتياطية (JSON):</h4>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleDownloadBackup}
                    className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نسخة احتياطية كاملة (Backup JSON)</span>
                  </button>

                  {isAdmin && (
                    <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>استرجاع من ملف نسخة احتياطية</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>قاعدة البيانات متصلة ومتزامنة</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleTriggerSave}
                disabled={isSyncing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات في النظام</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
