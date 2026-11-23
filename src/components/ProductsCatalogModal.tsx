import React, { useState } from 'react';
import { 
  X, 
  FolderKanban, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Scissors, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { Product, ProductVariant, Brand, User, CurrencyConfig } from '../types';
import { newVariantId, COMMON_SIZES, COMMON_COLORS, getProductStock } from '../utils/variants';
import { exportProductsToExcel } from '../utils/excel';
import { formatCurrency } from '../utils/calculations';

interface ProductsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  brands: Brand[];
  currentUser: User;
  currency: CurrencyConfig;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateStock: (productId: string, newStock: number, variantId?: string) => void;
}

export const ProductsCatalogModal: React.FC<ProductsCatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  brands,
  currentUser,
  currency,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateStock,
}) => {
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [rawMaterialCost, setRawMaterialCost] = useState<number>(150);
  const [manufacturingCost, setManufacturingCost] = useState<number>(90);
  const [defaultSellingPrice, setDefaultSellingPrice] = useState<number>(450);
  const [commissionPct, setCommissionPct] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<number>(20);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [useVariants, setUseVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { id: newVariantId(), size: '', color: '', stockQuantity: 0 },
    ]);
  };
  const updateVariantRow = (id: string, field: keyof ProductVariant, value: any) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };
  const removeVariantRow = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';
  const isSubscriber = currentUser.role === 'subscriber';
  const canSeeCosts = isAdmin || isSubscriber;
  const canSeeCommission = isAdmin || isSubscriber || currentUser.role === 'affiliate';
  const canManageCatalog = isAdmin || currentUser.role === 'production';

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (selectedBrand !== 'all' && p.brandId !== selectedBrand) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    }
    return true;
  });

  const handleStartEdit = (prod: Product) => {
    setEditingProductId(prod.id);
    setName(prod.name);
    setBrandId(prod.brandId);
    setSku(prod.sku || '');
    setCategory(prod.category || '');
    setRawMaterialCost(prod.rawMaterialCost);
    setManufacturingCost(prod.manufacturingCost);
    setDefaultSellingPrice(prod.defaultSellingPrice);
    setCommissionPct(prod.commissionPct != null ? String(prod.commissionPct) : '');
    setStockQuantity(prod.stockQuantity);
    setLowStockThreshold(prod.lowStockThreshold);
    setVariants(prod.variants || []);
    setUseVariants(Boolean(prod.variants && prod.variants.length > 0));
    setIsAdding(true);
  };

  const handleResetForm = () => {
    setIsAdding(false);
    setEditingProductId(null);
    setName('');
    setSku('');
    setCategory('');
    setRawMaterialCost(150);
    setManufacturingCost(90);
    setDefaultSellingPrice(450);
    setCommissionPct('');
    setStockQuantity(20);
    setVariants([]);
    setUseVariants(false);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalVariants = useVariants
      ? variants
          .filter((v) => v.size.trim() || v.color.trim())
          .map((v) => ({
            ...v,
            size: v.size.trim() || 'موحد',
            color: v.color.trim() || 'أساسي',
            stockQuantity: Math.max(0, Number(v.stockQuantity) || 0),
          }))
      : [];
    const finalStock = useVariants
      ? finalVariants.reduce((sum, v) => sum + v.stockQuantity, 0)
      : Number(stockQuantity);

    if (editingProductId) {
      // Update
      const existing = products.find((p) => p.id === editingProductId);
      if (existing) {
        onUpdateProduct({
          ...existing,
          name: name.trim(),
          brandId,
          sku: sku.trim() || undefined,
          category: category.trim() || undefined,
          rawMaterialCost: Number(rawMaterialCost),
          manufacturingCost: Number(manufacturingCost),
          defaultSellingPrice: Number(defaultSellingPrice),
          commissionPct: commissionPct.trim() === '' ? null : Number(commissionPct),
          stockQuantity: finalStock,
          lowStockThreshold: Number(lowStockThreshold),
          variants: finalVariants,
        });
      }
    } else {
      // Create
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        brandId,
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        rawMaterialCost: Number(rawMaterialCost),
        manufacturingCost: Number(manufacturingCost),
        defaultSellingPrice: Number(defaultSellingPrice),
        commissionPct: commissionPct.trim() === '' ? null : Number(commissionPct),
        stockQuantity: finalStock,
        lowStockThreshold: Number(lowStockThreshold),
        variants: finalVariants,
        createdAt: new Date().toISOString(),
      };
      onAddProduct(newProd);
    }

    handleResetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                كتالوج المنتجات وتكاليف التصنيع الثابتة والمخزون
              </h2>
              <p className="text-xs text-slate-300">
                تسجيل أسعار التصنيع والخامات لكل صنف، لتعبئتها وحساب المكاسب آلياً بدون تكرار إدخالها
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث باسم المنتج أو كود SKU..."
                  className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                aria-label="تصفية حسب البراند"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="all">كل البراندات</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportProductsToExcel(filteredProducts, brands, isAdmin)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير الكتالوج Excel</span>
              </button>

              {isAdmin && !isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة منتج ثابت</span>
                </button>
              )}
            </div>

          </div>

          {/* Add / Edit Form */}
          {isAdding && canManageCatalog && (
            <form
              onSubmit={handleSaveProduct}
              className="p-4 bg-slate-50 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-xs">
                  {editingProductId ? 'تعديل بيانات المنتج وتكلفة التصنيع:' : 'إضافة منتج جديد للكتالوج:'}
                </h3>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    اسم المنتج: *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: فستان حرير مطرز يدوي"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    البراند التابع له: *
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1" title="سعر القماش والمواد الخام قبل التصنيع">
                    سعر الخام قبل التصنيع (ج.م): *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={rawMaterialCost}
                    onChange={(e) => setRawMaterialCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-amber-700 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1" title="تكلفة القص والخياطة والتطريز والتقفيل الثابتة">
                    تكلفة التصنيع الثابتة (ج.م): *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={manufacturingCost}
                    onChange={(e) => setManufacturingCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-sky-700 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    سعر البيع المقترح (ج.م): *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={defaultSellingPrice}
                    onChange={(e) => setDefaultSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label
                    className="text-[10px] font-bold text-slate-700 block mb-1"
                    title="النسبة اللي ياخدها المسوّق من بيع هذا الصنف — اتركيها فاضية لو مفيش عمولة"
                  >
                    عمولة المسوّق (%) — اختياري:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    placeholder="مثال: 10"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    الكمية في المخزن: *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required={!useVariants}
                    disabled={useVariants}
                    value={useVariants ? variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0) : stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-center font-bold disabled:bg-slate-100 disabled:text-slate-500"
                    title={useVariants ? 'يُحسب تلقائياً من مجموع مخزون المتغيرات' : ''}
                  />
                </div>
              </div>

              {/* محرر المقاسات والألوان */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-700">
                      مقاسات وألوان (متغيرات) لهذا المنتج
                    </div>
                    <p className="text-[10px] text-slate-400">
                      فعّلها للملابس: مخزون مستقل لكل مقاس/لون، ويظهر اختيارها إجبارياً في الأوردر
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseVariants((v) => !v)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                      useVariants
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {useVariants ? 'مفعّلة' : 'بدون'}
                  </button>
                </div>

                {useVariants && (
                  <div className="space-y-1.5">
                    <datalist id="common-sizes">
                      {COMMON_SIZES.map((sz) => (
                        <option key={sz} value={sz} />
                      ))}
                    </datalist>
                    <datalist id="common-colors">
                      {COMMON_COLORS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <div className="grid grid-cols-[1fr_1fr_80px_32px] gap-1.5 text-[10px] font-bold text-slate-500 px-1">
                      <span>المقاس</span>
                      <span>اللون</span>
                      <span className="text-center">المخزون</span>
                      <span></span>
                    </div>
                    {variants.map((v) => (
                      <div key={v.id} className="grid grid-cols-[1fr_1fr_80px_32px] gap-1.5">
                        <input
                          list="common-sizes"
                          value={v.size}
                          onChange={(e) => updateVariantRow(v.id, 'size', e.target.value)}
                          placeholder="M"
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <input
                          list="common-colors"
                          value={v.color}
                          onChange={(e) => updateVariantRow(v.id, 'color', e.target.value)}
                          placeholder="أسود"
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          min={0}
                          value={v.stockQuantity}
                          onChange={(e) =>
                            updateVariantRow(v.id, 'stockQuantity', parseInt(e.target.value) || 0)
                          }
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariantRow(v.id)}
                          className="text-rose-500 hover:text-rose-700 flex items-center justify-center"
                          title="حذف المتغير"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة مقاس/لون</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] font-mono text-slate-500">
                  إجمالي التكلفة: <b>{rawMaterialCost + manufacturingCost} ج.م</b> · الربح المتوقع للقطعة: <b className="text-emerald-600">{defaultSellingPrice - (rawMaterialCost + manufacturingCost)} ج.م</b>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  {editingProductId ? 'تحديث المنتج' : 'حفظ المنتج في الكتالوج'}
                </button>
              </div>
            </form>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">المنتج والبراند</th>
                  {canSeeCosts && (
                    <>
                      <th className="px-3 py-3">سعر الخام</th>
                      <th className="px-3 py-3">تكلفة التصنيع الثابتة</th>
                      <th className="px-3 py-3">إجمالي التكلفة</th>
                      <th className="px-3 py-3">سعر البيع</th>
                      <th className="px-3 py-3">المكسب المتوقع</th>
                    </>
                  )}
                  {canSeeCommission && <th className="px-3 py-3">عمولة المسوّق</th>}
                  <th className="px-4 py-3 text-center">المخزون والكمية</th>
                  {isAdmin && <th className="px-4 py-3 text-left">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const brand = brands.find((b) => b.id === p.brandId);
                  const totalCost = p.rawMaterialCost + p.manufacturingCost;
                  const unitProfit = p.defaultSellingPrice - totalCost;
                  const displayStock = getProductStock(p);
                  const isLowStock = displayStock <= p.lowStockThreshold;
                  const hasVariants = Boolean(p.variants && p.variants.length > 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-indigo-600 font-medium">
                          {brand ? brand.name : 'براند غير محدد'}
                        </div>
                        {hasVariants && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.variants!.map((v) => (
                              <span
                                key={v.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-600"
                              >
                                {v.size}/{v.color}: {v.stockQuantity}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {canSeeCosts && (
                        <>
                          <td className="px-3 py-3 font-mono font-bold text-amber-700">
                            {p.rawMaterialCost} ج.م
                          </td>

                          <td className="px-3 py-3 font-mono font-bold text-sky-700">
                            {p.manufacturingCost} ج.م
                          </td>

                          <td className="px-3 py-3 font-mono font-bold text-slate-800">
                            {totalCost} ج.م
                          </td>

                          <td className="px-3 py-3 font-mono font-bold text-slate-900">
                            {p.defaultSellingPrice} ج.م
                          </td>

                          <td className="px-3 py-3 font-mono font-bold text-emerald-600">
                            +{unitProfit} ج.م
                          </td>
                        </>
                      )}

                      {canSeeCommission && (
                        <td className="px-3 py-3 font-mono font-bold text-violet-700">
                          {p.commissionPct != null ? `${p.commissionPct}%` : '—'}
                        </td>
                      )}

                      {/* Stock with quick buttons */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                          {canManageCatalog && (
                            <button
                              onClick={() => onUpdateStock(p.id, Math.max(0, displayStock - 1))}
                              disabled={hasVariants}
                              className="w-5 h-5 rounded bg-white hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs"
                              title={hasVariants ? 'عدّل مخزون كل متغير من شاشة التعديل' : 'تقليل قطعة'}
                            >
                              -
                            </button>
                          )}
                          <span
                            className={`font-mono font-bold text-xs px-1.5 ${
                              isLowStock ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                            }`}
                          >
                            {displayStock}
                          </span>
                          {canManageCatalog && (
                            <button
                              onClick={() => onUpdateStock(p.id, displayStock + 1)}
                              disabled={hasVariants}
                              className="w-5 h-5 rounded bg-white hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs"
                              title={hasVariants ? 'عدّل مخزون كل متغير من شاشة التعديل' : 'إضافة قطعة'}
                            >
                              +
                            </button>
                          )}
                        </div>
                        {isLowStock && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            مخزون منخفض!
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="تعديل المنتج والتكاليف"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onDeleteProduct(p.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="حذف المنتج من الكتالوج"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي الأصناف المسجلة: {products.length} صنف</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
