import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditLog, Brand, Order, Product, User, UserRole } from '../types';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

export let supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// تهيئة وقت التشغيل: لو متغيرات البناء غير موجودة، نجلب الإعدادات من السيرفر.
// هذا يسمح بنشر صورة واحدة على أي استضافة بمتغيرات بيئة عادية بدون إعادة بناء.
let initPromise: Promise<void> | null = null;
export function initSupabaseRuntime(): Promise<void> {
  if (supabase) return Promise.resolve();
  if (!initPromise) {
    initPromise = fetch('/api/public-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!supabase && cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
          supabaseUrl = String(cfg.supabaseUrl).trim();
          supabaseAnonKey = String(cfg.supabaseAnonKey).trim();
          if (isSupabaseConfigured()) {
            supabase = createClient(supabaseUrl, supabaseAnonKey);
          }
        }
      })
      .catch(() => undefined);
  }
  return initPromise;
}

export interface WorkspacePayload {
  brands: Brand[];
  products: Product[];
  orders: Order[];
  users: User[];
  auditLogs: AuditLog[];
}

export function normalizeLegacyRole(role: string): UserRole {
  if (role === 'admin' || role === 'reports') return 'admin';
  if (role === 'production' || role === 'workshop') return 'production';
  if (role === 'shipping') return 'shipping';
  if (role === 'affiliate') return 'affiliate';
  if (role === 'subscriber') return 'subscriber';
  return 'moderator';
}

// ============================
// المصادقة (Supabase Auth)
// ============================

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return { error: 'قاعدة البيانات غير مضبوطة' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message || null };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export function onAuthStateChange(callback: (hasSession: boolean) => void) {
  if (!supabase) return { unsubscribe: () => {} };
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(Boolean(session));
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}

// جلب الملف التعريفي للمستخدم الحالي من team_users
export async function fetchCurrentProfile(): Promise<{ profile: User | null; error?: string }> {
  if (!supabase) return { profile: null, error: 'Supabase غير مضبوط' };
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;
  if (!authUser) return { profile: null };

  const { data, error } = await supabase
    .from('team_users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) return { profile: null, error: error.message };

  if (!data) {
    // أول مستخدم على الإطلاق في النظام يصبح مالكاً بصلاحية مدير عام (تهيئة أول مرة)
    const { data: isEmpty, error: countErr } = await supabase.rpc('team_users_empty');
    if (countErr) return { profile: null, error: countErr.message };
    if (isEmpty === true) {
      const bootstrap: User = {
        id: authUser.id,
        name: authUser.email?.split('@')[0] || 'المدير العام',
        email: authUser.email || '',
        role: 'admin',
        isActive: true,
        isOwner: true,
        createdAt: new Date().toISOString(),
        brandsAccess: ['all'],
      };
      const ins = await upsertUserRow(bootstrap);
      if (ins.error) return { profile: null, error: ins.error };
      return { profile: bootstrap };
    }
    return { profile: null, error: 'هذا الحساب موقوف حالياً. لو سجّلت جديداً فحسابك قيد مراجعة الإدارة، ولو كنت مشتركاً سابقاً فقد يكون الاشتراك منتهياً — تواصل مع الإدارة للتجديد.' };
  }

  return { profile: mapUserRow(data) };
}

// ============================
// تحويل الصفوف (snake_case <-> camelCase)
// ============================

export function mapBrandRow(b: any): Brand {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    logoColor: b.logo_color || 'indigo',
    description: b.description || undefined,
    defaultCustomerShipping: Number(b.default_customer_shipping ?? 65),
    defaultActualShipping: Number(b.default_actual_shipping ?? 55),
    isActive: Boolean(b.is_active ?? true),
    aiImportEnabled: Boolean(b.ai_import_enabled ?? false),
    createdAt: b.created_at,
  };
}

