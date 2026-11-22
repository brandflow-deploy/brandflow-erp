import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  INITIAL_BRANDS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CURRENCIES,
  DEMO_BRANDS,
  DEMO_PRODUCTS,
  DEMO_ORDERS,
} from './data/seedData';
import {
  AppTab,
  Order,
  Brand,
  Product,
  User,
  AuditLog,
  CurrencyConfig,
  OrderStatus,
  userCanAccessBrand,
} from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { OrdersListView } from './components/OrdersListView';
import { SmartOrderModal } from './components/SmartOrderModal';
import { OrderFormModal } from './components/OrderFormModal';
import { QuickActionModal } from './components/QuickActionModal';
import { BrandsManagementModal } from './components/BrandsManagementModal';
import { ProductsCatalogModal } from './components/ProductsCatalogModal';
import { PrintManifestModal } from './components/PrintManifestModal';
import { LoginScreen } from './components/LoginScreen';
import { TeamSettingsView } from './components/TeamSettingsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { normalizeArabic } from './utils/parser';
import { applyStockDelta } from './utils/variants';
import {
  isSupabaseConfigured,
  initSupabaseRuntime,
  loadWorkspaceFromSupabase,
  fetchCurrentProfile,
  signOut,
  onAuthStateChange,
  supabase,
} from './lib/supabase';
import { createDataStore, fetchServerHealth, loadDevStorage, StoreResult } from './lib/store';
import { CheckCircle2, AlertCircle, Plus, Edit2, Loader2 } from 'lucide-react';

const DEV_SESSION_KEY = 'brandflow_dev_session';

const DEV_ADMIN_USER: User = {
  id: 'dev-admin',
  name: 'مدير التطوير',
  email: 'dev@brandflow.local',
  role: 'admin',
  isActive: true,
  isOwner: true,
  brandsAccess: ['all'],
};

const STATUS_NAMES: Record<OrderStatus, string> = {
  manufacturing: 'قيد التصنيع',
  ready_to_ship: 'جاهز للشحن',
  shipped: 'تم الشحن مع المندوب',
  delivered: 'تم التسليم والتحصيل',
  returned: 'مرتجع',
  cancelled: 'ملغي',
};

