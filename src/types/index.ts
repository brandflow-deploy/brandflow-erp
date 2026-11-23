export type OrderStatus =
  | 'manufacturing'   // قيد التصنيع والتجهيز
  | 'ready_to_ship'   // جاهز للشحن
  | 'shipped'         // تم الشحن مع المندوب
  | 'delivered'       // تم التسليم والتحصيل
  | 'returned'        // مرتجع
  | 'cancelled';      // ملغي

export type UserRole =
  | 'admin'       // المدير العام (صلاحية كاملة للأرباح، التكاليف، الفريق، والحذف)
  | 'moderator'   // مسؤول مبيعات / مودريتور (الأوردرات، الرئيسية بدون أرباح، البراندات للعرض فقط)
  | 'production'  // مسؤول تصنيع ومخزن (التصنيع والمخزن + الأوردرات قيد التصنيع وجاهز للشحن فقط)
  | 'shipping'    // مسؤول شحن (أوردرات الشحن والتسليم للبراندات المحددة له فقط، بدون أرباح أو تكاليف)
  | 'affiliate'   // مسوّق بالعمولة (براند واحد خاص به: أوردراته ومنتجاته ومخزونه للعرض + عمولته، بدون تكاليف)
  | 'subscriber'; // عميل مشترك خارجي (براند واحد خاص به مثل المسوّق، لكن يرى تكاليف منتجاته وأوردراته)

export type AppTab = 'dashboard' | 'orders' | 'catalog' | 'brands' | 'audit' | 'settings';

export interface Brand {
  id: string;
  name: string;
  code: string;
  logoColor: string; // e.g. 'emerald', 'indigo', 'amber', 'rose', 'sky'
  description?: string;
  defaultCustomerShipping: number;
  defaultActualShipping: number;
  isActive: boolean;
  aiImportEnabled?: boolean; // الاستيراد الذكي للرسائل بالذكاء الاصطناعي (اختياري لكل براند، مغلق افتراضياً)
  createdAt: string;
}

// متغير منتج (مقاس/لون) مع مخزون مستقل لكل متغير
export interface ProductVariant {
  id: string;
  size: string;          // المقاس مثل S / M / L أو 4 سنوات
  color: string;         // اللون
  sku?: string;          // كود مستقل للمتغير (اختياري)
  stockQuantity: number; // مخزون هذا المتغير تحديداً
}

export interface Product {
  id: string;
  brandId: string;
  name: string;
  sku?: string;
  rawMaterialCost: number;     // سعر المنتج قبل التصنيع (الخامات والقماش)
  manufacturingCost: number;   // تكلفة التصنيع الثابتة (القص والخياطة والتقفيل)
  defaultSellingPrice: number; // سعر البيع المقترح
  stockQuantity: number;       // الكمية المتاحة بالمخزن (عند عدم وجود متغيرات) / مجموع المتغيرات (عند وجودها)
  lowStockThreshold: number;   // حد تنبيه انخفاض المخزون
  commissionPct?: number | null; // نسبة عمولة المسوّق لهذا الصنف (تضبطها الإدارة)
  variants?: ProductVariant[]; // مقاسات/ألوان اختيارية بمخزون مستقل
  category?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  variantId?: string;          // متغير المنتج المختار (مقاس/لون) عند وجود متغيرات
  productName: string;
  size?: string;               // المقاس المختار (نص للعرض والبوليصة)
  color?: string;              // اللون المختار (نص للعرض والبوليصة)
  quantity: number;
  unitPrice: number;            // سعر بيع القطعة
  rawMaterialCost: number;     // تكلفة القطعة قبل التصنيع وقت الطلب
  manufacturingCost: number;   // تكلفة التصنيع للقطعة وقت الطلب
  totalSellingPrice: number;   // unitPrice * quantity
  commissionPct?: number | null; // نسبة عمولة المسوّق المثبتة على الأوردر وقت إنشائه (لا تتغير بتعديل الصنف لاحقاً)
  totalItemCost: number;       // (rawMaterialCost + manufacturingCost) * quantity
  itemProfit: number;          // totalSellingPrice - totalItemCost
}

export interface Order {
  id: string;
  orderNumber: string;         // e.g. ORD-1001
  brandId: string;
  brandName?: string;
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  customerAddress: string;
  city: string;                // المحافظة / المدينة
  items: OrderItem[];
  itemsSubtotal: number;       // إجمالي مبالغ المنتجات
  customerShipping: number;    // سعر الشحن المحصل من العميل
  totalAmount: number;         // المبلغ الإجمالي (itemsSubtotal + customerShipping)
  actualShippingCost: number;  // تكلفة الشحن الفعلية لشركة الشحن
  extraExpenses: number;       // مصاريف إضافية (تغليف، كروت، هدايا)
  totalRawCost: number;        // إجمالي تكلفة المنتجات قبل التصنيع
  totalManufacturingCost: number; // إجمالي تكاليف التصنيع
  totalCost: number;           // totalRawCost + totalManufacturingCost + actualShippingCost + extraExpenses
  netProfit: number;           // totalAmount - totalCost
  profitMargin: number;        // (netProfit / totalAmount) * 100
  status: OrderStatus;
  inventoryDeducted?: boolean; // هل تم خصم الكمية من المخزن تلقائياً؟
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

// ملف المستخدم التعريفي - بلا كلمة مرور (المصادقة عبر Supabase Auth)
export interface User {
  id: string;                  // نفس معرّف مستخدم Supabase Auth (uuid)
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive?: boolean;
  isOwner?: boolean;           // true for system owner
  createdAt?: string;
  brandsAccess?: string[];     // ['all'] أو قائمة معرفات براندات محددة يحق له رؤيتها
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  orderId?: string;
  orderNumber?: string;
  details: string;
}

export type Currency = 'EGP' | 'USD' | 'SAR' | 'AED' | 'EUR';

export interface CurrencyConfig {
  code: Currency;
  name: string;
  symbol: string;
  rateToEGP: number; // 1 Currency = X EGP
}

export interface ParsedOrderCandidate {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  brandId?: string;
  brandName?: string;
  productsRawText?: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    rawMaterialCost?: number;
    manufacturingCost?: number;
  }[];
  orderAmount?: number;
  customerShipping?: number;
  actualShippingCost?: number;
  status?: OrderStatus;
  notes?: string;
  confidence: number;
  rawInput: string;
}

// هل يحق للمستخدم رؤية براند معين؟
export function userCanAccessBrand(user: User | null | undefined, brandId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const access = user.brandsAccess || ['all'];
  return access.includes('all') || access.includes(brandId);
}
