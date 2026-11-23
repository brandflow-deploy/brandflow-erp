import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  FileSpreadsheet,
  Download,
  Printer,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Order, Brand, OrderStatus, User, CurrencyConfig, Product } from '../types';
import { exportOrdersToCSV, exportOrdersToExcel } from '../utils/excel';
import { formatCurrency } from '../utils/calculations';

interface OrdersListViewProps {
  orders: Order[];
  brands: Brand[];
  products: Product[];
  currentUser: User;
  currency: CurrencyConfig;
  selectedStatusFilter: string;
  onChangeStatusFilter: (st: string) => void;
  onOpenNewOrderModal: () => void;
  onOpenSmartModal: () => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onPrintOrders: (orders: Order[]) => void;
  onSelectBrandFilter: (brandId: string) => void;
  selectedBrandFilter: string;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({
  orders,
  brands,
  products,
  currentUser,
  currency,
  selectedStatusFilter,
  onChangeStatusFilter,
  onOpenNewOrderModal,
  onOpenSmartModal,
  onEditOrder,
  onDeleteOrder,
  onUpdateOrderStatus,
  onPrintOrders,
  selectedBrandFilter,
  onSelectBrandFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const isProduction = currentUser.role === 'production';
  const isShipping = currentUser.role === 'shipping';
  const isSubscriber = currentUser.role === 'subscriber';
  const isAffiliate = currentUser.role === 'affiliate';
  const canViewFinancials = isAdmin || isSubscriber;
  const canViewCommission = isAdmin || isAffiliate;
  const columnCount = 8 + (canViewFinancials ? 1 : 0) + (canViewCommission ? 1 : 0);
  const canCreateOrders = isAdmin || currentUser.role === 'moderator' || isAffiliate || isSubscriber;
  const canDelete = isAdmin;
  // مسؤول الشحن: لا ينشئ ولا يعدّل بيانات الأوردر، يحدّث حالات الشحن والتسليم ويطبع البوالص فقط
  const canEditOrders = !isProduction && !isShipping;

  // عمولة المسوّق للأوردر: مجموع (نسبة عمولة الصنف × إجمالي بيع السطر)
  const orderCommission = (order: Order): number => {
    let sum = 0;
    for (const item of order.items || []) {
      const prod = item.productId ? products.find((p) => p.id === item.productId) : undefined;
      if (prod?.commissionPct != null) {
        sum += (item.totalSellingPrice * prod.commissionPct) / 100;
      }
    }
    return sum;
  };

  // Production only sees manufacturing & ready_to_ship orders
  const roleScopedOrders = useMemo(() => {
    if (isProduction) {
      return orders.filter(
        (o) => o.status === 'manufacturing' || o.status === 'ready_to_ship'
      );
    }
    return orders;
  }, [orders, isProduction]);

  const effectiveStatusFilter =
    isProduction &&
    selectedStatusFilter !== 'all' &&
    selectedStatusFilter !== 'manufacturing' &&
    selectedStatusFilter !== 'ready_to_ship'
      ? 'all'
      : selectedStatusFilter;

  const filteredOrders = useMemo(() => {
    return roleScopedOrders.filter((order) => {
      if (effectiveStatusFilter !== 'all' && order.status !== effectiveStatusFilter) {
        return false;
      }

      if (selectedBrandFilter !== 'all' && order.brandId !== selectedBrandFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.includes(q);
        const matchesOrderNum = order.orderNumber.toLowerCase().includes(q);
        const matchesCity = order.city.toLowerCase().includes(q);
        const matchesProduct = order.items.some((it) =>
          it.productName.toLowerCase().includes(q)
        );

        if (
          !matchesName &&
          !matchesPhone &&
          !matchesOrderNum &&
          !matchesCity &&
          !matchesProduct
        ) {
          return false;
        }
      }

      return true;
    });
  }, [roleScopedOrders, effectiveStatusFilter, selectedBrandFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchStatus = (newStatus: OrderStatus) => {
    selectedOrderIds.forEach((id) => {
      onUpdateOrderStatus(id, newStatus);
    });
    setSelectedOrderIds([]);
  };

  const handlePrintSelected = () => {
    const toPrint = roleScopedOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (toPrint.length > 0) {
      onPrintOrders(toPrint);
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'manufacturing':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ready_to_ship':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'shipped':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'returned':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم العميل، الهاتف، رقم الأوردر، الصنف أو المدينة..."
            className="w-full pr-10 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="تصفية حسب البراند"
            value={selectedBrandFilter}
            onChange={(e) => onSelectBrandFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">كل البراندات</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {!isProduction && (
            <>
              <button
                onClick={() => exportOrdersToCSV(filteredOrders, canViewFinancials)}
                className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="تصدير الأوردرات الظاهرة بصيغة Excel CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير Excel (CSV)</span>
              </button>

              <button
                onClick={() => exportOrdersToExcel(filteredOrders, canViewFinancials)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="تصدير ملف إكسل .xlsx"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                <span>XLSX</span>
              </button>
            </>
          )}

          {canCreateOrders && (
            <>
              <button
                onClick={onOpenSmartModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>استيراد ذكي</span>
              </button>

              <button
                onClick={onOpenNewOrderModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>أوردر يدوي</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Production Scope Notice */}
      {isProduction && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 font-semibold">
          صلاحية التصنيع والمخزن: تظهر هنا فقط الأوردرات التي حالتها «قيد التصنيع» أو «جاهز للشحن» لتجهيزها وتحديث حالتها وطباعة البوليصة.
        </div>
      )}

      {/* Status Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => onChangeStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
            effectiveStatusFilter === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isProduction
            ? `كل طلبات التجهيز (${roleScopedOrders.length})`
            : `كل الأوردرات (${roleScopedOrders.length})`}
        </button>

        <button
          onClick={() => onChangeStatusFilter('manufacturing')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
            effectiveStatusFilter === 'manufacturing'
              ? 'bg-white text-amber-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          قيد التصنيع ({roleScopedOrders.filter((o) => o.status === 'manufacturing').length})
        </button>

        <button
          onClick={() => onChangeStatusFilter('ready_to_ship')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
            effectiveStatusFilter === 'ready_to_ship'
              ? 'bg-white text-indigo-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          جاهز للشحن ({roleScopedOrders.filter((o) => o.status === 'ready_to_ship').length})
        </button>

        {!isProduction && (
          <>
            <button
              onClick={() => onChangeStatusFilter('shipped')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                effectiveStatusFilter === 'shipped'
                  ? 'bg-white text-sky-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تم الشحن ({roleScopedOrders.filter((o) => o.status === 'shipped').length})
            </button>

            <button
              onClick={() => onChangeStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                effectiveStatusFilter === 'delivered'
                  ? 'bg-white text-emerald-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تم التسليم ({roleScopedOrders.filter((o) => o.status === 'delivered').length})
            </button>

            <button
              onClick={() => onChangeStatusFilter('returned')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                effectiveStatusFilter === 'returned'
                  ? 'bg-white text-rose-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المرتجعات ({roleScopedOrders.filter((o) => o.status === 'returned').length})
            </button>
          </>
        )}
      </div>

      {/* Batch Actions Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-indigo-950 text-white p-3 rounded-xl flex items-center justify-between text-xs">
          <span className="font-bold font-mono">تم تحديد {selectedOrderIds.length} أوردر</span>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-300">تغيير الحالة المجمعة:</span>
            <button
              onClick={() => handleBatchStatus('ready_to_ship')}
              className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-white font-bold"
            >
              جاهز للشحن
            </button>
            <button
              onClick={() => handleBatchStatus('shipped')}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 rounded text-white font-bold"
            >
              تم الشحن (يخصم من المخزن)
            </button>
            {!isProduction && (
              <button
                onClick={() => handleBatchStatus('delivered')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-bold"
              >
                تم التسليم
              </button>
            )}
            <button
              onClick={handlePrintSelected}
              className="px-2.5 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded font-bold flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة البوالص ({selectedOrderIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:text-indigo-600"
                    aria-label="تحديد الكل"
                  >
                    {selectedOrderIds.length === filteredOrders.length &&
                    filteredOrders.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">رقم الأوردر</th>
                <th className="px-4 py-3.5">العميل والموبايل</th>
                <th className="px-4 py-3.5">البراند</th>
                <th className="px-4 py-3.5">المنتجات والكميات</th>
                <th className="px-4 py-3.5">المبلغ والشحن</th>
                {canViewFinancials && (
                  <th className="px-4 py-3.5">التكلفة وصافي المكسب</th>
                )}
                {canViewCommission && <th className="px-4 py-3.5">العمولة</th>}
                <th className="px-4 py-3.5">حالة الأوردر</th>
                <th className="px-4 py-3.5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="py-12 text-center text-slate-400"
                  >
                    <p className="text-sm font-semibold">لا توجد أوردرات مطابقة للتصفية</p>
                    {canCreateOrders && (
                      <p className="text-xs text-slate-400 mt-1">
                        يمكنك استيراد أوردرات جديدة بنسخ ولصق الرسائل أو إضافتها يدوياً
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const statusClass = getStatusClass(order.status);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          aria-label="تحديد هذا الأوردر"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => onEditOrder(order)}
                      >
                        <div className="font-mono font-bold text-indigo-600 hover:text-indigo-800 text-xs">
                          {order.orderNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => onEditOrder(order)}
                      >
                        <div className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {order.customerPhone}
                        </div>
                        <div
                          className="text-[11px] text-slate-400 truncate max-w-44"
                          title={order.customerAddress}
                        >
                          {order.city} · {order.customerAddress}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <span className="text-indigo-600 font-bold block">
                          {order.brandName}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5 max-w-56">
                          {order.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="text-slate-800 text-xs flex items-center justify-between"
                            >
                              <span className="truncate">{it.productName}</span>
                              <span className="font-mono text-slate-500 mr-2 shrink-0">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 truncate max-w-56">
                            ملاحظة: {order.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono tabular-nums font-bold text-slate-900">
                          {formatCurrency(order.totalAmount, currency)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          منتجات: {order.itemsSubtotal} + شحن: {order.customerShipping}
                        </div>
                      </td>

                      {canViewFinancials && (
                        <td className="px-4 py-3">
                          <div className="font-mono tabular-nums font-bold text-emerald-600 text-xs">
                            +{formatCurrency(order.netProfit, currency)} ({order.profitMargin}%)
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            خام: {order.totalRawCost} · تصنيع: {order.totalManufacturingCost}
                          </div>
                        </td>
                      )}

                      {canViewCommission && (
                        <td className="px-4 py-3">
                          <div className="font-mono tabular-nums font-bold text-violet-700 text-xs">
                            {formatCurrency(orderCommission(order), currency)}
                          </div>
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <select
                          aria-label="تغيير حالة الأوردر"
                          value={order.status}
                          onChange={(e) =>
                            onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                          }
                          className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer focus:outline-none ${statusClass}`}
                        >
                          {!isShipping && <option value="manufacturing">قيد التصنيع</option>}
                          {!isShipping && <option value="ready_to_ship">جاهز للشحن</option>}
                          <option value="shipped">تم الشحن</option>
                          {!isProduction && (
                            <>
                              <option value="delivered">تم التسليم</option>
                              <option value="returned">مرتجع</option>
                              {!isShipping && <option value="cancelled">ملغي</option>}
                            </>
                          )}
                        </select>
                      </td>

                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditOrder(order)}
                            className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200"
                            title={canEditOrders ? 'تعديل هذا الأوردر' : 'عرض تفاصيل الأوردر'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{canEditOrders ? 'تعديل' : 'تفاصيل'}</span>
                          </button>

                          <button
                            onClick={() => onPrintOrders([order])}
                            className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                            title="طباعة بوليصة الشحن"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">طباعة بوليصة</span>
                          </button>

                          {canDelete && (
                            confirmDeleteOrderId === order.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    onDeleteOrder(order.id);
                                    setConfirmDeleteOrderId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg"
                                >
                                  حذف
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteOrderId(null)}
                                  className="px-1.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-600 rounded-lg"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteOrderId(order.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="حذف الأوردر"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            عرض {filteredOrders.length} من إجمالي {roleScopedOrders.length} أوردر
          </div>
          <div>
            الأسعار بالـ {currency.name} ({currency.symbol})
          </div>
        </div>
      </div>
    </div>
  );
};