export function brandToRow(b: Brand) {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    logo_color: b.logoColor,
    description: b.description || null,
    default_customer_shipping: b.defaultCustomerShipping,
    default_actual_shipping: b.defaultActualShipping,
    is_active: b.isActive,
    ai_import_enabled: Boolean(b.aiImportEnabled),
    created_at: b.createdAt,
  };
}

export function mapProductRow(p: any): Product {
  return {
    id: p.id,
    brandId: p.brand_id,
    name: p.name,
    sku: p.sku || undefined,
    rawMaterialCost: Number(p.raw_material_cost ?? 0),
    manufacturingCost: Number(p.manufacturing_cost ?? 0),
    defaultSellingPrice: Number(p.default_selling_price ?? 0),
    stockQuantity: Number(p.stock_quantity ?? 0),
    lowStockThreshold: Number(p.low_stock_threshold ?? 5),
    commissionPct: p.commission_pct != null ? Number(p.commission_pct) : null,
    variants: Array.isArray(p.variants) ? p.variants : [],
    category: p.category || undefined,
    createdAt: p.created_at,
  };
}

export function productToRow(p: Product) {
  return {
    id: p.id,
    brand_id: p.brandId,
    name: p.name,
    sku: p.sku || null,
    raw_material_cost: p.rawMaterialCost,
    manufacturing_cost: p.manufacturingCost,
    default_selling_price: p.defaultSellingPrice,
    stock_quantity: p.stockQuantity,
    low_stock_threshold: p.lowStockThreshold,
    commission_pct: p.commissionPct ?? null,
    variants: p.variants || [],
    category: p.category || null,
    created_at: p.createdAt,
  };
}

export function mapOrderRow(o: any): Order {
  return {
    id: o.id,
    orderNumber: o.order_number,
    brandId: o.brand_id,
    brandName: o.brand_name || undefined,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerPhone2: o.customer_phone_2 || undefined,
    customerAddress: o.customer_address,
    city: o.city,
    items: Array.isArray(o.items) ? o.items : [],
    itemsSubtotal: Number(o.items_subtotal ?? 0),
    customerShipping: Number(o.customer_shipping ?? 0),
    totalAmount: Number(o.total_amount ?? 0),
    actualShippingCost: Number(o.actual_shipping_cost ?? 0),
    extraExpenses: Number(o.extra_expenses ?? 0),
    totalRawCost: Number(o.total_raw_cost ?? 0),
    totalManufacturingCost: Number(o.total_manufacturing_cost ?? 0),
    totalCost: Number(o.total_cost ?? 0),
    netProfit: Number(o.net_profit ?? 0),
    profitMargin: Number(o.profit_margin ?? 0),
    status: o.status,
    deliveredAt: o.delivered_at || null,
    collectedAt: o.collected_at || null,
    inventoryDeducted: Boolean(o.inventory_deducted ?? false),
    notes: o.notes || undefined,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    createdBy: o.created_by,
    updatedBy: o.updated_by || undefined,
  };
}

export function orderToRow(o: Order) {
  return {
    id: o.id,
    order_number: o.orderNumber,
    brand_id: o.brandId,
    brand_name: o.brandName || null,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_phone_2: o.customerPhone2 || null,
    customer_address: o.customerAddress,
    city: o.city,
    items: o.items,
    items_subtotal: o.itemsSubtotal,
    customer_shipping: o.customerShipping,
    total_amount: o.totalAmount,
    actual_shipping_cost: o.actualShippingCost,
    extra_expenses: o.extraExpenses,
    total_raw_cost: o.totalRawCost,
    total_manufacturing_cost: o.totalManufacturingCost,
    total_cost: o.totalCost,
    net_profit: o.netProfit,
    profit_margin: o.profitMargin,
    status: o.status,
    delivered_at: o.deliveredAt || null,
    collected_at: o.collectedAt || null,
    inventory_deducted: Boolean(o.inventoryDeducted),
    notes: o.notes || null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    created_by: o.createdBy,
    updated_by: o.updatedBy || null,
  };
}

