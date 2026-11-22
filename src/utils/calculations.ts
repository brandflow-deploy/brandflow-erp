import { Order, OrderItem, CurrencyConfig } from '../types';

export function calculateOrderItem(
  unitPrice: number,
  quantity: number,
  rawMaterialCost: number,
  manufacturingCost: number
): { totalSellingPrice: number; totalItemCost: number; itemProfit: number } {
  const totalSellingPrice = Number((unitPrice * quantity).toFixed(2));
  const totalItemCost = Number(((rawMaterialCost + manufacturingCost) * quantity).toFixed(2));
  const itemProfit = Number((totalSellingPrice - totalItemCost).toFixed(2));
  return { totalSellingPrice, totalItemCost, itemProfit };
}

export function recalculateOrder(
  items: OrderItem[],
  customerShipping: number,
  actualShippingCost: number,
  extraExpenses: number = 0
): {
  itemsSubtotal: number;
  totalAmount: number;
  totalRawCost: number;
  totalManufacturingCost: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
} {
  const itemsSubtotal = items.reduce((sum, it) => sum + (it.totalSellingPrice || 0), 0);
  const totalRawCost = items.reduce((sum, it) => sum + (it.rawMaterialCost * it.quantity), 0);
  const totalManufacturingCost = items.reduce((sum, it) => sum + (it.manufacturingCost * it.quantity), 0);

  const totalAmount = Number((itemsSubtotal + (customerShipping || 0)).toFixed(2));
  const totalCost = Number(
    (totalRawCost + totalManufacturingCost + (actualShippingCost || 0) + (extraExpenses || 0)).toFixed(2)
  );
  const netProfit = Number((totalAmount - totalCost).toFixed(2));
  const profitMargin = totalAmount > 0 ? Number(((netProfit / totalAmount) * 100).toFixed(1)) : 0;

  return {
    itemsSubtotal,
    totalAmount,
    totalRawCost,
    totalManufacturingCost,
    totalCost,
    netProfit,
    profitMargin,
  };
}

export interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalRawCost: number;
  totalManufacturingCost: number;
  totalShippingCost: number;
  totalCosts: number;
  totalNetProfit: number;
  overallProfitMargin: number;
  manufacturingCount: number;
  readyToShipCount: number;
  shippedCount: number;
  deliveredCount: number;
  returnedCount: number;
  cancelledCount: number;
  brandStats: {
    brandId: string;
    brandName: string;
    ordersCount: number;
    revenue: number;
    netProfit: number;
    profitMargin: number;
  }[];
}

// الأوردرات المحتسبة في الإيرادات والأرباح: الملغي والمرتجع مستبعدان تماماً
// (المرتجع لم يُحصَّل فعلياً وقيمته رُدّت للعميل، فلا يدخل في المبيعات ولا الربح)
export function computeDashboardMetrics(orders: Order[]): DashboardMetrics {
  const activeOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned');

  const totalOrders = orders.length;
  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRawCost = activeOrders.reduce((sum, o) => sum + (o.totalRawCost || 0), 0);
  const totalManufacturingCost = activeOrders.reduce((sum, o) => sum + (o.totalManufacturingCost || 0), 0);
  const totalShippingCost = activeOrders.reduce((sum, o) => sum + (o.actualShippingCost || 0), 0);
  const totalCosts = activeOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const totalNetProfit = activeOrders.reduce((sum, o) => sum + (o.netProfit || 0), 0);
  const overallProfitMargin = totalRevenue > 0 ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const manufacturingCount = orders.filter((o) => o.status === 'manufacturing').length;
  const readyToShipCount = orders.filter((o) => o.status === 'ready_to_ship').length;
  const shippedCount = orders.filter((o) => o.status === 'shipped').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const returnedCount = orders.filter((o) => o.status === 'returned').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  // Group by brand
  const brandMap = new Map<string, { brandName: string; ordersCount: number; revenue: number; netProfit: number }>();

  orders.forEach((ord) => {
    const existing = brandMap.get(ord.brandId) || {
      brandName: ord.brandName || 'براند غير محدد',
      ordersCount: 0,
      revenue: 0,
      netProfit: 0,
    };

    existing.ordersCount += 1;
    if (ord.status !== 'cancelled' && ord.status !== 'returned') {
      existing.revenue += ord.totalAmount;
      existing.netProfit += ord.netProfit;
    }

    brandMap.set(ord.brandId, existing);
  });

  const brandStats = Array.from(brandMap.entries()).map(([brandId, data]) => ({
    brandId,
    brandName: data.brandName,
    ordersCount: data.ordersCount,
    revenue: Number(data.revenue.toFixed(2)),
    netProfit: Number(data.netProfit.toFixed(2)),
    profitMargin: data.revenue > 0 ? Number(((data.netProfit / data.revenue) * 100).toFixed(1)) : 0,
  }));

  return {
    totalOrders,
    totalRevenue,
    totalRawCost,
    totalManufacturingCost,
    totalShippingCost,
    totalCosts,
    totalNetProfit,
    overallProfitMargin,
    manufacturingCount,
    readyToShipCount,
    shippedCount,
    deliveredCount,
    returnedCount,
    cancelledCount,
    brandStats,
  };
}

export function formatCurrency(
  amountInEGP: number,
  currency: CurrencyConfig,
  decimals: number = 0
): string {
  const converted = amountInEGP / currency.rateToEGP;
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(converted);

  return `${formatted} ${currency.symbol}`;
}
