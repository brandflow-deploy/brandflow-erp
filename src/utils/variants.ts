import { OrderItem, Product, ProductVariant } from '../types';

// مخزون المنتج المعروض: مجموع مخزون المتغيرات عند وجودها، وإلا الرصيد المباشر
export function getProductStock(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
  }
  return product.stockQuantity || 0;
}

export function findVariant(product: Product, variantId?: string): ProductVariant | undefined {
  if (!variantId || !product.variants) return undefined;
  return product.variants.find((v) => v.id === variantId);
}

export function findVariantByAttributes(
  product: Product,
  size?: string,
  color?: string
): ProductVariant | undefined {
  if (!product.variants) return undefined;
  return product.variants.find(
    (v) =>
      (size === undefined || v.size === size) &&
      (color === undefined || v.color === color)
  );
}

// خصم/إرجاع مخزون قطعة أوردر واحدة من المنتج (أو من متغيره المحدد)
export function applyStockDelta(
  product: Product,
  item: Pick<OrderItem, 'variantId' | 'size' | 'color' | 'quantity'>,
  direction: 'deduct' | 'restore'
): { product: Product; changed: boolean; label: string } {
  const qty = Math.max(1, item.quantity || 1);
  const sign = direction === 'deduct' ? -1 : 1;

  // منتج بمتغيرات: الخصم من المتغير المحدد فقط، وإعادة حساب الإجمالي
  if (product.variants && product.variants.length > 0) {
    let variant = findVariant(product, item.variantId);
    if (!variant && (item.size || item.color)) {
      variant = findVariantByAttributes(product, item.size, item.color);
    }
    if (!variant) {
      return { product, changed: false, label: '' };
    }
    const before = variant.stockQuantity;
    const after =
      direction === 'deduct' ? Math.max(0, before - qty) : before + qty;
    const variants = product.variants.map((v) =>
      v.id === variant!.id ? { ...v, stockQuantity: after } : v
    );
    const total = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    const label = `${product.name} (${variant.size} / ${variant.color}) ×${qty}: ${before} ← ${after}`;
    return {
      product: { ...product, variants, stockQuantity: total },
      changed: true,
      label,
    };
  }

  // منتج بدون متغيرات: خصم مباشر من الرصيد
  const before = product.stockQuantity || 0;
  const after = direction === 'deduct' ? Math.max(0, before - qty) : before + qty;
  const label = `${product.name} ×${qty}: ${before} ← ${after}`;
  return {
    product: { ...product, stockQuantity: after },
    changed: true,
    label,
  };
}

export function newVariantId(): string {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2 سنوات', '4 سنوات', '6 سنوات', '8 سنوات', '10 سنوات', '12 سنوات'];
export const COMMON_COLORS = ['أسود', 'أبيض', 'بيج', 'رمادي', 'كحلي', 'أحمر', 'وردي', 'أخضر', 'أزرق', 'بني', 'أوف وايت'];