export function mapUserRow(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: normalizeLegacyRole(u.role),
    avatar: u.avatar || undefined,
    isActive: u.is_active !== false,
    isOwner: Boolean(u.is_owner ?? false),
    createdAt: u.created_at,
    brandsAccess: Array.isArray(u.brands_access) && u.brands_access.length > 0 ? u.brands_access : ['all'],
    subscriptionEndsAt: u.subscription_ends_at || null,
  };
}

export function userToRow(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar || null,
    is_active: u.isActive !== false,
    is_owner: Boolean(u.isOwner),
    brands_access: u.brandsAccess && u.brandsAccess.length > 0 ? u.brandsAccess : ['all'],
    created_at: u.createdAt || new Date().toISOString(),
    subscription_ends_at: u.subscriptionEndsAt ?? null,
  };
}

export function mapLogRow(l: any): AuditLog {
  return {
    id: l.id,
    timestamp: l.timestamp,
    userId: l.user_id,
    userName: l.user_name,
    userRole: normalizeLegacyRole(l.user_role),
    action: l.action,
    orderId: l.order_id || undefined,
    orderNumber: l.order_number || undefined,
    details: l.details,
  };
}

export function logToRow(l: AuditLog) {
  return {
    id: l.id,
    timestamp: l.timestamp,
    user_id: l.userId,
    user_name: l.userName,
    user_role: l.userRole,
    action: l.action,
    order_id: l.orderId || null,
    order_number: l.orderNumber || null,
    details: l.details,
  };
}

export async function upsertUserRow(u: User): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase غير مضبوط' };
  const { error } = await supabase.from('team_users').upsert(userToRow(u), { onConflict: 'id' });
  return { error: error?.message };
}

// ============================
// التحميل الأولي لمساحة العمل
// ============================

export async function loadWorkspaceFromSupabase(): Promise<{ data?: WorkspacePayload; error?: string }> {
  if (!supabase) return { error: 'Supabase غير مضبوط' };

  try {
    const [brandsRes, productsRes, ordersRes, usersRes, logsRes] = await Promise.all([
      supabase.from('brands').select('*').order('created_at', { ascending: true }),
      supabase.from('products').select('*').order('created_at', { ascending: true }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('team_users').select('*').order('created_at', { ascending: true }),
      supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
    ]);

    const firstError =
      brandsRes.error || productsRes.error || ordersRes.error || usersRes.error || logsRes.error;
    if (firstError) {
      return { error: firstError.message };
    }

    return {
      data: {
        brands: (brandsRes.data || []).map(mapBrandRow),
        products: (productsRes.data || []).map(mapProductRow),
        orders: (ordersRes.data || []).map(mapOrderRow),
        users: (usersRes.data || []).map(mapUserRow),
        auditLogs: (logsRes.data || []).map(mapLogRow),
      },
    };
  } catch (err: any) {
    return { error: err?.message || 'خطأ غير متوقع أثناء التحميل' };
  }
}

// إعدادات استحقاق عمولة المسوّق (تتحكم فيها الإدارة من صفحة الإعدادات)
export async function loadCommissionDueDelay(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'commission_due_delay_days')
    .maybeSingle();
  const n = parseInt(data?.value ?? '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function saveCommissionDueDelay(days: number): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase غير مضبوط' };
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'commission_due_delay_days', value: String(days) }, { onConflict: 'key' });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return {
      ok: false,
      message: 'متغيرات البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY غير مضبوطة بعد في ملف .env',
    };
  }
  try {
    const { error } = await supabase.from('brands').select('id').limit(1);
    if (error) {
      return { ok: false, message: `تعذر الاتصال بجدول brands: ${error.message}` };
    }
    return { ok: true, message: 'تم الاتصال بقاعدة بيانات Supabase السحابية بنجاح' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'حدث خطأ غير متوقع أثناء الاتصال بـ Supabase' };
  }
}