export default function App() {
  // البيانات (المصدر الحقيقي: Supabase / db.json للتطوير)
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // المصادقة
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [devAuthEnabled, setDevAuthEnabled] = useState(false);
  const [devSession, setDevSession] = useState<boolean>(
    () =>
      localStorage.getItem(DEV_SESSION_KEY) === '1' ||
      sessionStorage.getItem(DEV_SESSION_KEY) === '1'
  );

  // أحدث نسخة من الحالة لطبقة الحفظ (وضع التطوير يحفظ مساحة العمل كاملة)
  const stateRef = useRef({ brands, products, orders, users, auditLogs });
  useEffect(() => {
    stateRef.current = { brands, products, orders, users, auditLogs };
  });
  const store = useMemo(() => createDataStore(() => stateRef.current), []);

  const [currencies] = useState<CurrencyConfig[]>(INITIAL_CURRENCIES);
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyConfig>(INITIAL_CURRENCIES[0]);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // عرض نتيجة الحفظ بصراحة: أي فشل في قاعدة البيانات يظهر فوراً ولا يضيع بصمت
  const reportSave = (r: StoreResult, what: string) => {
    if (!r.ok) {
      showToast(`تعذر حفظ ${what} في قاعدة البيانات: ${r.error || 'خطأ غير معروف'}`, 'error');
    }
  };

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');

  // Modals state
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isBrandsModalOpen, setIsBrandsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isPrintManifestOpen, setIsPrintManifestOpen] = useState(false);
  const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);

  // تهيئة المصادقة
  useEffect(() => {
    fetchServerHealth().then((h) => setDevAuthEnabled(h.devAuthEnabled));
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: () => void = () => {};

    const startAuth = () => {
      if (!isSupabaseConfigured()) {
        setAuthReady(true);
        return;
      }
      const loadProfile = async () => {
      const { profile, error } = await fetchCurrentProfile();
      if (!mounted) return;
      if (profile) {
        if (profile.isActive === false) {
          setProfileError('هذا الحساب معطّل حالياً. يرجى مراجعة المدير العام.');
          await signOut();
          setCurrentUser(null);
        } else {
          setCurrentUser(profile);
          setProfileError(null);
        }
      } else if (error) {
        setProfileError(error);
      }
    };

      supabase!.auth.getSession().then(async ({ data }) => {
        if (data.session) await loadProfile();
        if (mounted) setAuthReady(true);
      });

      const sub = onAuthStateChange((hasSession) => {
        if (hasSession) {
          loadProfile();
        } else {
          setCurrentUser(null);
        }
      });
      unsubscribe = sub.unsubscribe;
    };

    // نجهز إعدادات Supabase (من السيرفر وقت التشغيل إن لزم) قبل بدء الجلسة
    initSupabaseRuntime().then(() => {
      if (mounted) startAuth();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleDevLogin = (rememberMe: boolean) => {
    window.__DEV_TOKEN__ = 'dev-local-token';
    if (rememberMe) {
      localStorage.setItem(DEV_SESSION_KEY, '1');
      sessionStorage.removeItem(DEV_SESSION_KEY);
    } else {
      sessionStorage.setItem(DEV_SESSION_KEY, '1');
      localStorage.removeItem(DEV_SESSION_KEY);
    }
    setDevSession(true);
    showToast('تم الدخول في وضع التطوير المحلي', 'info');
  };

  const handleLogout = async () => {
    if (effectiveUser) {
      appendLogs([buildLog('تسجيل خروج', `قام ${effectiveUser.name} بتسجيل الخروج`)]);
    }
    localStorage.removeItem(DEV_SESSION_KEY);
    sessionStorage.removeItem(DEV_SESSION_KEY);
    window.__DEV_TOKEN__ = undefined;
    setDevSession(false);
    setCurrentUser(null);
    await signOut();
  };

  const effectiveUser: User | null = devSession ? DEV_ADMIN_USER : currentUser;

  // تحميل البيانات بعد الدخول
  useEffect(() => {
    if (!effectiveUser) return;
    let cancelled = false;

    async function load() {
      if (isSupabaseConfigured()) {
        const { data, error } = await loadWorkspaceFromSupabase();
        if (cancelled) return;
        if (error) {
          setDataError(error);
        }
        if (data) {
          setBrands(data.brands);
          setProducts(data.products);
          setOrders(data.orders);
          setUsers(data.users);
          setAuditLogs(data.auditLogs);
          // أول تشغيل على قاعدة فارغة: زرع برانداتها الثلاثة الحقيقية
          if (data.brands.length === 0 && effectiveUser?.role === 'admin') {
            for (const b of INITIAL_BRANDS) {
              store.upsertBrand(b).then((r) => reportSave(r, `البراند ${b.name}`));
            }
            setBrands(INITIAL_BRANDS);
          }
        }
      } else {
        const data = await loadDevStorage();
        if (cancelled) return;
        if (data && Array.isArray(data.orders)) {
          setBrands(Array.isArray(data.brands) && data.brands.length > 0 ? data.brands : INITIAL_BRANDS);
          setProducts(Array.isArray(data.products) ? data.products : []);
          setOrders(data.orders);
          setUsers(Array.isArray(data.users) ? data.users : []);
          setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
        } else {
          // وضع التطوير لأول مرة: برانداتها الثلاثة كنقطة بداية
          setBrands(INITIAL_BRANDS);
          setProducts(INITIAL_PRODUCTS);
          setOrders(INITIAL_ORDERS);
          setUsers([]);
          setAuditLogs(INITIAL_AUDIT_LOGS);
        }
      }
      if (!cancelled) setDataLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUser?.id]);

  // صلاحيات العرض حسب الدور والبراندات
  const visibleBrands = useMemo(
    () => brands.filter((b) => userCanAccessBrand(effectiveUser, b.id)),
    [brands, effectiveUser]
  );
  const visibleOrders = useMemo(
    () => orders.filter((o) => userCanAccessBrand(effectiveUser, o.brandId)),
    [orders, effectiveUser]
  );
  const visibleProducts = useMemo(
    () => products.filter((p) => userCanAccessBrand(effectiveUser, p.brandId)),
    [products, effectiveUser]
  );

  // Enforce role-based default tab & route protection
  useEffect(() => {
    if (!effectiveUser) return;
    if (effectiveUser.role === 'production') {
      if (activeTab !== 'catalog' && activeTab !== 'orders') setActiveTab('catalog');
    } else if (effectiveUser.role === 'shipping') {
      if (activeTab !== 'orders') setActiveTab('orders');
    } else if (effectiveUser.role === 'moderator') {
      if (activeTab === 'catalog' || activeTab === 'audit' || activeTab === 'settings') {
        setActiveTab('dashboard');
      }
    }
  }, [effectiveUser, activeTab]);

  const nextOrderNumber = useMemo(() => {
    let max = 1000;
    orders.forEach((o) => {
      const match = o.orderNumber.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > max) max = num;
      }
    });
    return max + 1;
  }, [orders]);

  // سجل العمليات
  const appendLogs = (newEntries: AuditLog[]) => {
    if (newEntries.length === 0) return;
    setAuditLogs((prev) => [...newEntries, ...prev]);
    store.insertLogs(newEntries).then((r) => reportSave(r, 'سجل العمليات'));
  };

  const buildLog = (action: string, details: string, order?: Order, actor?: User): AuditLog => {
    const user = actor || effectiveUser || DEV_ADMIN_USER;
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      orderId: order?.id,
      orderNumber: order?.orderNumber,
      details,
    };
  };

  // محرك المخزون (واعي بالمتغيرات والبراند)
  // المطابقة: بمعرّف المنتج أولاً، وإلا بالاسم داخل نفس البراند فقط - لا مطابقة عبر براندات مختلفة
  const applyInventoryForOrder = (
    currentProducts: Product[],
    order: Order,
    direction: 'deduct' | 'restore'
  ): { updatedProducts: Product[]; changesSummary: string[] } => {
    const changesSummary: string[] = [];
    let updatedProducts = currentProducts.map((p) => ({ ...p }));

    order.items.forEach((item) => {
      let targetIndex = -1;
      if (item.productId) {
        targetIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      }
      if (targetIndex < 0) {
        targetIndex = updatedProducts.findIndex(
          (p) =>
            normalizeArabic(p.name) === normalizeArabic(item.productName) &&
            p.brandId === order.brandId
        );
      }
      if (targetIndex < 0) return;

      const prod = updatedProducts[targetIndex];
      const { product: updated, changed, label } = applyStockDelta(prod, item, direction);
      if (changed) {
        updatedProducts[targetIndex] = updated;
        changesSummary.push(label);
      }
    });

    return { updatedProducts, changesSummary };
  };

  const evaluateOrderInventoryTransition = (
    workingProducts: Product[],
    order: Order,
    shouldDeduct: boolean,
    shouldRestore: boolean
  ): { finalOrder: Order; updatedProducts: Product[]; inventoryLog: AuditLog | null } => {
    if (shouldDeduct && !order.inventoryDeducted) {
      const { updatedProducts, changesSummary } = applyInventoryForOrder(
        workingProducts,
        order,
        'deduct'
      );
      const updatedOrder: Order = { ...order, inventoryDeducted: true };
      const log =
        changesSummary.length > 0
          ? buildLog(
              'خصم تلقائي من المخزون',
              `تم شحن الأوردر ${order.orderNumber} وخصم الكميات تلقائياً من المخزن: ${changesSummary.join('، ')}`,
              updatedOrder
            )
          : null;
      return { finalOrder: updatedOrder, updatedProducts, inventoryLog: log };
    }

    if (shouldRestore && order.inventoryDeducted) {
      const { updatedProducts, changesSummary } = applyInventoryForOrder(
        workingProducts,
        order,
        'restore'
      );
      const updatedOrder: Order = { ...order, inventoryDeducted: false };
      const log =
        changesSummary.length > 0
          ? buildLog(
              'إرجاع تلقائي للمخزون',
              `تم تحويل الأوردر ${order.orderNumber} إلى مرتجع/ملغي وإعادة الكميات للمخزن: ${changesSummary.join('، ')}`,
              updatedOrder
            )
          : null;
      return { finalOrder: updatedOrder, updatedProducts, inventoryLog: log };
    }

    return { finalOrder: order, updatedProducts: workingProducts, inventoryLog: null };
  };

  // حفظ المنتجات المتأثرة بخصم/إرجاع المخزون في قاعدة البيانات
  const persistProductsDiff = (before: Product[], after: Product[]) => {
    const beforeMap = new Map(before.map((p) => [p.id, p]));
    after.forEach((p) => {
      const old = beforeMap.get(p.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(p)) {
        store.upsertProduct(p).then((r) => reportSave(r, `المنتج ${p.name}`));
      }
    });
  };

  // ===================== معالجات الأوردرات =====================
  const handleSaveOrder = (savedOrder: Order) => {
    const existing = orders.find((o) => o.id === savedOrder.id);
    const logsToAdd: AuditLog[] = [];

    const entersDeductedState =
      savedOrder.status === 'shipped' || savedOrder.status === 'delivered';
    const entersRestoredState =
      savedOrder.status === 'returned' || savedOrder.status === 'cancelled';

    let workingProducts = products;

    // تسوية المخزون عند تعديل أوردر سبق خصمه: إرجاع الكميات القديمة أولاً ثم خصم الجديدة
    if (existing && existing.inventoryDeducted) {
      const restored = applyInventoryForOrder(workingProducts, existing, 'restore');
      workingProducts = restored.updatedProducts;
      if (restored.changesSummary.length > 0) {
        logsToAdd.push(
          buildLog(
            'تسوية مخزون بعد تعديل',
            `تم تعديل الأوردر ${existing.orderNumber} بعد خصمه، فأُعيدت الكميات القديمة للمخزن: ${restored.changesSummary.join('، ')}`,
            existing
          )
        );
      }
    }

    const { finalOrder, updatedProducts, inventoryLog } = evaluateOrderInventoryTransition(
      workingProducts,
      { ...savedOrder, inventoryDeducted: false },
      entersDeductedState,
      entersRestoredState
    );

    persistProductsDiff(products, updatedProducts);
    setProducts(updatedProducts);
    if (inventoryLog) logsToAdd.push(inventoryLog);

    if (existing) {
      setOrders((prev) => prev.map((o) => (o.id === finalOrder.id ? finalOrder : o)));
      logsToAdd.unshift(
        buildLog(
          'تعديل أوردر',
          `تم حفظ وتعديل بيانات الأوردر ${finalOrder.orderNumber} (${finalOrder.customerName})`,
          finalOrder
        )
      );
      showToast(`تم حفظ وتحديث الأوردر (${finalOrder.orderNumber}) بنجاح`);
    } else {
      setOrders((prev) => [finalOrder, ...prev]);
      logsToAdd.unshift(
        buildLog(
          'إضافة أوردر جديد',
          `تم تسجيل أوردر جديد ${finalOrder.orderNumber} بقيمة إجمالية ${finalOrder.totalAmount} ج.م للعميل ${finalOrder.customerName}`,
          finalOrder
        )
      );
      showToast(`تم تسجيل الأوردر الجديد (${finalOrder.orderNumber}) في النظام بنجاح`);
    }

    store.upsertOrder(finalOrder).then((r) => reportSave(r, `الأوردر ${finalOrder.orderNumber}`));
    appendLogs(logsToAdd);
  };

  // Bulk Save from Smart Text Importer
  const handleSaveBulkOrders = (newOrders: Order[]) => {
    let workingProducts = [...products];
    const processedOrders: Order[] = [];
    const logsToAdd: AuditLog[] = [];

    newOrders.forEach((ord) => {
      const entersDeducted = ord.status === 'shipped' || ord.status === 'delivered';
      const { finalOrder, updatedProducts, inventoryLog } = evaluateOrderInventoryTransition(
        workingProducts,
        { ...ord, inventoryDeducted: false },
        entersDeducted,
        false
      );
      workingProducts = updatedProducts;
      processedOrders.push(finalOrder);
      if (inventoryLog) logsToAdd.push(inventoryLog);
    });

    persistProductsDiff(products, workingProducts);
    setProducts(workingProducts);
    setOrders((prev) => [...processedOrders, ...prev]);
    processedOrders.forEach((o) =>
      store.upsertOrder(o).then((r) => reportSave(r, `الأوردر ${o.orderNumber}`))
    );
    logsToAdd.unshift(
      buildLog(
        'استيراد أوردرات ذكي',
        `تم استيراد ${processedOrders.length} أوردر من خلال محلل الرسائل الذكي بنجاح`
      )
    );
    appendLogs(logsToAdd);
    showToast(`تم استيراد وحفظ ${processedOrders.length} أوردر في النظام بنجاح`);
  };

  // Status Update with Automatic Inventory Sync
  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    customReason?: string
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.status === newStatus) return;

    // مسؤول الشحن: حالات الشحن والتسليم فقط
    if (effectiveUser?.role === 'shipping') {
      const allowed: OrderStatus[] = ['shipped', 'delivered', 'returned'];
      if (!allowed.includes(newStatus)) {
        showToast('صلاحية مسؤول الشحن تسمح فقط بتحديث حالات الشحن والتسليم والمرتجع', 'error');
        return;
      }
    }

    const oldStatus = target.status;
    const draftUpdated: Order = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: effectiveUser?.name,
    };

    const entersDeducted = newStatus === 'shipped' || newStatus === 'delivered';
    const entersRestored = newStatus === 'returned' || newStatus === 'cancelled';

    const { finalOrder, updatedProducts, inventoryLog } = evaluateOrderInventoryTransition(
      products,
      draftUpdated,
      entersDeducted,
      entersRestored
    );

    persistProductsDiff(products, updatedProducts);
    setProducts(updatedProducts);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? finalOrder : o)));
    store.upsertOrder(finalOrder).then((r) => reportSave(r, `الأوردر ${target.orderNumber}`));

    const logsToAdd: AuditLog[] = [
      buildLog(
        'تحديث حالة الأوردر',
        `${customReason ? customReason + ' - ' : ''}تغيير حالة الأوردر ${target.orderNumber} من "${STATUS_NAMES[oldStatus]}" إلى "${STATUS_NAMES[newStatus]}"`,
        finalOrder
      ),
    ];
    if (inventoryLog) logsToAdd.unshift(inventoryLog);
    appendLogs(logsToAdd);

    showToast(
      inventoryLog
        ? `تم تحديث ${target.orderNumber} إلى "${STATUS_NAMES[newStatus]}" وتحديث رصيد المخزن تلقائياً`
        : `تم تغيير حالة أوردر ${target.orderNumber} إلى: ${STATUS_NAMES[newStatus]}`
    );
  };

  // Delete Order (Admin only) - مع إرجاع المخزون إن كان مخصوماً
  const handleDeleteOrder = (orderId: string) => {
    if (effectiveUser?.role !== 'admin') return;
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    if (target.inventoryDeducted) {
      const restored = applyInventoryForOrder(products, target, 'restore');
      persistProductsDiff(products, restored.updatedProducts);
      setProducts(restored.updatedProducts);
    }

    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    store.deleteOrder(orderId).then((r) => reportSave(r, `حذف الأوردر ${target.orderNumber}`));
    appendLogs([
      buildLog('حذف أوردر', `قام المدير بحذف الأوردر ${target.orderNumber} نهائياً`, target),
    ]);
    showToast(`تم حذف الأوردر ${target.orderNumber} من النظام`, 'info');
  };

  // ===================== معالجات البراندات (للمدير) =====================
  const handleAddBrand = (newBrand: Brand) => {
    setBrands((prev) => [...prev, newBrand]);
    store.upsertBrand(newBrand).then((r) => reportSave(r, `البراند ${newBrand.name}`));
    appendLogs([
      buildLog(
        'إضافة براند جديد',
        `تمت إضافة براند جديد بنجاح: "${newBrand.name}" دون أي تأثير على الأوردرات السابقة`
      ),
    ]);
    showToast(`تمت إضافة براند جديد (${newBrand.name}) بنجاح`);
  };

  const handleUpdateBrand = (updatedBrand: Brand) => {
    setBrands((prev) => prev.map((b) => (b.id === updatedBrand.id ? updatedBrand : b)));
    store.upsertBrand(updatedBrand).then((r) => reportSave(r, `البراند ${updatedBrand.name}`));
    appendLogs([buildLog('تعديل براند', `تم تعديل بيانات البراند: "${updatedBrand.name}"`)]);
    showToast(`تم حفظ وتحديث بيانات براند (${updatedBrand.name}) بنجاح`);
  };

  const handleDeleteBrand = (brandId: string) => {
    const target = brands.find((b) => b.id === brandId);
    setBrands((prev) => prev.filter((b) => b.id !== brandId));
    // في وضع التطوير المحلي نحذف منتجات البراند يدوياً (في Supabase يحذفها الـ cascade)
    setProducts((prev) => prev.filter((p) => p.brandId !== brandId));
    store.deleteBrand(brandId).then((r) => reportSave(r, `حذف البراند ${target?.name || ''}`));
    if (target) {
      appendLogs([buildLog('حذف براند', `تم حذف براند "${target.name}"`)]);
      showToast(`تم حذف براند (${target.name})`, 'info');
    }
  };

  // ===================== معالجات الكتالوج =====================
  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [...prev, newProduct]);
    store.upsertProduct(newProduct).then((r) => reportSave(r, `المنتج ${newProduct.name}`));
    appendLogs([
      buildLog(
        'إضافة منتج للكتالوج',
        `تمت إضافة منتج "${newProduct.name}" بتكلفة تصنيع ثابتة: ${newProduct.manufacturingCost} ج.م`
      ),
    ]);
    showToast(`تمت إضافة صنف (${newProduct.name}) بنجاح`);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    store.upsertProduct(updatedProduct).then((r) => reportSave(r, `المنتج ${updatedProduct.name}`));
    appendLogs([
      buildLog(
        'تعديل منتج في الكتالوج',
        `تم تعديل المنتج "${updatedProduct.name}" وتحديث بياناته ومخزونه`
      ),
    ]);
    showToast(`تم تحديث بيانات صنف (${updatedProduct.name}) بنجاح`);
  };

  const handleDeleteProduct = (productId: string) => {
    if (effectiveUser?.role !== 'admin') return;
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    store.deleteProduct(productId).then((r) => reportSave(r, `حذف المنتج ${target?.name || ''}`));
    if (target) {
      appendLogs([buildLog('حذف منتج من الكتالوج', `تم حذف المنتج "${target.name}" من الكتالوج`)]);
      showToast(`تم حذف المنتج (${target.name}) من الكتالوج`, 'info');
    }
  };

  const handleUpdateStock = (productId: string, newStock: number, variantId?: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const safeStock = Math.max(0, newStock);

    let updated: Product;
    let detail: string;
    if (variantId && target.variants && target.variants.length > 0) {
      const variants = target.variants.map((v) =>
        v.id === variantId ? { ...v, stockQuantity: safeStock } : v
      );
      const total = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
      updated = { ...target, variants, stockQuantity: total };
      const v = target.variants.find((x) => x.id === variantId);
      detail = `تعديل مخزون "${target.name}" (${v?.size || ''} / ${v?.color || ''}) من ${v?.stockQuantity ?? 0} إلى ${safeStock} قطعة`;
    } else {
      updated = { ...target, stockQuantity: safeStock };
      detail = `تعديل مخزون "${target.name}" من ${target.stockQuantity} إلى ${safeStock} قطعة`;
    }

    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    store.upsertProduct(updated).then((r) => reportSave(r, `مخزون ${target.name}`));
    appendLogs([buildLog('تعديل رصيد المخزن', detail)]);
    showToast('تم تحديث رصيد المخزون بنجاح');
  };

  // ===================== الفريق =====================
  const handleProfileSaved = (savedUser: User) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === savedUser.id);
      return exists ? prev.map((u) => (u.id === savedUser.id ? savedUser : u)) : [...prev, savedUser];
    });
    appendLogs([
      buildLog('تحديث فريق العمل', `تم حفظ بيانات وصلاحية "${savedUser.name}" (${savedUser.role})`),
    ]);
  };

  const handleDeleteTeamUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (target) {
      appendLogs([buildLog('حذف عضو من الفريق', `تم حذف حساب الموظف "${target.name}" (${target.email})`)]);
      showToast(`تم حذف حساب "${target.name}"`, 'info');
    }
  };

  // ===================== البيانات التجريبية والنسخ الاحتياطي =====================
  const handleClearDemoOrders = () => {
    setOrders([]);
    store.deleteAllOrders().then((r) => reportSave(r, 'تفريغ الأوردرات'));
    showToast('تم تفريغ وحذف كافة الأوردرات بنجاح', 'success');
    appendLogs([buildLog('تفريغ الأوردرات', 'تم حذف الأوردرات وتصفير المبيعات للبدء ببيانات جديدة')]);
  };

  const handleResetToDemoData = () => {
    // حزمة تجريبية صريحة للتجربة فقط - يمكن مسحها من نفس المكان
    setBrands(DEMO_BRANDS);
    setProducts(DEMO_PRODUCTS);
    setOrders(DEMO_ORDERS);
    DEMO_BRANDS.forEach((b) => store.upsertBrand(b).then((r) => reportSave(r, `البراند ${b.name}`)));
    DEMO_PRODUCTS.forEach((p) => store.upsertProduct(p).then((r) => reportSave(r, `المنتج ${p.name}`)));
    DEMO_ORDERS.forEach((o) => store.upsertOrder(o).then((r) => reportSave(r, `الأوردر ${o.orderNumber}`)));
    showToast('تم تحميل بيانات تجريبية للتجربة - يمكن مسحها في أي وقت من هنا', 'info');
    appendLogs([buildLog('تحميل بيانات تجريبية', 'تم تحميل حزمة البيانات التجريبية لغرض التجربة')]);
  };

  const handleExportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      brands,
      products,
      orders,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brandflow-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('تم تنزيل النسخة الاحتياطية الكاملة بنجاح');
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.brands) || !Array.isArray(parsed.orders)) {
        return { ok: false, message: 'ملف النسخة الاحتياطية غير صالح' };
      }
      setBrands(parsed.brands);
      if (Array.isArray(parsed.products)) setProducts(parsed.products);
      setOrders(parsed.orders);
      if (Array.isArray(parsed.auditLogs)) setAuditLogs(parsed.auditLogs);
      (parsed.brands as Brand[]).forEach((b) => store.upsertBrand(b));
      ((parsed.products || []) as Product[]).forEach((p) => store.upsertProduct(p));
      (parsed.orders as Order[]).forEach((o) => store.upsertOrder(o));
      appendLogs([buildLog('استيراد نسخة احتياطية', `تمت استعادة البيانات من الملف ${file.name}`)]);
      showToast('تم استيراد كافة البيانات بنجاح');
      return { ok: true, message: 'تمت استعادة جميع البراندات والأوردرات والمنتجات بنجاح' };
    } catch {
      return { ok: false, message: 'تعذر قراءة الملف — تأكد من أنه ملف JSON صحيح' };
    }
  };

  // Print Waybills
  const handlePrintOrders = (selectedOrders: Order[]) => {
    setOrdersToPrint(selectedOrders);
    setIsPrintManifestOpen(true);
  };

  // ===================== شاشات التهيئة =====================
  if (!authReady) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!effectiveUser) {
    return (
      <>
        {profileError && (
          <div dir="rtl" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 bg-rose-600 text-white border-rose-500 text-xs font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{profileError}</span>
            <button onClick={() => setProfileError(null)} className="mr-2 text-rose-200 hover:text-white">✕</button>
          </div>
        )}
        <LoginScreen devAuthEnabled={devAuthEnabled} onDevLogin={handleDevLogin} />
        <OfflineIndicator />
      </>
    );
  }

  if (!dataLoaded) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold">جارٍ تحميل بيانات مساحة العمل...</p>
      </div>
    );
  }

  const isAdmin = effectiveUser.role === 'admin';
  const isModerator = effectiveUser.role === 'moderator';
  const isShipping = effectiveUser.role === 'shipping';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 selection:bg-indigo-600 selection:text-white pb-12">
      {/* Primary Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={effectiveUser}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        onLogout={handleLogout}
        currencies={currencies}
        currentCurrency={currentCurrency}
        onSelectCurrency={setCurrentCurrency}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="mr-2 text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}

      {dataError && (
        <div className="no-print max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تعذر تحميل بعض البيانات من قاعدة البيانات: {dataError}</span>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (isAdmin || isModerator) && (
          <DashboardView
            orders={visibleOrders}
            brands={visibleBrands}
            currency={currentCurrency}
            currentUser={effectiveUser}
            onOpenSmartModal={() => setIsSmartModalOpen(true)}
            onOpenNewOrderModal={() => {
              setOrderToEdit(null);
              setIsOrderFormOpen(true);
            }}
            onSelectBrandFilter={(bId) => {
              if (bId === 'all') {
                setIsBrandsModalOpen(true);
              } else {
                setSelectedBrandFilter(bId);
                setActiveTab('orders');
              }
            }}
            onNavigateToOrdersWithStatus={(st) => {
              setSelectedStatusFilter(st);
              setActiveTab('orders');
            }}
            onOpenTeamSettings={isAdmin ? () => setActiveTab('settings') : undefined}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersListView
            orders={visibleOrders}
            brands={visibleBrands}
            currentUser={effectiveUser}
            currency={currentCurrency}
            selectedStatusFilter={selectedStatusFilter}
            onChangeStatusFilter={setSelectedStatusFilter}
            onOpenNewOrderModal={() => {
              setOrderToEdit(null);
              setIsOrderFormOpen(true);
            }}
            onOpenSmartModal={() => setIsSmartModalOpen(true)}
            onEditOrder={(ord) => {
              setOrderToEdit(ord);
              setIsOrderFormOpen(true);
            }}
            onDeleteOrder={handleDeleteOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onPrintOrders={handlePrintOrders}
            selectedBrandFilter={selectedBrandFilter}
            onSelectBrandFilter={setSelectedBrandFilter}
          />
        )}

        {/* BRANDS TAB (Admin: Full Edit | Moderator: Read-Only) */}
        {activeTab === 'brands' && (isAdmin || isModerator) && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>{isAdmin ? 'إدارة البراندات وتعديل أسعارها' : 'البراندات المسجلة (للعرض فقط)'}</span>
                  <span className="text-xs font-mono text-indigo-700 font-bold">
                    ({visibleBrands.length} براند)
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {isAdmin
                    ? 'يمكنك إضافة أي براند جديد أو تعديل أسعار الشحن والاسم في أي وقت دون أي تأثير على الأوردرات السابقة'
                    : 'استعراض البراندات المسجلة وأسعار الشحن للعملاء وحجم المبيعات'}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setIsBrandsModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة / تعديل براند</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleBrands.map((brand) => {
                // المرتجع والملغي مستبعدان من المبيعات والأرباح
                const brandOrders = orders.filter((o) => o.brandId === brand.id);
                const countedOrders = brandOrders.filter(
                  (o) => o.status !== 'cancelled' && o.status !== 'returned'
                );
                const totalRevenue = countedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
                const totalNetProfit = countedOrders.reduce((s, o) => s + (o.netProfit || 0), 0);

                return (
                  <div
                    key={brand.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-sm">
                          {brand.code}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{brand.name}</h3>
                          <span className="text-[11px] text-slate-400 font-mono">
                            كود: {brand.code}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setIsBrandsModalOpen(true)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-8">
                      {brand.description || 'أزياء ومنتجات راقية وتصنيع محلي'}
                    </p>

                    <div
                      className={`grid gap-2 pt-2 border-t border-slate-100 text-center font-mono text-xs ${
                        isAdmin ? 'grid-cols-3' : 'grid-cols-2'
                      }`}
                    >
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-400 font-sans">الأوردرات</div>
                        <div className="font-bold text-slate-900">{brandOrders.length}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-400 font-sans">المبيعات</div>
                        <div className="font-bold text-slate-900">{totalRevenue} ج.م</div>
                      </div>
                      {isAdmin && (
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <div className="text-[10px] text-slate-400 font-sans">صافي المكسب</div>
                          <div className="font-bold text-emerald-600">{totalNetProfit} ج.م</div>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 font-mono">
                      <span>
                        شحن العميل: <b className="text-slate-800">{brand.defaultCustomerShipping} ج.م</b>
                      </span>
                      {isAdmin && (
                        <span>
                          تكلفة المندوب: <b className="text-slate-800">{brand.defaultActualShipping} ج.م</b>
                        </span>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setSelectedBrandFilter(brand.id);
                          setActiveTab('orders');
                        }}
                        className="w-full py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-center"
                      >
                        عرض أوردرات البراند ({brandOrders.length}) ←
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CATALOG & INVENTORY TAB (Admin & Production only) */}
        {activeTab === 'catalog' && !isModerator && !isShipping && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    {isAdmin
                      ? 'كتالوج المنتجات وتكاليف التصنيع والمخزون'
                      : 'التصنيع والمخزن — إدارة الأرصدة والكميات'}
                  </span>
                  <span className="text-xs font-mono text-sky-700 font-bold">
                    ({visibleProducts.length} صنف)
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {isAdmin
                    ? 'تعديل تكاليف الخامات والتصنيع وإدارة أرصدة المخزون لكل صنف'
                    : 'تحديث أرصدة المخزون الفعلي ومتابعة تنبيهات انخفاض الكمية للأصناف قيد التجهيز'}
                </p>
              </div>
              <button
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isAdmin ? 'إضافة / تعديل صنف وتكاليفه' : 'فتح جدول المخزون الكامل'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleProducts.map((prod) => {
                const brand = brands.find((b) => b.id === prod.brandId);
                const totalCost = prod.rawMaterialCost + prod.manufacturingCost;
                const unitProfit = prod.defaultSellingPrice - totalCost;
                const hasVariants = Boolean(prod.variants && prod.variants.length > 0);
                const displayStock = hasVariants
                  ? prod.variants!.reduce((s, v) => s + (v.stockQuantity || 0), 0)
                  : prod.stockQuantity;
                const isLowStock = displayStock <= prod.lowStockThreshold;

                return (
                  <div
                    key={prod.id}
                    className={`bg-white p-4 rounded-xl border shadow-xs space-y-2.5 transition-all ${
                      isLowStock ? 'border-rose-300' : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{prod.name}</h4>
                        <span className="text-[10px] text-indigo-600 font-semibold">
                          {brand?.name} {prod.sku ? `· ${prod.sku}` : ''}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setIsCatalogModalOpen(true)}
                          className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          سعر الخام: <b className="text-amber-700">{prod.rawMaterialCost}</b> ج.م
                        </div>
                        <div>
                          تكلفة التصنيع: <b className="text-sky-700">{prod.manufacturingCost}</b> ج.م
                        </div>
                        <div>
                          سعر البيع: <b className="text-slate-900">{prod.defaultSellingPrice}</b> ج.م
                        </div>
                        <div>
                          مكسب القطعة: <b className="text-emerald-600 font-bold">+{unitProfit}</b> ج.م
                        </div>
                      </div>
                    )}

                    {hasVariants && (
                      <div className="flex flex-wrap gap-1">
                        {prod.variants!.map((v) => (
                          <span
                            key={v.id}
                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-slate-600"
                          >
                            {v.size} / {v.color}: {v.stockQuantity}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-600 font-semibold">الكمية بالمخزن:</span>
                        {isLowStock && (
                          <span className="mr-2 text-[10px] font-bold text-rose-600">
                            (مخزون منخفض)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <button
                          onClick={() => handleUpdateStock(prod.id, Math.max(0, displayStock - 1))}
                          disabled={hasVariants}
                          className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold flex items-center justify-center transition-colors"
                          title={hasVariants ? 'عدّل المخزون لكل مقاس/لون من جدول المتغيرات' : 'إنقاص قطعة'}
                        >
                          -
                        </button>
                        <span
                          className={`font-bold px-2 tabular-nums ${
                            isLowStock ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {displayStock}
                        </span>
                        <button
                          onClick={() => handleUpdateStock(prod.id, displayStock + 1)}
                          disabled={hasVariants}
                          className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold flex items-center justify-center transition-colors"
                          title={hasVariants ? 'عدّل المخزون لكل مقاس/لون من جدول المتغيرات' : 'زيادة قطعة'}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AUDIT LOG TAB (Admin only) */}
        {activeTab === 'audit' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">سجل العمليات والرقابة (Audit Log)</h1>
                <p className="text-xs text-slate-500">
                  تتبع كل تغيير: إضافة الأوردرات، تحديث الحالات، وحركات الخصم والإرجاع التلقائي للمخزون
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.userName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-indigo-600 font-bold">{log.action}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{log.details}</div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM & SETTINGS TAB (Admin only) */}
        {activeTab === 'settings' && isAdmin && (
          <TeamSettingsView
            users={users}
            brands={brands}
            currentUser={effectiveUser}
            ordersCount={orders.length}
            onProfileSaved={handleProfileSaved}
            onDeleteUser={handleDeleteTeamUser}
            onClearDemoOrders={handleClearDemoOrders}
            onResetToDemoData={handleResetToDemoData}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}
      </main>

      <OfflineIndicator />

      {/* Modals */}
      <SmartOrderModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        brands={visibleBrands}
        catalogProducts={visibleProducts}
        currentUser={effectiveUser}
        onSaveOrders={handleSaveBulkOrders}
        nextOrderNumber={nextOrderNumber}
      />

      <OrderFormModal
        isOpen={isOrderFormOpen}
        onClose={() => {
          setIsOrderFormOpen(false);
          setOrderToEdit(null);
        }}
        orderToEdit={orderToEdit}
        brands={visibleBrands}
        catalogProducts={visibleProducts}
        currentUser={effectiveUser}
        onSaveOrder={handleSaveOrder}
        onPrintOrder={(ord) => handlePrintOrders([ord])}
        nextOrderNumber={nextOrderNumber}
      />

      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        orders={visibleOrders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        currentUser={effectiveUser}
      />

      <BrandsManagementModal
        isOpen={isBrandsModalOpen}
        onClose={() => setIsBrandsModalOpen(false)}
        brands={brands}
        orders={orders}
        currentUser={effectiveUser}
        currency={currentCurrency}
        onAddBrand={handleAddBrand}
        onUpdateBrand={handleUpdateBrand}
        onDeleteBrand={handleDeleteBrand}
      />

      <ProductsCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        products={visibleProducts}
        brands={visibleBrands}
        currentUser={effectiveUser}
        currency={currentCurrency}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateStock={handleUpdateStock}
      />

      <PrintManifestModal
        isOpen={isPrintManifestOpen}
        onClose={() => setIsPrintManifestOpen(false)}
        ordersToPrint={ordersToPrint}
      />
    </div>
  );
}
