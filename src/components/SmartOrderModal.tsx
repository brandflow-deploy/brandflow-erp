import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  DollarSign, 
  Package, 
  Truck,
  RotateCw,
  Check
} from 'lucide-react';
import { Brand, Product, Order, OrderItem, ParsedOrderCandidate, OrderStatus, User } from '../types';
import { parseSingleOrderText, splitBulkOrdersText, normalizeArabic } from '../utils/parser';
import { recalculateOrder } from '../utils/calculations';

interface SmartOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  catalogProducts: Product[];
  currentUser: User;
  onSaveOrders: (newOrders: Order[]) => void;
  nextOrderNumber: number;
}

export const SmartOrderModal: React.FC<SmartOrderModalProps> = ({
  isOpen,
  onClose,
  brands,
  catalogProducts,
  currentUser,
  onSaveOrders,
  nextOrderNumber,
}) => {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedOrderCandidate[]>([]);
  const [activeStep, setActiveStep] = useState<'input' | 'review'>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // الاستيراد الذكي اختياري لكل براند (مغلق افتراضياً) - يُفعَّل من إدارة البراندات
  const enabledBrands = brands.filter((b) => b.aiImportEnabled);

  if (enabledBrands.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>الاستيراد الذكي للرسائل</span>
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold leading-relaxed">
            الاستيراد الذكي مغلق حالياً لكل البراندات. يمكن للمدير العام تفعيله لأي براند من
            شاشة "إدارة البراندات"، وإيقافه في أي وقت.
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const canViewFinancials = currentUser.role === 'admin';

  // Lookup product in catalog
  const findProductInCatalog = (nameOrId: string, targetBrandId?: string): Product | null => {
    if (!nameOrId || !nameOrId.trim()) return null;
    const clean = normalizeArabic(nameOrId.trim());

    // By ID
    const byId = catalogProducts.find((p) => p.id === nameOrId);
    if (byId) return byId;

    // Filter by brand if available
    const brandProds = targetBrandId
      ? catalogProducts.filter((p) => p.brandId === targetBrandId)
      : catalogProducts;

    // Exact name match
    let found = brandProds.find((p) => normalizeArabic(p.name) === clean);
    if (found) return found;

    found = catalogProducts.find((p) => normalizeArabic(p.name) === clean);
    if (found) return found;

    // Substring / keyword match
    found = brandProds.find((p) => {
      const pNorm = normalizeArabic(p.name);
      return clean.includes(pNorm) || pNorm.includes(clean);
    });
    if (found) return found;

    found = catalogProducts.find((p) => {
      const pNorm = normalizeArabic(p.name);
      return clean.includes(pNorm) || pNorm.includes(clean);
    });
    return found || null;
  };

  // Sample templates for testing
  const loadSampleSingle = () => {
    setRawText(`الاسم: نرمين عبد الحميد
العنوان: مدينة نصر، شارع عباس العقاد عمارة 22 الدور الرابع
الموبايل: 01023456789
المحافظة: القاهرة
البراند: لورا ديزاين
المنتج: فستان حرير مطرز يدوي (قطعة واحدة)
مبلغ الاوردر: 750
الشحن: 65
الحالة: بيتصنع
ملاحظات: برجاء التأكيد قبل خروج المندوب`);
  };

  const loadSampleMultiple = () => {
    setRawText(`طلب جديد 1:
الاسم: سمر وجدي
العنوان: مصر الجديدة، ميدان الكوربة
رقم التليفون: 01145678901
البراند: أروما كير
المنتجات: سيروم الهيالورونيك وفيتامين سي 50ml (عدد 2) + عطر مسك الفانيليا
مبلغ الاوردر: 950
الشحن: 60
الحالة: جاهز للشحن

---
طلب جديد 2:
الاسم: دينا عادل
العنوان: سموحة، شارع النصر، عمارة الأطباء
الموبايل: 01278901234
المحافظة: الإسكندرية
البراند: إيليجانت وومان
المنتج: عباية ملكي كريب تطريز كمبيوتر
سعر الاوردر: 950
الشحن: 70
الحالة: قيد التصنيع`);
  };

  // Run parser (Server Gemini or Local NLP)
  const handleParse = async () => {
    if (!rawText.trim()) {
      setErrorMessage('يرجى لصق نص الأوردر أولاً');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // First try backend API with Gemini AI
      const response = await fetch('/api/parse-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          availableBrands: enabledBrands,
          catalogProducts: catalogProducts,
        }),
      });

      const data = await response.json();

      let candidates: ParsedOrderCandidate[] = [];

      if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
        // Map backend response into candidate format
        candidates = data.orders.map((ord: any) => ({
          customerName: ord.customerName || 'عميل بدون اسم',
          customerPhone: ord.customerPhone || '',
          customerAddress: ord.customerAddress || '',
          city: ord.city || 'القاهرة',
          brandId: ord.brandId || enabledBrands[0]?.id,
          brandName: ord.brandName || enabledBrands[0]?.name,
          items: (ord.items || []).map((it: any) => {
            const matched = findProductInCatalog(it.productName, ord.brandId);
            return {
              productName: matched ? matched.name : it.productName,
              quantity: it.quantity || 1,
              unitPrice: it.unitPrice || matched?.defaultSellingPrice || 500,
              rawMaterialCost: matched ? matched.rawMaterialCost : (it.rawMaterialCost ?? 150),
              manufacturingCost: matched ? matched.manufacturingCost : (it.manufacturingCost ?? 100),
            };
          }),
          customerShipping: ord.customerShipping || 60,
          actualShippingCost: ord.actualShippingCost || 50,
          status: (ord.status as OrderStatus) || 'manufacturing',
          notes: ord.notes || '',
          confidence: 0.95,
          rawInput: rawText,
        }));
      } else {
        // Fallback: Advanced Local Arabic Parser
        const snippets = splitBulkOrdersText(rawText);
        candidates = snippets.map((snippet) =>
          parseSingleOrderText(snippet, enabledBrands, catalogProducts)
        );
      }

      // Final pass: ensure every item is bound to catalog product manufacturing cost
      candidates.forEach((cand) => {
        cand.items.forEach((item) => {
          const matched = findProductInCatalog(item.productName, cand.brandId);
          if (matched) {
            item.manufacturingCost = matched.manufacturingCost;
            item.rawMaterialCost = matched.rawMaterialCost;
            if (!item.unitPrice || item.unitPrice === 0) {
              item.unitPrice = matched.defaultSellingPrice;
            }
          }
        });
      });

      setParsedCandidates(candidates);
      setActiveStep('review');
    } catch (err: any) {
      console.warn('Backend parser failed, running local parser fallback:', err);
      const snippets = splitBulkOrdersText(rawText);
      const candidates = snippets.map((snippet) =>
        parseSingleOrderText(snippet, enabledBrands, catalogProducts)
      );
      setParsedCandidates(candidates);
      setActiveStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  // Candidate field updater
  const updateCandidateField = (index: number, field: string, value: any) => {
    setParsedCandidates((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Change product in candidate and auto-fetch manufacturing cost
  const updateCandidateProductName = (candIdx: number, itemIdx: number, newName: string) => {
    const cand = parsedCandidates[candIdx];
    const matched = findProductInCatalog(newName, cand?.brandId);

    setParsedCandidates((prev) => {
      const copy = [...prev];
      const itemsCopy = [...copy[candIdx].items];

      if (matched) {
        itemsCopy[itemIdx] = {
          ...itemsCopy[itemIdx],
          productName: newName,
          // Automatically fetch fixed manufacturing & raw costs!
          manufacturingCost: matched.manufacturingCost,
          rawMaterialCost: matched.rawMaterialCost,
          unitPrice: itemsCopy[itemIdx].unitPrice || matched.defaultSellingPrice,
        };
      } else {
        itemsCopy[itemIdx] = {
          ...itemsCopy[itemIdx],
          productName: newName,
        };
      }

      copy[candIdx] = { ...copy[candIdx], items: itemsCopy };
      return copy;
    });
  };

  const selectCatalogProductForCandidate = (candIdx: number, itemIdx: number, prodId: string) => {
    const prod = catalogProducts.find((p) => p.id === prodId);
    if (!prod) return;

    setParsedCandidates((prev) => {
      const copy = [...prev];
      const itemsCopy = [...copy[candIdx].items];
      itemsCopy[itemIdx] = {
        ...itemsCopy[itemIdx],
        productName: prod.name,
        manufacturingCost: prod.manufacturingCost,
        rawMaterialCost: prod.rawMaterialCost,
        unitPrice: prod.defaultSellingPrice,
      };
      copy[candIdx] = { ...copy[candIdx], items: itemsCopy };
      return copy;
    });
  };

  const updateCandidateItem = (candIdx: number, itemIdx: number, field: string, value: any) => {
    setParsedCandidates((prev) => {
      const copy = [...prev];
      const itemsCopy = [...copy[candIdx].items];
      itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], [field]: value };
      copy[candIdx] = { ...copy[candIdx], items: itemsCopy };
      return copy;
    });
  };

  // Refresh candidate items costs from catalog
  const refreshCandidateCostsFromCatalog = (candIdx: number) => {
    const cand = parsedCandidates[candIdx];
    if (!cand) return;
    setParsedCandidates((prev) => {
      const copy = [...prev];
      const itemsCopy = copy[candIdx].items.map((it) => {
        const matched = findProductInCatalog(it.productName, cand.brandId);
        if (matched) {
          return {
            ...it,
            productName: matched.name,
            manufacturingCost: matched.manufacturingCost,
            rawMaterialCost: matched.rawMaterialCost,
            unitPrice: it.unitPrice || matched.defaultSellingPrice,
          };
        }
        return it;
      });
      copy[candIdx] = { ...copy[candIdx], items: itemsCopy };
      return copy;
    });
  };

  // Add Item to Candidate
  const handleAddItemToCandidate = (candIdx: number) => {
    const cand = parsedCandidates[candIdx];
    const relevantProducts = catalogProducts.filter((p) => p.brandId === cand.brandId);
    const prod = relevantProducts[0] || catalogProducts[0];

    setParsedCandidates((prev) => {
      const copy = [...prev];
      const itemsCopy = [
        ...copy[candIdx].items,
        {
          productName: prod ? prod.name : 'منتج جديد',
          quantity: 1,
          unitPrice: prod ? prod.defaultSellingPrice : 500,
          rawMaterialCost: prod ? prod.rawMaterialCost : 150,
          manufacturingCost: prod ? prod.manufacturingCost : 100,
        },
      ];
      copy[candIdx] = { ...copy[candIdx], items: itemsCopy };
      return copy;
    });
  };

  // Remove Item from Candidate
  const handleRemoveItemFromCandidate = (candIdx: number, itemIdx: number) => {
    setParsedCandidates((prev) => {
      const copy = [...prev];
      const itemsCopy = copy[candIdx].items.filter((_, i) => i !== itemIdx);
      copy[candIdx] = { ...copy[candIdx], items: itemsCopy };
      return copy;
    });
  };

  // Remove candidate
  const removeCandidate = (idx: number) => {
    setParsedCandidates((prev) => prev.filter((_, i) => i !== idx));
  };

  // Convert candidates into real Orders and commit
  const handleConfirmAndSave = () => {
    let currentNumber = nextOrderNumber;
    const finalOrders: Order[] = [];

    parsedCandidates.forEach((cand, idx) => {
      const brand = enabledBrands.find((b) => b.id === cand.brandId) || enabledBrands[0];
      const customerShipping = Number(cand.customerShipping || brand.defaultCustomerShipping);
      const actualShipping = Number(cand.actualShippingCost || brand.defaultActualShipping);

      // Build OrderItems with fixed snapshot costs
      const orderItems: OrderItem[] = cand.items.map((it, itIdx) => {
        const matchedProduct = findProductInCatalog(it.productName, cand.brandId);
        const rawCost = matchedProduct ? matchedProduct.rawMaterialCost : (it.rawMaterialCost ?? 120);
        const mfgCost = matchedProduct ? matchedProduct.manufacturingCost : (it.manufacturingCost ?? 80);
        const qty = Number(it.quantity || 1);
        const unitP = Number(it.unitPrice || 400);

        const totalSellingPrice = unitP * qty;
        const totalItemCost = (rawCost + mfgCost) * qty;

        return {
          id: `item-${Date.now()}-${idx}-${itIdx}`,
          productId: matchedProduct?.id,
          productName: it.productName,
          quantity: qty,
          unitPrice: unitP,
          rawMaterialCost: rawCost,
          manufacturingCost: mfgCost,
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
      } = recalculateOrder(orderItems, customerShipping, actualShipping, 0);

      const orderNumber = `ORD-${currentNumber}`;
      currentNumber += 1;

      finalOrders.push({
        id: `order-${Date.now()}-${idx}`,
        orderNumber,
        brandId: brand.id,
        brandName: brand.name,
        customerName: cand.customerName.trim() || 'عميل غير مسجل',
        customerPhone: cand.customerPhone.trim() || '',
        customerPhone2: undefined,
        customerAddress: cand.customerAddress.trim() || '',
        city: cand.city.trim() || 'القاهرة',
        items: orderItems,
        itemsSubtotal,
        customerShipping,
        totalAmount,
        actualShippingCost: actualShipping,
        extraExpenses: 0,
        totalRawCost,
        totalManufacturingCost,
        totalCost,
        netProfit,
        profitMargin,
        status: cand.status || 'manufacturing',
        notes: cand.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: `${currentUser.name} (استيراد ذكي)`,
      });
    });

    onSaveOrders(finalOrders);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                الاستيراد الذكي للطلبات من الرسائل
              </h2>
              <p className="text-xs text-slate-300">
                الصقي نص الرسالة دفعة واحدة وسيقوم النظام بفرز البيانات وجلب تكلفة التصنيع الثابتة تلقائياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {activeStep === 'input' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  الصقي رسائل الأوردرات هنا (من واتساب، إنستجرام، فيسبوك، إلخ):
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">نماذج تجريبية:</span>
                  <button
                    onClick={loadSampleSingle}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    أوردر فردي
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={loadSampleMultiple}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    مجموعة أوردرات
                  </button>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="مثال:
الاسم: سارة أحمد
العنوان: مدينة نصر ش مكرم عبيد عمارة 14
الموبايل: 01012345678
البراند: لورا ديزاين
المنتج: فستان حرير مطرز يدوي
مبلغ الاوردر: 750
الشحن: 65
الحالة: بيتصنع..."
                rows={12}
                className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all leading-relaxed"
              />

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-500">
                  ⚡ يتعرف النظام على المنتجات المسجلة في الكتالوج ويجلب تكلفة تصنيعها الثابتة تلقائياً.
                </div>
                <button
                  onClick={handleParse}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2 shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>جاري الفرز والتحليل...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>تحليل واستخراج الأوردرات</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Review Step */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl">
                <div>
                  <h3 className="text-xs font-bold text-indigo-950">
                    تم استخراج ({parsedCandidates.length}) أوردر بنجاح!
                  </h3>
                  <p className="text-[11px] text-indigo-700">
                    تم ربط المنتجات بالكتالوج وجلب تكاليف التصنيع الثابتة تلقائياً. راجعي البيانات واضغطي اعتماد.
                  </p>
                </div>
                <button
                  onClick={() => setActiveStep('input')}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>تعديل النص الأصلي</span>
                </button>
              </div>

              {/* Datalist for candidate products autocomplete */}
              <datalist id="smart-products-list">
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.name}>
                    {canViewFinancials
                      ? `${p.name} (تصنيع: ${p.manufacturingCost} ج.م | بيع: ${p.defaultSellingPrice} ج.م)`
                      : `${p.name} (بيع: ${p.defaultSellingPrice} ج.م)`}
                  </option>
                ))}
              </datalist>

              {/* Cards of Extracted Candidates */}
              <div className="space-y-4">
                {parsedCandidates.map((cand, idx) => {
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-mono font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            أوردر رقم مقترح: ORD-{nextOrderNumber + idx}
                          </span>
                        </div>
                        <button
                          onClick={() => removeCandidate(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="حذف هذا الأوردر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Customer Info Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            اسم العميل:
                          </label>
                          <input
                            type="text"
                            value={cand.customerName}
                            onChange={(e) => updateCandidateField(idx, 'customerName', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            رقم الهاتف:
                          </label>
                          <input
                            type="text"
                            value={cand.customerPhone}
                            onChange={(e) => updateCandidateField(idx, 'customerPhone', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            المدينة / المحافظة:
                          </label>
                          <input
                            type="text"
                            value={cand.city}
                            onChange={(e) => updateCandidateField(idx, 'city', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            البراند التابع له:
                          </label>
                          <select
                            value={cand.brandId || enabledBrands[0]?.id}
                            onChange={(e) => {
                              const sel = enabledBrands.find((b) => b.id === e.target.value);
                              updateCandidateField(idx, 'brandId', e.target.value);
                              updateCandidateField(idx, 'brandName', sel?.name);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                          >
                            {enabledBrands.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          العنوان بالتفصيل:
                        </label>
                        <input
                          type="text"
                          value={cand.customerAddress}
                          onChange={(e) => updateCandidateField(idx, 'customerAddress', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                        />
                      </div>

                      {/* Products List & Costs */}
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between flex-wrap gap-2">
                          <span>المنتجات وتكاليف التصنيع المجلوبة تلقائياً:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => refreshCandidateCostsFromCatalog(idx)}
                              className="text-sky-700 hover:text-sky-900 text-[10px] font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 transition-colors"
                              title="إعادة جلب تكاليف التصنيع المسجلة في الكتالوج"
                            >
                              🔄 تحديث التكاليف من الكتالوج
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddItemToCandidate(idx)}
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>إضافة صنف آخر</span>
                            </button>
                          </div>
                        </div>

                        {cand.items.map((it, itemIdx) => {
                          const matchedProduct = findProductInCatalog(it.productName, cand.brandId);
                          const itemTotal = (it.unitPrice || 0) * (it.quantity || 1);
                          const itemCost =
                            ((it.rawMaterialCost || 0) + (it.manufacturingCost || 0)) * (it.quantity || 1);
                          const itemProfit = itemTotal - itemCost;

                          return (
                            <div
                              key={itemIdx}
                              className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2 text-xs"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">
                                    اختر الصنف من الكتالوج:
                                  </label>
                                    <select
                                      value={matchedProduct?.id || ''}
                                      onChange={(e) =>
                                        selectCatalogProductForCandidate(idx, itemIdx, e.target.value)
                                      }
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900"
                                    >
                                      <option value="">-- اختر من الكتالوج --</option>
                                      {catalogProducts.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {canViewFinancials
                                            ? `${p.name} (تصنيع: ${p.manufacturingCost} ج.م)`
                                            : `${p.name} (${p.defaultSellingPrice} ج.م)`}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5">
                                      أو اكتب اسم المنتج (يتم البحث فورياً):
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        list="smart-products-list"
                                        value={it.productName}
                                        onChange={(e) =>
                                          updateCandidateProductName(idx, itemIdx, e.target.value)
                                        }
                                        placeholder="اسم المنتج"
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`grid gap-2 items-center pt-1 ${
                                    canViewFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
                                  }`}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500">الكمية:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={it.quantity}
                                      onChange={(e) =>
                                        updateCandidateItem(
                                          idx,
                                          itemIdx,
                                          'quantity',
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                      className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-center font-bold"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500">سعر البيع:</span>
                                    <input
                                      type="number"
                                      value={it.unitPrice}
                                      onChange={(e) =>
                                        updateCandidateItem(
                                          idx,
                                          itemIdx,
                                          'unitPrice',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-20 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-center font-bold"
                                    />
                                  </div>

                                  {canViewFinancials && (
                                    <>
                                      <div className="bg-sky-50 border border-sky-300 rounded px-2 py-1 text-center font-mono">
                                        <span className="text-[9px] text-sky-800 font-bold block">تكلفة التصنيع الثابتة ⚡:</span>
                                        <span className="font-bold text-sky-950 text-xs">{it.manufacturingCost} ج.م</span>
                                      </div>

                                      <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center font-mono">
                                        <span className="text-[9px] text-amber-800 block">سعر الخام:</span>
                                        <span className="font-bold text-amber-900">{it.rawMaterialCost} ج.م</span>
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono border-t border-slate-100">
                                  <span>
                                    إجمالي البيع: <b>{itemTotal} ج.م</b>
                                  </span>
                                  {canViewFinancials && (
                                    <span className="text-emerald-600 font-bold">
                                      المكسب المحسوب: +{itemProfit} ج.م
                                    </span>
                                  )}
                                  {cand.items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItemFromCandidate(idx, itemIdx)}
                                      className="text-rose-600 hover:text-rose-800 text-[10px]"
                                    >
                                      حذف الصنف
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Financials & Status Row */}
                        <div
                          className={`grid gap-3 text-xs pt-1 ${
                            canViewFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'
                          }`}
                        >
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              سعر شحن العميل:
                            </label>
                            <input
                              type="number"
                              value={cand.customerShipping || 60}
                              onChange={(e) =>
                                updateCandidateField(idx, 'customerShipping', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                            />
                          </div>

                          {canViewFinancials && (
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                تكلفة شحن المندوب:
                              </label>
                              <input
                                type="number"
                                value={cand.actualShippingCost || 50}
                                onChange={(e) =>
                                  updateCandidateField(idx, 'actualShippingCost', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                              />
                            </div>
                          )}

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            حالة الأوردر:
                          </label>
                          <select
                            value={cand.status || 'manufacturing'}
                            onChange={(e) => updateCandidateField(idx, 'status', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                          >
                            <option value="manufacturing">قيد التصنيع والتجهيز</option>
                            <option value="ready_to_ship">جاهز للشحن</option>
                            <option value="shipped">تم الشحن مع المندوب</option>
                            <option value="delivered">تم التسليم</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            ملاحظات:
                          </label>
                          <input
                            type="text"
                            value={cand.notes || ''}
                            onChange={(e) => updateCandidateField(idx, 'notes', e.target.value)}
                            placeholder="أي تفاصيل خاصة"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setActiveStep('input')}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  إلغاء والعودة
                </button>
                <button
                  onClick={handleConfirmAndSave}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>اعتماد وحفظ ({parsedCandidates.length}) أوردر في النظام</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
