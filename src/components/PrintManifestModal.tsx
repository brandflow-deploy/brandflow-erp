import React from 'react';
import { X, Printer, Package, Phone, MapPin, Truck } from 'lucide-react';
import { Order } from '../types';

interface PrintManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordersToPrint: Order[];
}

export const PrintManifestModal: React.FC<PrintManifestModalProps> = ({
  isOpen,
  onClose,
  ordersToPrint,
}) => {
  if (!isOpen || ordersToPrint.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="print-modal-dialog relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Controls (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold">
                معاينة بوالص الشحن وكشف التسليم ({ordersToPrint.length} أوردر)
              </h2>
              <p className="text-xs text-slate-300">
                جاهزة للطباعة فورياً أو الحفظ كملف PDF لمندوب شركة الشحن
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="print-scroll-area p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          {ordersToPrint.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-xl border border-slate-300 shadow-xs space-y-4 break-inside-avoid text-slate-900"
            >
              {/* Waybill Top */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <div className="text-xs font-bold text-slate-500">بوليصة شحن وتوصيل</div>
                  <h3 className="text-lg font-bold text-slate-900">{order.brandName}</h3>
                </div>
                <div className="text-left font-mono">
                  <div className="text-xl font-bold tracking-tight text-slate-900">
                    {order.orderNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    التاريخ: {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              </div>

              {/* Customer & Delivery Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-700">بيانات المستلم:</div>
                  <div className="font-bold text-sm text-slate-900">{order.customerName}</div>
                  <div className="font-mono text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{order.customerPhone}</span>
                    {order.customerPhone2 && <span> / {order.customerPhone2}</span>}
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-700">عنوان التوصيل:</div>
                  <div className="font-bold text-slate-900">المحافظة: {order.city}</div>
                  <div className="text-slate-700 leading-relaxed">{order.customerAddress}</div>
                </div>
              </div>

              {/* Products Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">الصنف المطلوب</th>
                      <th className="px-3 py-2 text-center">الكمية</th>
                      <th className="px-3 py-2">سعر القطعة</th>
                      <th className="px-3 py-2 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{it.productName}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="px-3 py-2 font-mono">{it.unitPrice} ج.م</td>
                        <td className="px-3 py-2 text-left font-mono font-bold">{it.totalSellingPrice} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total to Collect Callout */}
              <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl">
                <div>
                  <div className="text-xs text-slate-300">
                    قيمة المنتجات: {order.itemsSubtotal} ج.م · الشحن: {order.customerShipping} ج.م
                  </div>
                  {order.notes && (
                    <div className="text-xs text-amber-300 mt-1 font-semibold">
                      ملاحظة: {order.notes}
                    </div>
                  )}
                </div>

                <div className="text-left">
                  <div className="text-xs text-slate-300 font-bold">المطلوب تحصيله من العميل (COD):</div>
                  <div className="text-2xl font-mono font-bold text-amber-400">
                    {order.totalAmount} ج.م
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-200 pt-2">
                <span>تم الإنشاء بواسطة نظام براند فلو ERP</span>
                <span>توقيع المستلم: ............................................</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
