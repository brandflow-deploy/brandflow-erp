import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Package,
  Scissors,
  Truck,
  CheckCircle,
  RotateCcw,
  Layers,
  Sparkles,
  Plus,
  Download,
} from 'lucide-react';
import { Order, Brand, CurrencyConfig, User } from '../types';
import { computeDashboardMetrics, formatCurrency } from '../utils/calculations';

interface DashboardViewProps {
  orders: Order[];
  brands: Brand[];
  currency: CurrencyConfig;
  currentUser: User;
  onOpenSmartModal: () => void;
  onOpenNewOrderModal: () => void;
  onSelectBrandFilter: (brandId: string) => void;
  onNavigateToOrdersWithStatus: (status: string) => void;
  onOpenTeamSettings?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  brands,
  currency,
  currentUser,
  onOpenSmartModal,
  onOpenNewOrderModal,
  onSelectBrandFilter,
  onNavigateToOrdersWithStatus,
  onOpenTeamSettings,
}) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      if (selectedBrandId !== 'all' && order.brandId !== selectedBrandId) {
        return false;
      }

      const orderDate = new Date(order.createdAt);
      if (timeFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      }
      if (timeFilter === 'month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [orders, timeFilter, selectedBrandId]);

  const metrics = useMemo(() => computeDashboardMetrics(filteredOrders), [filteredOrders]);

  // Strict RBAC: Only Admin sees profit, raw material cost, and manufacturing cost
  const canViewFinancials = currentUser.role === 'admin';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>لوحة المؤشرات والتحليلات</span>
            <span className="text-xs font-mono font-semibold text-slate-500">
              ({filteredOrders.length} أوردر)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canViewFinancials
              ? 'ملخص الأداء المالي، تكاليف التصنيع، وحالات شحن البراندات'
              : 'متابعة المبيعات ومراحل تجهيز وشحن الأوردرات'}
          </p>
        </div>

        {/* Filter Controls & Primary Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            {(['today', 'week', 'month', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeFilter(period)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  timeFilter === period
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period === 'today'
                  ? 'اليوم'
                  : period === 'week'
                  ? 'الأسبوع'
                  : period === 'month'
                  ? 'الشهر'
                  : 'الكل'}
              </button>
            ))}
          </div>

          <select
            aria-label="تصفية حسب البراند"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">كل البراندات ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenSmartModal}
            className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>استيراد ذكي للرسائل</span>
          </button>

          <button
            onClick={onOpenNewOrderModal}
            className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>أوردر يدوي</span>
          </button>
        </div>
      </div>

      {/* Admin Quick Team & Settings Shortcut */}
      {isAdmin && onOpenTeamSettings && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-800">
          <div>
            <div className="font-bold text-sm">مرحباً {currentUser.name} — وضع المدير العام</div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              يمكنك إدارة صلاحيات الموظفين، تحديث بيانات الدخول، أو ضبط الربط السحابي بـ Supabase من صفحة الإعدادات والفريق.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/api/download-project-zip"
              download="brandflow-erp-project.zip"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل كود المشروع (.zip)</span>
            </a>
            <button
              onClick={onOpenTeamSettings}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors whitespace-nowrap"
            >
              فتح الإعدادات والفريق
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      {canViewFinancials ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>إجمالي المبيعات والإيرادات</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRevenue, currency)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              شامل مبالغ المنتجات والشحن المحصل
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>صافي المكسب المحقق</span>
              <span className="font-mono text-emerald-300 font-bold">
                {metrics.overallProfitMargin}% هامش
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
              {formatCurrency(metrics.totalNetProfit, currency)}
            </div>
            <div className="mt-2 text-[11px] text-slate-300">
              بعد خصم الخامات، التصنيع، والشحن الفعلي
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>تكلفة الخامات قبل التصنيع</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRawCost, currency)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              أقمشة، زيوت، مستلزمات خام وقت الطلب
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>تكاليف التصنيع والتقفيل</span>
              <Scissors className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalManufacturingCost, currency)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              الخياطة، القص، التعبئة، والإنتاج الثابت
            </div>
          </div>
        </div>
      ) : (
        /* Moderator View: Revenue & Operational KPIs WITHOUT profits or costs */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>إجمالي قيمة الأوردرات</span>
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRevenue, currency)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              قيمة المبيعات المحصلة من العملاء
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>إجمالي عدد الأوردرات</span>
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {metrics.totalOrders}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              في الفترة المحددة عبر كل البراندات
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>أوردرات تم تسليمها</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight">
              {metrics.deliveredCount}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              قيد التنفيذ والشحن: {metrics.manufacturingCount + metrics.readyToShipCount + metrics.shippedCount}
            </div>
          </div>
        </div>
      )}

      {/* Orders Status Pipeline & Workflow Counters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>مراحل الأوردرات والتجهيز</span>
            <span className="text-xs text-slate-400 font-normal">
              (انقر على أي مرحلة لعرض الأوردرات المرتبطة)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateToOrdersWithStatus('manufacturing')}
            className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-right transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
              <span>قيد التصنيع</span>
              <Scissors className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-950">
              {metrics.manufacturingCount}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">في الورشة والقص</div>
          </button>

          <button
            onClick={() => onNavigateToOrdersWithStatus('ready_to_ship')}
            className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 text-right transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-indigo-800 font-medium">
              <span>جاهز للشحن</span>
              <Package className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-indigo-950">
              {metrics.readyToShipCount}
            </div>
            <div className="text-[10px] text-indigo-700 mt-0.5">جاهز للتسليم للمندوب</div>
          </button>

          <button
            onClick={() => onNavigateToOrdersWithStatus('shipped')}
            className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/60 text-right transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-sky-800 font-medium">
              <span>تم الشحن</span>
              <Truck className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-sky-950">
              {metrics.shippedCount}
            </div>
            <div className="text-[10px] text-sky-700 mt-0.5">مع شركة الشحن</div>
          </button>

          <button
            onClick={() => onNavigateToOrdersWithStatus('delivered')}
            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-right transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span>تم التسليم</span>
              <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-950">
              {metrics.deliveredCount}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">تم تحصيل المبالغ</div>
          </button>

          <button
            onClick={() => onNavigateToOrdersWithStatus('returned')}
            className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 text-right transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-rose-800 font-medium">
              <span>مرتجع</span>
              <RotateCcw className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-rose-950">
              {metrics.returnedCount}
            </div>
            <div className="text-[10px] text-rose-700 mt-0.5">راجع أو استبدال</div>
          </button>

          <button
            onClick={() => onNavigateToOrdersWithStatus('all')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-right transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
              <span>إجمالي الطلبات</span>
              <Layers className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900">
              {metrics.totalOrders}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">في الفترة المحددة</div>
          </button>
        </div>
      </div>

      {/* Brand-by-Brand Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              أداء ومبيعات البراندات ({brands.length} براند مسجل)
            </h2>
            <p className="text-xs text-slate-500">
              كل براند يحتفظ بأرقامه وحساباته المستقلة دون تداخل
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => onSelectBrandFilter('all')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              إدارة البراندات وتكاليفها ←
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">البراند</th>
                <th className="px-4 py-3.5 text-center">عدد الأوردرات</th>
                <th className="px-4 py-3.5">إجمالي المبيعات</th>
                {canViewFinancials && (
                  <>
                    <th className="px-4 py-3.5">صافي الربح</th>
                    <th className="px-4 py-3.5 text-center">هامش الربح %</th>
                  </>
                )}
                <th className="px-6 py-3.5 text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {brands.map((b) => {
                const stat = metrics.brandStats.find((s) => s.brandId === b.id) || {
                  ordersCount: 0,
                  revenue: 0,
                  netProfit: 0,
                  profitMargin: 0,
                };

                return (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <div>{b.name}</div>
                        <div className="text-[11px] font-normal text-slate-400 font-mono">
                          كود: {b.code} · شحن العميل: {b.defaultCustomerShipping} ج.م
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono tabular-nums font-bold text-slate-800">
                      {stat.ordersCount}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums font-bold text-slate-900">
                      {formatCurrency(stat.revenue, currency)}
                    </td>
                    {canViewFinancials && (
                      <>
                        <td className="px-4 py-3.5 font-mono tabular-nums font-bold text-emerald-600">
                          {formatCurrency(stat.netProfit, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono tabular-nums font-bold text-emerald-700">
                          {stat.profitMargin}%
                        </td>
                      </>
                    )}
                    <td className="px-6 py-3.5 text-left">
                      <button
                        onClick={() => setSelectedBrandId(b.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        فلترة الأوردرات
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
