import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { Order, OrderItem, Brand, Product, OrderStatus, User } from '../types';
import { recalculateOrder } from '../utils/calculations';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit?: Order | null;
  brands: Brand[];
  catalogProducts: Product[];
  currentUser: User;
  onSaveOrder: (order: Order) => void;
  onPrintOrder?: (order: Order) => void;
  nextOrderNumber: number;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  orderToEdit,
  brands,
  catalogProducts,
  currentUser,
  onSaveOrder,
  onPrintOrder,
  nextOrderNumber,
}) => {
  const [brandId, setBrandId] = useState<string>(brands[0]?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [city, setCity] = useState('القاهرة');
  const [customerAddress, setCustomerAddress] = useState('');
  const [status, setStatus] = useState<OrderStatus>('manufacturing');
  const [notes, setNotes] = useState('');
  const [customerShipping, setCustomerShipping] = useState<number>(65);
  const [actualShippingCost, setActualShippingCost] = useState<number>(55);
  const [extraExpenses, setExtraExpenses] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [items, setItems] = useState<
    {
      id: string;
      productId?: string;
      variantId?: string;
      size?: string;
      color?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      rawMaterialCost: number;
      manufacturingCost: number;
    }[]
  >([]);

  // مفتاح مسودة الأوردر الجديد لهذا المستخدم على هذا الجهاز
  const draftKey = `orderFormDraft:${currentUser.id}`;

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* لا شيء */
    }
  };

  // حفظ تلقائي للمسودة أثناء الكتابة: أي إغلاق أو تحديث مفاجئ للصفحة لا يضيّع المدخلات
  useEffect(() => {
    if (!isOpen || orderToEdit) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            brandId,
            customerName,
            customerPhone,
            customerPhone2,
            city,
            customerAddress,
            status,
            notes,
            customerShipping,
            actualShippingCost,
            extraExpenses,
            items,
          })
        );
      } catch {
        /* لا شيء */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [
    isOpen,
    orderToEdit,
    draftKey,
    brandId,
    customerName,
    customerPhone,
    customerPhone2,
    city,
    customerAddress,
    status,
    notes,
    customerShipping,
    actualShippingCost,
    extraExpenses,
    items,
  ]);

  const canViewFinancials = currentUser.role === 'admin';
  const isProduction = currentUser.role === 'production';
  // مسؤول الشحن يعرض تفاصيل الأوردر فقط دون تعديل
  const isReadOnlyRole = isProduction || currentUser.role === 'shipping';

  // تهيئة النموذج عند فتحه فقط — تحديث قوائم البراندات/المنتجات أثناء الكتابة لا يمسحها
  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (orderToEdit) {
      setBrandId(orderToEdit.brandId);
      setCustomerName(orderToEdit.customerName);
      setCustomerPhone(orderToEdit.customerPhone);
      setCustomerPhone2(orderToEdit.customerPhone2 || '');
      setCity(orderToEdit.city);
      setCustomerAddress(orderToEdit.customerAddress);
      setStatus(orderToEdit.status);
      setNotes(orderToEdit.notes || '');
      setCustomerShipping(orderToEdit.customerShipping);
      setActualShippingCost(orderToEdit.actualShippingCost);
      setExtraExpenses(orderToEdit.extraExpenses || 0);
      setItems(
        orderToEdit.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          variantId: it.variantId,
          size: it.size,
          color: it.color,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          rawMaterialCost: it.rawMaterialCost,
          manufacturingCost: it.manufacturingCost,
        }))
      );
    } else {
      // استرجاع مسودة محفوظة من جلسة سابقة (تحديث الصفحة أو إغلاقها لا يفقدها)
      let draft: any = null;
      try {
        draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      } catch {
        draft = null;
      }
      if (draft && typeof draft === 'object') {
        const draftBrandOk = brands.some((b) => b.id === draft.brandId);
        setBrandId(draftBrandOk ? draft.brandId : brands[0]?.id || '');
        setCustomerName(String(draft.customerName || ''));
        setCustomerPhone(String(draft.customerPhone || ''));
        setCustomerPhone2(String(draft.customerPhone2 || ''));
        setCity(String(draft.city || 'القاهرة'));
        setCustomerAddress(String(draft.customerAddress || ''));
        setStatus(draft.status || 'manufacturing');
        setNotes(String(draft.notes || ''));
        setCustomerShipping(
          Number(draft.customerShipping ?? brands[0]?.defaultCustomerShipping ?? 65)
        );
        setActualShippingCost(
          Number(draft.actualShippingCost ?? brands[0]?.defaultActualShipping ?? 55)
        );
        setExtraExpenses(Number(draft.extraExpenses ?? 0));
        setItems(Array.isArray(draft.items) ? draft.items : []);
        return;
      }
      const defaultBrand = brands[0];
      setBrandId(defaultBrand?.id || '');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerPhone2('');
      setCity('القاهرة');
      setCustomerAddress('');
      setStatus('manufacturing');
      setNotes('');
      setCustomerShipping(defaultBrand ? defaultBrand.defaultCustomerShipping : 65);
      setActualShippingCost(defaultBrand ? defaultBrand.defaultActualShipping : 55);
      setExtraExpenses(0);

      const firstProd =
        catalogProducts.find((p) => p.brandId === defaultBrand?.id) || catalogProducts[0];
      if (firstProd) {
        setItems([
          {
            id: `item-${Date.now()}`,
            productId: firstProd.id,
            productName: firstProd.name,
            quantity: 1,
            unitPrice: firstProd.defaultSellingPrice,
            rawMaterialCost: firstProd.rawMaterialCost,
            manufacturingCost: firstProd.manufacturingCost,
          },
        ]);
      } else {
        setItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const relevantProducts = catalogProducts.filter((p) => p.brandId === brandId);
    const prod = relevantProducts[0] || catalogProducts[0];

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: prod?.id,
        productName: prod ? prod.name : 'منتج جديد',
        quantity: 1,
        unitPrice: prod ? prod.defaultSellingPrice : 500,
        rawMaterialCost: prod ? prod.rawMaterialCost : 150,
        manufacturingCost: prod ? prod.manufacturingCost : 100,
      },
    ]);
  };

  const handleSelectCatalogProduct = (index: number, prodId: string) => {
    const prod = catalogProducts.find((p) => p.id === prodId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        variantId: undefined,
        size: undefined,
        color: undefined,
        productName: prod.name,
        unitPrice: prod.defaultSellingPrice,
        rawMaterialCost: prod.rawMaterialCost,
        manufacturingCost: prod.manufacturingCost,
      };
      return copy;
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const formattedItems: OrderItem[] = items.map((it) => {
    const totalSellingPrice = (it.unitPrice || 0) * (it.quantity || 1);
    const totalItemCost =
      ((it.rawMaterialCost || 0) + (it.manufacturingCost || 0)) * (it.quantity || 1);
    return {
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      size: it.size,
      color: it.color,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      rawMaterialCost: it.rawMaterialCost,
      manufacturingCost: it.manufacturingCost,
      totalSellingPrice,
      totalItemCost,
      itemProfit: totalSellingPrice - totalItemCost,
    };
  });

  const {
    itemsSubtotal,
    totalAmount,
    totalRawCost,
    totalManufacturingCost,
    totalCost,
    netProfit,
    profitMargin,
  } = recalculateOrder(formattedItems, customerShipping, actualShippingCost, extraExpenses);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('يرجى كتابة اسم العميل');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('يرجى كتابة رقم هاتف العميل');
      return;
    }
    if (items.length === 0) {
      setFormError('يرجى إضافة صنف واحد على الأقل في الأوردر');
      return;
    }
    for (const it of items) {
      const prod = it.productId ? catalogProducts.find((p) => p.id === it.productId) : undefined;
      if (prod && prod.variants && prod.variants.length > 0 && !it.variantId) {
        setFormError(`اختر المقاس/اللون للمنتج "${prod.name}" قبل الحفظ`);
        return;
      }
    }

    const selectedBrand = brands.find((b) => b.id === brandId) || brands[0];

    const finalOrder: Order = {
      id: orderToEdit ? orderToEdit.id : `order-${Date.now()}`,
      orderNumber: orderToEdit ? orderToEdit.orderNumber : `ORD-${nextOrderNumber}`,
      brandId: selectedBrand.id,
      brandName: selectedBrand.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerPhone2: customerPhone2.trim() || undefined,
      customerAddress: customerAddress.trim() || 'بدون تفاصيل',
      city: city.trim() || 'القاهرة',
      items: formattedItems,
      itemsSubtotal,
      customerShipping: Number(customerShipping),
      totalAmount,
      actualShippingCost: Number(actualShippingCost),
      extraExpenses: Number(extraExpenses),
      totalRawCost,
      totalManufacturingCost,
      totalCost,
      netProfit,
      profitMargin,
      status,
      inventoryDeducted: orderToEdit?.inventoryDeducted ?? false,
      notes: notes.trim() || undefined,
      createdAt: orderToEdit ? orderToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: orderToEdit ? orderToEdit.createdBy : currentUser.name,
      updatedBy: orderToEdit ? currentUser.name : undefined,
    };

    clearDraft();
    onSaveOrder(finalOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div>
            <h2 className="text-base font-bold">
              {orderToEdit ? `تفاصيل وتعديل الأوردر (${orderToEdit.orderNumber})` : 'إنشاء أوردر جديد'}
            </h2>
            <p className="text-xs text-slate-300">
              {canViewFinancials
                ? 'تسجيل بيانات العميل، اختيار المنتجات وحساب تكلفة التصنيع والمكسب فورياً'
                : 'مراجعة بيانات العميل والمنتجات وتحديث حالة التجهيز'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {orderToEdit && onPrintOrder && (
              <button
                type="button"
                onClick={() => onPrintOrder(orderToEdit)}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة بوليصة</span>
              </button>
            )}
            {!orderToEdit && (
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  const defaultBrand = brands[0];
                  setBrandId(defaultBrand?.id || '');
                  setCustomerName('');
                  setCustomerPhone('');
                  setCustomerPhone2('');
                  setCity('القاهرة');
                  setCustomerAddress('');
                  setStatus('manufacturing');
                  setNotes('');
                  setCustomerShipping(defaultBrand ? defaultBrand.defaultCustomerShipping : 65);
                  setActualShippingCost(defaultBrand ? defaultBrand.defaultActualShipping : 55);
                  setExtraExpenses(0);
                  setItems([]);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                مسح الحقول
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Brand & Status Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                البراند التابع له الأوردر: *
              </label>
              <select
                disabled={isReadOnlyRole}
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  const b = brands.find((brand) => brand.id === e.target.value);
                  if (b && !orderToEdit) {
                    setCustomerShipping(b.defaultCustomerShipping);
                    setActualShippingCost(b.defaultActualShipping);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                حالة الأوردر الحالية: *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="manufacturing">قيد التصنيع والتجهيز (الورشة)</option>
                <option value="ready_to_ship">جاهز للشحن (في انتظار المندوب)</option>
                <option value="shipped">تم الشحن (يخصم الكمية من المخزن تلقائياً)</option>
                {!isReadOnlyRole && (
                  <>
                    <option value="delivered">تم التسليم والتحصيل</option>
                    <option value="returned">مرتجع (يعيد الكمية للمخزن تلقائياً)</option>
                    <option value="cancelled">ملغي</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Customer Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="font-bold text-slate-900">بيانات العميل والتوصيل:</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  اسم العميل: *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isReadOnlyRole}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: سارة أحمد"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium read-only:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  رقم الهاتف الأساسي: *
                </label>
                <input
                  type="tel"
                  required
                  readOnly={isReadOnlyRole}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono read-only:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  رقم هاتف إضافي (اختياري):
                </label>
                <input
                  type="tel"
                  readOnly={isReadOnlyRole}
                  value={customerPhone2}
                  onChange={(e) => setCustomerPhone2(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono read-only:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  المحافظة / المدينة: *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isReadOnlyRole}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="القاهرة، الإسكندرية..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 read-only:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  العنوان بالتفصيل: *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isReadOnlyRole}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="الشارع، رقم العمارة، رقم الشقة، علامة مميزة..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 read-only:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Products in this Order */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                المنتجات في الأوردر ({items.length} منتج):
              </h3>
              {!isReadOnlyRole && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة منتج آخر</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">
                      الصنف #{idx + 1}
                    </span>
                    {!isReadOnlyRole && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">
                        اختر من الكتالوج:
                      </label>
                      <select
                        disabled={isReadOnlyRole}
                        value={it.productId || ''}
                        onChange={(e) => handleSelectCatalogProduct(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium disabled:bg-slate-100"
                      >
                        <option value="">-- منتج مخصص غير مسجل --</option>
                        {catalogProducts
                          .filter((p) => p.brandId === brandId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.defaultSellingPrice} ج.م)
                            </option>
                          ))}
                      </select>
                    </div>

                    {(() => {
                      const selProd = it.productId
                        ? catalogProducts.find((p) => p.id === it.productId)
                        : undefined;
                      if (!selProd || !selProd.variants || selProd.variants.length === 0) return null;
                      return (
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            المقاس / اللون:
                          </label>
                          <select
                            disabled={isReadOnlyRole}
                            value={it.variantId || ''}
                            onChange={(e) => {
                              const v = selProd.variants!.find((x) => x.id === e.target.value);
                              setItems((prev) => {
                                const copy = [...prev];
                                copy[idx] = {
                                  ...copy[idx],
                                  variantId: v?.id,
                                  size: v?.size,
                                  color: v?.color,
                                };
                                return copy;
                              });
                            }}
                            className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-slate-900 font-medium disabled:bg-slate-100 ${
                              !it.variantId ? 'border-amber-400' : 'border-slate-200'
                            }`}
                          >
                            <option value="">-- اختر المقاس واللون --</option>
                            {selProd.variants.map((v) => (
                              <option key={v.id} value={v.id} disabled={v.stockQuantity <= 0}>
                                {v.size} / {v.color} (متوفر: {v.stockQuantity})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">
                        اسم المنتج المطبوع على البوليصة:
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={isReadOnlyRole}
                        value={it.productName}
                        onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold read-only:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div
                    className={`grid gap-2 pt-1 ${
                      canViewFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
                    }`}
                  >
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">الكمية:</label>
                      <input
                        type="number"
                        min={1}
                        required
                        readOnly={isReadOnlyRole}
                        value={it.quantity}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold read-only:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">
                        سعر بيع القطعة:
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        readOnly={isReadOnlyRole}
                        value={it.unitPrice}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold read-only:bg-slate-100"
                      />
                    </div>

                    {/* Strict RBAC: Cost fields visible ONLY to Admin */}
                    {canViewFinancials && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            تكلفة الخام للقطعة:
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={it.rawMaterialCost}
                            onChange={(e) =>
                              handleUpdateItem(
                                idx,
                                'rawMaterialCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono text-amber-700 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            تكلفة التصنيع الثابتة:
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={it.manufacturingCost}
                            onChange={(e) =>
                              handleUpdateItem(
                                idx,
                                'manufacturingCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono text-sky-700 font-bold"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between font-mono">
                    <span>
                      إجمالي بيع الصنف: <b>{(it.unitPrice * it.quantity).toFixed(0)} ج.م</b>
                    </span>
                    {canViewFinancials && (
                      <>
                        <span>
                          إجمالي التكلفة:{' '}
                          <b>
                            {((it.rawMaterialCost + it.manufacturingCost) * it.quantity).toFixed(0)}{' '}
                            ج.م
                          </b>
                        </span>
                        <span className="text-emerald-600 font-bold">
                          مكسب الصنف:{' '}
                          {(
                            (it.unitPrice - (it.rawMaterialCost + it.manufacturingCost)) *
                            it.quantity
                          ).toFixed(0)}{' '}
                          ج.م
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Extra Costs */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900">مصاريف الشحن والملاحظات:</h3>
            <div
              className={`grid gap-3 ${
                canViewFinancials ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'
              }`}
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  شحن العميل (المحصل):
                </label>
                <input
                  type="number"
                  min={0}
                  readOnly={isReadOnlyRole}
                  value={customerShipping}
                  onChange={(e) => setCustomerShipping(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 read-only:bg-slate-100"
                />
              </div>

              {canViewFinancials && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      تكلفة الشحن الفعلية (للمندوب):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={actualShippingCost}
                      onChange={(e) => setActualShippingCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      مصاريف تغليف أو هدايا:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={extraExpenses}
                      onChange={(e) => setExtraExpenses(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                ملاحظات أو تفاصيل خاصة:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تعليمات الاستلام، مواعيد الاتصال، مقاسات أو ألوان..."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* Summary Card */}
          {canViewFinancials ? (
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Calculator className="w-4 h-4" />
                  <span>حسابات الأوردر وصافي المكسب:</span>
                </span>
                <span className="font-mono text-emerald-400 text-sm">
                  صافي المكسب: {netProfit.toFixed(0)} ج.م ({profitMargin}% هامش)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1 text-slate-300">
                <div>
                  مبالغ المنتجات: <b className="text-white">{itemsSubtotal}</b> ج.م
                </div>
                <div>
                  إجمالي المطلوب: <b className="text-white">{totalAmount}</b> ج.م
                </div>
                <div>
                  تكلفة الخامات: <b className="text-amber-300">{totalRawCost}</b> ج.م
                </div>
                <div>
                  تكلفة التصنيع: <b className="text-sky-300">{totalManufacturingCost}</b> ج.م
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-mono">
              <div>
                مبالغ المنتجات: <b>{itemsSubtotal} ج.م</b> · الشحن: <b>{customerShipping} ج.م</b>
              </div>
              <div className="text-sm font-bold text-amber-300">
                الإجمالي المطلوب تحصيله: {totalAmount} ج.م
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                إلغاء
              </button>
              {orderToEdit && onPrintOrder && (
                <button
                  type="button"
                  onClick={() => onPrintOrder(orderToEdit)}
                  className="px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة بوليصة</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isReadOnlyRole}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{orderToEdit ? 'تحديث وحفظ الأوردر' : 'تسجيل الأوردر في النظام'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
