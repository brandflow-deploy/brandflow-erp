import * as XLSX from 'xlsx';
import { Order, Product, Brand } from '../types';

function buildOrderExportRows(orders: Order[], includeFinancials: boolean) {
  return orders.map((o) => {
    const baseRow: Record<string, string | number> = {
      'رقم الأوردر': o.orderNumber,
      'تاريخ الطلب': new Date(o.createdAt).toLocaleDateString('ar-EG'),
      'البراند': o.brandName || '',
      'اسم العميل': o.customerName,
      'رقم الهاتف': o.customerPhone,
      'المحافظة': o.city,
      'العنوان بالتفصيل': o.customerAddress,
      'المنتجات والكميات': o.items.map((it) => `${it.productName} (${it.quantity})`).join(' + '),
      'سعر المنتجات': o.itemsSubtotal,
      'شحن العميل': o.customerShipping,
      'الإجمالي الكلي': o.totalAmount,
    };

    if (includeFinancials) {
      baseRow['تكلفة الخام قبل التصنيع'] = o.totalRawCost;
      baseRow['تكلفة التصنيع'] = o.totalManufacturingCost;
      baseRow['شحن شركة التوصيل'] = o.actualShippingCost;
      baseRow['مصاريف إضافية'] = o.extraExpenses;
      baseRow['إجمالي التكاليف'] = o.totalCost;
      baseRow['صافي الربح'] = o.netProfit;
      baseRow['نسبة الربح %'] = `${o.profitMargin}%`;
    }

    baseRow['حالة الأوردر'] = getStatusLabelArabic(o.status);
    baseRow['ملاحظات'] = o.notes || '';
    return baseRow;
  });
}

export function exportOrdersToExcel(
  orders: Order[],
  includeFinancials: boolean = true,
  filename: string = 'orders_report.xlsx'
) {
  const rows = buildOrderExportRows(orders, includeFinancials);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الأوردرات');
  XLSX.writeFile(workbook, filename);
}

export function exportOrdersToCSV(
  orders: Order[],
  includeFinancials: boolean = true,
  filename: string = `brandflow_orders_${new Date().toISOString().slice(0, 10)}.csv`
) {
  const rows = buildOrderExportRows(orders, includeFinancials);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCsvCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];

  // UTF-8 BOM ensures Arabic text renders cleanly in Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportProductsToExcel(
  products: Product[],
  brands: Brand[],
  includeFinancials: boolean = true,
  filename: string = 'products_catalog.xlsx'
) {
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const rows = products.map((p) => {
    const base: Record<string, string | number> = {
      'كود الصنف (SKU)': p.sku || '',
      'اسم المنتج': p.name,
      'البراند': brandMap.get(p.brandId) || '',
      'القسم': p.category || '',
    };
    if (includeFinancials) {
      base['تكلفة الخام قبل التصنيع (ج.م)'] = p.rawMaterialCost;
      base['تكلفة التصنيع الثابتة (ج.م)'] = p.manufacturingCost;
      base['إجمالي التكلفة'] = p.rawMaterialCost + p.manufacturingCost;
      base['سعر البيع المقترح (ج.م)'] = p.defaultSellingPrice;
      base['هامش الربح المتوقع'] =
        p.defaultSellingPrice - (p.rawMaterialCost + p.manufacturingCost);
    }
    base['الكمية في المخزن'] = p.stockQuantity;
    return base;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الكتالوج والمخزون');
  XLSX.writeFile(workbook, filename);
}

export function getStatusLabelArabic(status: string): string {
  switch (status) {
    case 'manufacturing':
      return 'قيد التصنيع والتجهيز';
    case 'ready_to_ship':
      return 'جاهز للشحن';
    case 'shipped':
      return 'تم الشحن مع المندوب';
    case 'delivered':
      return 'تم التسليم والتحصيل';
    case 'returned':
      return 'مرتجع';
    case 'cancelled':
      return 'ملغي';
    default:
      return status;
  }
}
