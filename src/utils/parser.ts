import { Brand, Product, ParsedOrderCandidate, OrderStatus } from '../types';

/**
 * Normalizes Arabic text for flexible matching (removes tashkeel, standardizes alef, etc.)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[\s\t\r\n]+/g, ' ')
    .trim();
}

/**
 * Splits bulk raw text into distinct individual order texts
 */
export function splitBulkOrdersText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Split by explicit dividers if present
  const explicitDivider = /(?:[-=*_~]{3,}|\b(?:اوردر|طلب|order|الاوردر|الطلب)\s*(?:رقم|جديد|#|\d+)\b)/i;
  
  if (explicitDivider.test(rawText)) {
    const parts = rawText.split(explicitDivider).map(p => p.trim()).filter(p => p.length > 15);
    if (parts.length > 0) return parts;
  }

  // Split by double newline or blank lines
  const paragraphs = rawText.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 15);
  if (paragraphs.length > 1) {
    return paragraphs;
  }

  return [rawText.trim()];
}

/**
 * Parses a single order text snippet using intelligent regex and domain heuristics
 */
export function parseSingleOrderText(
  text: string,
  availableBrands: Brand[],
  catalogProducts: Product[]
): ParsedOrderCandidate {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const normalizedFull = normalizeArabic(text);

  let customerName = '';
  let customerPhone = '';
  let customerAddress = '';
  let city = 'القاهرة'; // default fallback
  let brandId: string | undefined = undefined;
  let brandName: string | undefined = undefined;
  let customerShipping: number | undefined = undefined;
  let orderAmount: number | undefined = undefined;
  let status: OrderStatus = 'manufacturing'; // default as requested by user
  let notes: string = '';

  // 1. Detect Phone Number (Egyptian phone regex: 010/011/012/015 followed by 8 digits)
  const phoneMatch = text.match(/(?:(?:\+?20|0020)?\s*)?01[0125]\s*\d{4}\s*\d{4}|\b01[0125]\d{8}\b/);
  if (phoneMatch) {
    customerPhone = phoneMatch[0].replace(/\s+/g, '');
    if (customerPhone.startsWith('+20')) {
      customerPhone = '0' + customerPhone.slice(3);
    } else if (customerPhone.startsWith('0020')) {
      customerPhone = '0' + customerPhone.slice(4);
    }
  }

  // 2. Detect Brand
  for (const brand of availableBrands) {
    const normBrandName = normalizeArabic(brand.name);
    const brandTokens = normBrandName.split(' ').filter(t => t.length > 2);
    const matched = brandTokens.some(token => normalizedFull.includes(token));
    if (matched) {
      brandId = brand.id;
      brandName = brand.name;
      break;
    }
  }
  // Default to first brand if not matched
  if (!brandId && availableBrands.length > 0) {
    brandId = availableBrands[0].id;
    brandName = availableBrands[0].name;
  }

  // 3. Detect Status
  if (/اتشحن|تم الشحن|خرج للشحن|مشحون|مع المندوب/i.test(normalizedFull)) {
    status = 'shipped';
  } else if (/جاهز للشحن|مجهز|تجهيز كامل|جاهز/i.test(normalizedFull)) {
    status = 'ready_to_ship';
  } else if (/اتسلم|تم التسليم|مسلم|خالص/i.test(normalizedFull)) {
    status = 'delivered';
  } else if (/مرتجع|ملغي|كنسل/i.test(normalizedFull)) {
    status = 'returned';
  } else {
    status = 'manufacturing'; // بيتصنع أو تحت التجهيز
  }

  // 4. Line by line scanning for Name, Address, Shipping, Amount
  for (const line of lines) {
    const normLine = normalizeArabic(line);

    // Name
    if (/^(?:الاسم|اسم العميل|العميل|اسم المستلم|الاسم الثلاثي)\s*[:：\-]/i.test(line)) {
      customerName = line.replace(/^(?:الاسم|اسم العميل|العميل|اسم المستلم|الاسم الثلاثي)\s*[:：\-]\s*/i, '').trim();
    }

    // Address
    if (/^(?:العنوان|عنوان العميل|المكان|اللوكيشن|التوصيل الى)\s*[:：\-]/i.test(line)) {
      customerAddress = line.replace(/^(?:العنوان|عنوان العميل|المكان|اللوكيشن|التوصيل الى)\s*[:：\-]\s*/i, '').trim();
    }

    // City / Governorate
    if (/^(?:المحافظه|المدينه|المحافظة|المدينة)\s*[:：\-]/i.test(line)) {
      city = line.replace(/^(?:المحافظه|المدينه|المحافظة|المدينة)\s*[:：\-]\s*/i, '').trim();
    }

    // Shipping Fee
    if (/^(?:الشحن|سعر الشحن|مصاريف الشحن|قيمه الشحن)\s*[:：\-]/i.test(line)) {
      const matchNum = line.match(/\d+(?:\.\d+)?/);
      if (matchNum) customerShipping = parseFloat(matchNum[0]);
    }

    // Order Amount / Total
    if (/^(?:مبلغ الاوردر|سعر المنتج|المبلغ|الاجمالي|اجمالي الاوردر|السعر|الحساب)\s*[:：\-]/i.test(line)) {
      const matchNum = line.match(/\d+(?:\.\d+)?/);
      if (matchNum) orderAmount = parseFloat(matchNum[0]);
    }

    // Notes
    if (/^(?:ملاحظات|ملاحظه|ملحوظه|تعليمات)\s*[:：\-]/i.test(line)) {
      notes = line.replace(/^(?:ملاحظات|ملاحظه|ملحوظه|تعليمات)\s*[:：\-]\s*/i, '').trim();
    }
  }

  // If customer name wasn't found via key, try first line if it looks like a name and not key-value
  if (!customerName && lines.length > 0) {
    const firstLine = lines[0].trim();
    if (!firstLine.includes(':') && !/\d{5,}/.test(firstLine) && firstLine.length < 40) {
      customerName = firstLine;
    }
  }

  // If address wasn't found via prefix, search lines containing Egyptian city names or street words
  if (!customerAddress) {
    const addressKeywords = ['شارع', 'ش ', 'عمارة', 'برج', 'دور', 'شقة', 'طريق', 'ميدان', 'بجوار', 'خلف', 'امام', 'حي', 'منطقة'];
    const addrLine = lines.find(l => addressKeywords.some(k => l.includes(k)));
    if (addrLine && !addrLine.includes('010') && !addrLine.includes('011') && !addrLine.includes('012')) {
      customerAddress = addrLine;
    }
  }

  // Detect City inside address if not explicitly given
  const governorates = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'الدقهلية', 'القليوبية',
    'الشرقية', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد',
    'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج',
    'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'مطروح'
  ];
  for (const gov of governorates) {
    if (normalizedFull.includes(normalizeArabic(gov))) {
      city = gov;
      break;
    }
  }

  // 5. Detect and Match Products from Catalog
  const matchedItems: ParsedOrderCandidate['items'] = [];

  // Check which catalog products match the text
  const relevantCatalog = brandId
    ? catalogProducts.filter(p => p.brandId === brandId)
    : catalogProducts;

  for (const product of relevantCatalog) {
    const normProdName = normalizeArabic(product.name);
    // Break product name into distinctive keywords
    const keywords = normProdName.split(' ').filter(k => k.length > 2);
    const matchesCount = keywords.filter(k => normalizedFull.includes(k)).length;
    
    // If at least 2 distinct keywords match or exact substring
    if (matchesCount >= Math.min(2, Math.max(1, keywords.length)) || normalizedFull.includes(normProdName)) {
      // Find quantity if specified near the product
      let qty = 1;
      const qtyMatch = text.match(new RegExp(`(?:عدد|الكميه|كميه|قطع|قطعتين|\\()?\\s*([1-9]\\d?)\\s*(?:قطع|قطعه|pieces)?`, 'i'));
      if (qtyMatch && qtyMatch[1]) {
        const parsedQty = parseInt(qtyMatch[1]);
        if (parsedQty <= 20) qty = parsedQty;
      }

      matchedItems.push({
        productName: product.name,
        quantity: qty,
        unitPrice: product.defaultSellingPrice,
        rawMaterialCost: product.rawMaterialCost,
        manufacturingCost: product.manufacturingCost,
      });
    }
  }

  // If no catalog products were matched from full text, extract product name from lines mentioning "المنتج:" or "الطلب:"
  if (matchedItems.length === 0) {
    const productLine = lines.find(l => /^(?:المنتج|الطلبات|الطلب|الصنف|تفاصيل المنتج|اسم المنتج)\s*[:：\-]/i.test(l));
    const extractedName = productLine 
      ? productLine.replace(/^(?:المنتج|الطلبات|الطلب|الصنف|تفاصيل المنتج|اسم المنتج)\s*[:：\-]\s*/i, '').trim()
      : (lines[0] || 'منتج عام');

    // Check if extractedName matches ANY product in catalogProducts by name or partial keyword
    const normExtracted = normalizeArabic(extractedName);
    const catalogMatch = catalogProducts.find(p => {
      const normP = normalizeArabic(p.name);
      return normExtracted.includes(normP) || normP.includes(normExtracted) ||
        p.name.split(' ').some(w => w.length > 3 && normExtracted.includes(normalizeArabic(w)));
    });

    if (catalogMatch) {
      // Auto-fetch fixed manufacturing cost from catalog product!
      matchedItems.push({
        productName: catalogMatch.name,
        quantity: 1,
        unitPrice: catalogMatch.defaultSellingPrice || orderAmount || 500,
        rawMaterialCost: catalogMatch.rawMaterialCost,
        manufacturingCost: catalogMatch.manufacturingCost,
      });
    } else {
      const price = orderAmount || 500;
      const estimatedRaw = Math.round(price * 0.35);
      const estimatedMfg = Math.round(price * 0.20);

      matchedItems.push({
        productName: extractedName,
        quantity: 1,
        unitPrice: price,
        rawMaterialCost: estimatedRaw,
        manufacturingCost: estimatedMfg,
      });
    }
  }

  // Default shipping if not detected
  if (customerShipping === undefined) {
    const brand = availableBrands.find(b => b.id === brandId);
    customerShipping = brand ? brand.defaultCustomerShipping : 60;
  }

  // Calculate confidence score
  let confidence = 0.5;
  if (customerName) confidence += 0.15;
  if (customerPhone) confidence += 0.2;
  if (customerAddress) confidence += 0.1;
  if (matchedItems.length > 0) confidence += 0.05;

  return {
    customerName: customerName || 'عميل بدون اسم',
    customerPhone: customerPhone || '',
    customerAddress: customerAddress || '',
    city: city || 'القاهرة',
    brandId,
    brandName,
    items: matchedItems,
    orderAmount: orderAmount || matchedItems.reduce((s, it) => s + (it.unitPrice * it.quantity), 0),
    customerShipping,
    actualShippingCost: (customerShipping > 10 ? customerShipping - 10 : 50),
    status,
    notes,
    confidence: Math.min(1, confidence),
    rawInput: text,
  };
}
