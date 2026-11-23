import { AuditLog, Brand, Order, Product, User } from '../types';
import {
  brandToRow,
  getAccessToken,
  initSupabaseRuntime,
  isSupabaseConfigured,
  logToRow,
  orderToRow,
  productToRow,
  supabase,
  userToRow,
  WorkspacePayload,
} from './supabase';

export type StoreResult = { ok: boolean; error?: string };

export interface HealthInfo {
  devAuthEnabled: boolean;
  devStorageEnabled: boolean;
}

export async function fetchServerHealth(): Promise<HealthInfo> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { devAuthEnabled: false, devStorageEnabled: false };
    const data = await res.json();
    return {
      devAuthEnabled: Boolean(data.devAuthEnabled),
      devStorageEnabled: Boolean(data.devStorageEnabled),
    };
  } catch {
    return { devAuthEnabled: false, devStorageEnabled: false };
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = (await getAccessToken()) || (window.__DEV_TOKEN__ as string | undefined);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

declare global {
  interface Window {
    __DEV_TOKEN__?: string;
  }
}

// وضع التخزين المحلي للتطوير فقط (db.json على السيرفر) - لا يستخدم في الإنتاج
async function devPost(payload: WorkspacePayload): Promise<StoreResult> {
  try {
    const res = await fetch('/api/storage', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || `فشل الحفظ المحلي (${res.status})` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'تعذر الوصول للسيرفر المحلي' };
  }
}

async function sbCall(fn: () => PromiseLike<{ error: any }>): Promise<StoreResult> {
  if (!supabase) return { ok: false, error: 'Supabase غير مضبوط' };
  try {
    const { error } = await fn();
    if (error) return { ok: false, error: error.message || 'خطأ في قاعدة البيانات' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'خطأ غير متوقع' };
  }
}

// طبقة الحفظ: كل تعديل يُحفظ فوراً وبشكل مستقل لقاعدة البيانات.
// في وضع التطوير المحلي (بدون Supabase) يُحفظ مساحة العمل كاملة في db.json.
export function createDataStore(getState: () => WorkspacePayload) {
  // يُحسم وضع التخزين عند كل عملية حفظ وليس عند إنشاء المخزن:
  // على المرآة تصل إعدادات Supabase من /api/public-config بعد أول رسم للصفحة،
  // فلو حُسم الوضع مبكراً لعلق المخزن في وضع التطوير وضاعت الحفظات.
  let devTimer: ReturnType<typeof setTimeout> | null = null;
  let devResolvers: Array<(r: StoreResult) => void> = [];

  const devSave = (): Promise<StoreResult> => {
    return new Promise((resolve) => {
      devResolvers.push(resolve);
      if (devTimer) clearTimeout(devTimer);
      devTimer = setTimeout(() => {
        const resolvers = devResolvers;
        devResolvers = [];
        devPost(getState()).then((r) => resolvers.forEach((res) => res(r)));
      }, 600);
    });
  };

  const save = (op: () => Promise<StoreResult>): Promise<StoreResult> => {
    if (isSupabaseConfigured()) return op();
    // الإعدادات قد تكون ما زالت تُجلب من السيرفر؛ ننتظرها قبل الحكم بالوضع المحلي
    return initSupabaseRuntime().then(() => (isSupabaseConfigured() ? op() : devSave()));
  };

  const isSupaMode = () => isSupabaseConfigured();

  return {
    mode: isSupaMode() ? ('supabase' as const) : ('dev' as const),

    upsertBrand: (b: Brand) =>
      save(() => sbCall(() => supabase!.from('brands').upsert(brandToRow(b), { onConflict: 'id' }))),
    deleteBrand: (id: string) =>
      save(() => sbCall(() => supabase!.from('brands').delete().eq('id', id))),

    upsertProduct: (p: Product) =>
      save(() => sbCall(() => supabase!.from('products').upsert(productToRow(p), { onConflict: 'id' }))),
    deleteProduct: (id: string) =>
      save(() => sbCall(() => supabase!.from('products').delete().eq('id', id))),

    upsertOrder: (o: Order) =>
      save(() => sbCall(() => supabase!.from('orders').upsert(orderToRow(o), { onConflict: 'id' }))),
    deleteOrder: (id: string) =>
      save(() => sbCall(() => supabase!.from('orders').delete().eq('id', id))),
    deleteAllOrders: () =>
      save(() => sbCall(() => supabase!.from('orders').delete().neq('id', ''))),

    upsertUser: (u: User) =>
      save(() => sbCall(() => supabase!.from('team_users').upsert(userToRow(u), { onConflict: 'id' }))),
    deleteUser: (id: string) =>
      save(() => sbCall(() => supabase!.from('team_users').delete().eq('id', id))),

    insertLogs: (logs: AuditLog[]) =>
      logs.length === 0
        ? Promise.resolve({ ok: true } as StoreResult)
        : save(() => sbCall(() => supabase!.from('audit_logs').insert(logs.map(logToRow)))),
  };
}

export type DataStore = ReturnType<typeof createDataStore>;

export async function loadDevStorage(): Promise<WorkspacePayload | null> {
  try {
    const res = await fetch('/api/storage', { headers: await authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
