import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Download, 
  Upload,
  ShieldCheck,
  Tag,
  Package
} from 'lucide-react';
import { Brand, Product, Order, User, AuditLog } from '../types';
import { INITIAL_BRANDS, INITIAL_PRODUCTS, INITIAL_ORDERS } from '../data/seedData';

interface SystemDataResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  products: Product[];
  orders: Order[];
  currentUser: User;
  onUpdateAllBrands: (brands: Brand[]) => void;
  onClearDemoOrders: () => void;
  onResetAllDataToDefault: () => void;
  onSaveFullData: (data: { brands: Brand[]; products: Product[]; orders: Order[] }) => void;
}

export const SystemDataResetModal: React.FC<SystemDataResetModalProps> = ({
  isOpen,
  onClose,
  brands,
  products,
  orders,
  currentUser,
  onUpdateAllBrands,
  onClearDemoOrders,
  onResetAllDataToDefault,
  onSaveFullData,
}) => {
  const [editableBrands, setEditableBrands] = useState<Brand[]>(brands);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';

  const handleBrandChange = (idx: number, field: keyof Brand, value: any) => {
    setEditableBrands((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSaveBrandsBatch = () => {
    onUpdateAllBrands(editableBrands);
    setSuccessMsg('تم حفظ وتحديث بيانات البراندات الخمسة في النظام بنجاح!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleClearOrdersConfirm = () => {
    if (confirm('هل أنتِ متأكدة من مسح الأوردرات التجريبية؟ سيصبح جدول الأوردرات فارغاً لبدء تسجيل أوردراتك الحقيقية.')) {
      onClearDemoOrders();
      setSuccessMsg('تم مسح الأوردرات التجريبية بنجاح، يمكنك الآن تسجيل أوردراتك الحقيقية.');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleResetEverythingConfirm = () => {
    if (confirm('تحذير: هل تريدين إعادة ضبط النظام بالكامل للبيانات الافتراضية الأولية؟')) {
      onResetAllDataToDefault();
      setSuccessMsg('تمت إعادة ضبط البيانات بالكامل.');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  // Export full JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      brands,
      products,
      orders,
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                مركز إدارة وتهيئة بيانات النظام (للمدير العام)
              </h2>
              <p className="text-xs text-slate-300">
                تعديل البراندات الخمسة الأساسية، مسح الأوردرات التجريبية، وضمان عدم تعديل أي مستخدم جديد لها
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Security & Persistence Notice */}
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-indigo-950">
                حفظ دائم ومحمي من أي تعديل خارجي:
              </h4>
              <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                أي تعديل تجرينه هنا يتم حفظه في قاعدة البيانات المشتركة للسيرفر ولجهازك، وأي مستخدم أو موظف جديد يفتح النظام سيرى بياناتك الحقيقية التي أدخلتها فوراً، مع قفل صلاحية التعديل عليه لضمان أمان حساباتك وأسعار تصنيعك.
              </p>
            </div>
          </div>

          {/* Section 1: Quick Batch Edit of Brands */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span>تعديل أسماء البراندات الخمسة وأسعار شحنها دفعة واحدة:</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  يمكنك استبدال الأسماء الافتراضية بأسماء برانداتك الحقيقية وشحنها:
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={handleSaveBrandsBatch}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ البراندات المحدثة</span>
                </button>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-600 px-2">
                <div className="col-span-5">اسم البراند</div>
                <div className="col-span-2">الكود المختصر</div>
                <div className="col-span-2">شحن العميل (ج.م)</div>
                <div className="col-span-3">تكلفة شحن المندوب (ج.م)</div>
              </div>

              {editableBrands.map((b, idx) => (
                <div key={b.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                  <div className="col-span-5">
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={b.name}
                      onChange={(e) => handleBrandChange(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={b.code}
                      onChange={(e) => handleBrandChange(idx, 'code', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono uppercase text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={b.defaultCustomerShipping}
                      onChange={(e) => handleBrandChange(idx, 'defaultCustomerShipping', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={b.defaultActualShipping}
                      onChange={(e) => handleBrandChange(idx, 'defaultActualShipping', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Quick Order Cleanup for Real Production Start */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>بدء العمل الفعلي وتنظيف الأوردرات التجريبية:</span>
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              إذا كنتِ تريدين البدء في تسجيل أوردراتك الحقيقية الآن بدون الخلط مع الـ 5 أوردرات التجريبية التي وضعناها كأمثلة، يمكنك مسحها بنقرة واحدة لتبدأي بجدول أوردرات نظيف، أو تعديلها من جدول الأوردرات مباشرة.
            </p>

            {isAdmin && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleClearOrdersConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح الأوردرات التجريبية ({orders.length} أوردر حالي)</span>
                </button>

                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تنزيل نسخة احتياطية كاملة (JSON Backup)</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Reset to Default (Disaster Recovery) */}
          {isAdmin && (
            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
              <h4 className="font-bold text-rose-950 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>إعادة ضبط المصنع (استرجاع البيانات التجريبية الأولية):</span>
              </h4>
              <p className="text-[11px] text-rose-800">
                في حال أردتِ استعادة البيانات الأولية كاملة كما كانت في البداية:
              </p>
              <button
                onClick={handleResetEverythingConfirm}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط المصنع بالكامل</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{isAdmin ? 'صلاحيات المدير مفعلة' : 'وضع القراءة فقط'}</span>
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
