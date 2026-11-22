import React, { useState } from 'react';
import { X, Search, CheckCircle2, Truck, Clock, RotateCcw, Zap, Sparkles } from 'lucide-react';
import { Order, OrderStatus, User } from '../types';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, reason?: string) => void;
  currentUser: User;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  orders,
  onUpdateOrderStatus,
  currentUser,
}) => {
  const [query, setQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isProduction = currentUser.role === 'production';
  const isShipping = currentUser.role === 'shipping';
  const scopedOrders = isProduction
    ? orders.filter((o) => o.status === 'manufacturing' || o.status === 'ready_to_ship')
    : isShipping
      ? orders.filter((o) => o.status === 'ready_to_ship' || o.status === 'shipped')
      : orders;

  // Filter orders matching query
  const trimmed = query.trim().toLowerCase();
  const matchedOrders = trimmed
    ? scopedOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(trimmed) ||
          o.customerName.toLowerCase().includes(trimmed) ||
          o.customerPhone.includes(trimmed) ||
          o.city.toLowerCase().includes(trimmed)
      ).slice(0, 5)
    : scopedOrders.slice(0, 4);

  const handleAction = (order: Order, status: OrderStatus) => {
    onUpdateOrderStatus(order.id, status, `تحديث سريع بواسطة ${currentUser.name}`);
    const statusText =
      status === 'shipped'
        ? 'تم الشحن مع المندوب 🚚'
        : status === 'delivered'
        ? 'تم التسليم والتحصيل بنجاح ✅'
        : status === 'ready_to_ship'
        ? 'جاهز للشحن 📦'
        : 'مرتجع 🔄';

    setSuccessMessage(`تم تحديث أوردر (${order.orderNumber} - ${order.customerName}) إلى: ${statusText}`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Natural command interpreter: e.g. "شحن أوردر سارة" or "تسليم 1001"
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;

    let targetStatus: OrderStatus | null = null;
    if (trimmed.includes('شحن') || trimmed.includes('اتشحن')) {
      targetStatus = 'shipped';
    } else if (trimmed.includes('تسليم') || trimmed.includes('اتسلم') || trimmed.includes('خالص')) {
      targetStatus = 'delivered';
    } else if (trimmed.includes('جاهز')) {
      targetStatus = 'ready_to_ship';
    } else if (trimmed.includes('مرتجع')) {
      targetStatus = 'returned';
    }

    if (matchedOrders.length > 0 && targetStatus) {
      handleAction(matchedOrders[0], targetStatus);
      setQuery('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">المساعد السريع لتحديث الحالات</h2>
              <p className="text-xs text-slate-300">
                ابحث باسم العميل أو رقمه أو كود الأوردر وحول الحالة بنقرة واحدة
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

        {/* Search / Command Form */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleCommandSubmit} className="relative">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اكتب اسم العميل، رقم الهاتف، أو أمر مثل: 'شحن أوردر سارة' أو 'تسليم 1002'..."
              className="w-full pr-10 pl-24 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
              autoFocus
            />
            {query && (
              <button
                type="submit"
                className="absolute left-2 top-2 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                تطبيق
              </button>
            )}
          </form>

          {/* Toast Notification */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Examples Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-semibold text-slate-700">أمثلة سريعة:</span>
            <button
              onClick={() => setQuery('سارة')}
              className="text-xs text-indigo-600 hover:underline"
            >
              سارة أحمد
            </button>
            <span>·</span>
            <button
              onClick={() => setQuery('ORD-1002')}
              className="text-xs text-indigo-600 hover:underline"
            >
              ORD-1002
            </button>
            <span>·</span>
            <button
              onClick={() => setQuery('فاطمة')}
              className="text-xs text-indigo-600 hover:underline"
            >
              فاطمة الزهراء
            </button>
          </div>

          {/* Results List */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {matchedOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                لم يتم العثور على أوردر مطابق للبحث "{query}"
              </div>
            ) : (
              matchedOrders.map((order) => {
                return (
                  <div
                    key={order.id}
                    className="p-3.5 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {order.orderNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {order.customerName}
                        </h4>
                        <span className="text-xs text-slate-500">({order.city})</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-mono text-slate-600">{order.customerPhone}</span>
                        <span>·</span>
                        <span className="text-indigo-600 font-medium">{order.brandName}</span>
                        <span>·</span>
                        <span className="font-mono font-bold text-slate-800">{order.totalAmount} ج.م</span>
                      </div>
                    </div>

                    {/* Instant Status Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        onClick={() => handleAction(order, 'shipped')}
                        disabled={order.status === 'shipped'}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                          order.status === 'shipped'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-sky-100 hover:bg-sky-200 text-sky-800'
                        }`}
                        title="تحديث الأوردر إلى تم الشحن"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>شحن</span>
                      </button>

                      <button
                        onClick={() => handleAction(order, 'ready_to_ship')}
                        disabled={order.status === 'ready_to_ship'}
                        className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors text-amber-800 hover:bg-amber-100 bg-amber-50 ${
                          order.status === 'ready_to_ship' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="جاهز للشحن"
                      >
                        جاهز
                      </button>

                      {!isProduction && (
                        <>
                          <button
                            onClick={() => handleAction(order, 'delivered')}
                            disabled={order.status === 'delivered'}
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                              order.status === 'delivered'
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            }`}
                            title="تأكيد التسليم وتحصيل المبلغ"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تسليم</span>
                          </button>

                          <button
                            onClick={() => handleAction(order, 'returned')}
                            disabled={order.status === 'returned'}
                            className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors text-rose-800 hover:bg-rose-100 bg-rose-50 ${
                              order.status === 'returned' ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="مرتجع"
                          >
                            مرتجع
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>يتم تسجيل أي تعديل فورياً في سجل العمليات</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
