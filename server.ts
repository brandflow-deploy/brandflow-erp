import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildProjectZipBuffer } from './server/projectZip.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
export default app;
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================================================
// إعداد المصادقة عبر Supabase (التحقق من توكن المستخدمين يتم على السيرفر)
// ==============================================================================
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
// مفتاح سري للسيرفر فقط - لا يوضع أبداً في متغيرات VITE_ الخاصة بالمتصفح
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabaseAuth: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const supabaseService: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// وضع التطوير المحلي: دخول بدون Supabase وتخزين db.json - لا يعمل في الإنتاج إلا بطلب صريح
const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH === 'true' && !isProd;
const DEV_TOKEN = 'dev-local-token';
const devStorageEnabled = !isProd || process.env.ENABLE_LOCAL_STORAGE === 'true';

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
if (devStorageEnabled && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface AuthContext {
  id: string;
  email?: string;
  role: string;
  isDev?: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
  }

  if (ALLOW_DEV_AUTH && token === DEV_TOKEN) {
    req.auth = { id: 'dev-admin', role: 'admin', isDev: true };
    return next();
  }

  if (!supabaseAuth) {
    return res.status(503).json({ error: 'المصادقة غير مضبوطة على السيرفر' });
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'الجلسة غير صالحة، سجّل الدخول من جديد' });
  }

  // جلب الدور من الملف التعريفي (خدمة القراءة عبر مفتاح الخدمة إن توفر لتجاوز RLS)
  const reader = supabaseService || supabaseAuth;
  const { data: profile } = await reader
    .from('team_users')
    .select('id, role, is_active, brands_access')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    return res.status(403).json({ error: 'هذا الحساب غير مفعّل في النظام' });
  }

  req.auth = { id: data.user.id, email: data.user.email, role: profile.role };
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ error: 'هذه العملية متاحة للمدير العام فقط' });
  }
  next();
}

// ==============================================================================
// Server-side Gemini AI setup (اختياري - يعمل المحلل المحلي بدونه)
// ==============================================================================
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API: Health check
// إعدادات عامة آمنة للمتصفح وقت التشغيل (مفتاح anon مخصص للمتصفح أصلاً وتحميه سياسات RLS)
app.get('/api/public-config', (_req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGemini: !!ai,
    supabaseConfigured: Boolean(supabaseAuth),
    devAuthEnabled: ALLOW_DEV_AUTH,
    devStorageEnabled,
    timestamp: new Date().toISOString(),
  });
});

// API: Parse Orders via Gemini AI or structured fallback (محمي بتسجيل الدخول)
app.post('/api/parse-orders', requireAuth, async (req, res) => {
  try {
    const { rawText, availableBrands = [], catalogProducts = [] } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'نص الأوردر مطلوب' });
    }

    if (!ai) {
      // Return flag so frontend knows to use its built-in rule-based parser
      return res.json({
        success: false,
        useLocalFallback: true,
        message: 'سيتم استخدام المحلل الذكي المحلي المدمج',
      });
    }

    const brandsListStr = availableBrands.map((b: any) => `البراند: "${b.name}" (كود المعرف: "${b.id}")`).join('\n');
    const catalogListStr = catalogProducts.slice(0, 40).map((p: any) =>
      `المنتج: "${p.name}" (سعر بيع: ${p.defaultSellingPrice}, تكلفة خام: ${p.rawMaterialCost}, تكلفة تصنيع: ${p.manufacturingCost}, براند: "${p.brandId}")`
    ).join('\n');

    const prompt = `
أنت خبير محترف ومحلل ذكي لأوردرات المتاجر والبراندات في مصر والعالم العربي.
المطلوب استخراج بيانات الأوردرات من هذا النص المكتوب (قد يحتوي على أوردر واحد أو عدة أوردرات منسقة أو غير منسقة من واتساب/فيسبوك):

النص المدخل:
"""
${rawText}
"""

قائمة البراندات المسجلة في النظام:
${brandsListStr}

كتالوج المنتجات المسجلة وتكاليف تصنيعها الثابتة:
${catalogListStr}

القواعد الأساسية:
1. استخرج اسم العميل، رقم الهاتف (01xxxxxxxxx أو صيغة دولية)، العنوان، والمدينة/المحافظة.
2. حدد البراند بدقة من قائمة البراندات المتاحة، إذا لم يذكر صراحة خمن الأقرب بناء على أسماء المنتجات.
3. طابق المنتجات المذكورة مع كتالوج المنتجات المسجلة لاستخراج تكلفة الخام قبل التصنيع (rawMaterialCost) وتكلفة التصنيع الثابتة (manufacturingCost).
4. استخرج سعر الشحن المحصل من العميل ومبلغ الأوردر.
5. استخرج حالة الأوردر:
   - "manufacturing" لو بيتصنع أو تفصيل أو غير مشحون
   - "ready_to_ship" لو جاهز للتسليم لشركة الشحن
   - "shipped" لو تم الشحن أو مع المندوب
   - "delivered" لو تم التسليم
6. استخرج أي ملاحظات.
7. أرجع مصفوفة من الأوردرات المستخرجة.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'قائمة الأوردرات المستخرجة',
          items: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING },
              customerPhone: { type: Type.STRING },
              customerAddress: { type: Type.STRING },
              city: { type: Type.STRING },
              brandId: { type: Type.STRING },
              brandName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productName: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    unitPrice: { type: Type.NUMBER },
                    rawMaterialCost: { type: Type.NUMBER },
                    manufacturingCost: { type: Type.NUMBER },
                  },
                  required: ['productName', 'quantity', 'unitPrice'],
                },
              },
              customerShipping: { type: Type.NUMBER },
              actualShippingCost: { type: Type.NUMBER },
              status: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['customerName', 'customerPhone', 'customerAddress', 'items'],
          },
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '[]');
    return res.json({
      success: true,
      orders: parsedJson,
    });
  } catch (error: any) {
    console.error('Error in parse-orders API:', error);
    return res.json({
      success: false,
      useLocalFallback: true,
      error: error.message || 'حدث خطأ أثناء المعالجة بالذكاء الاصطناعي',
    });
  }
});

// API: إدارة المستخدمين (للمدير العام فقط) - إنشاء حسابات دخول حقيقية عبر Supabase Auth
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(503).json({
      error: 'إدارة المستخدمين تحتاج ضبط SUPABASE_SERVICE_ROLE_KEY على السيرفر',
    });
  }
  const { email, password, name, role, brandsAccess } = req.body || {};
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور والدور مطلوبة' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف' });
  }
  try {
    const { data: created, error: createErr } = await supabaseService.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return res.status(400).json({ error: createErr?.message || 'فشل إنشاء حساب الدخول' });
    }
    const profile = {
      id: created.user.id,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role,
      is_active: true,
      is_owner: false,
      brands_access: Array.isArray(brandsAccess) && brandsAccess.length > 0 ? brandsAccess : ['all'],
      created_at: new Date().toISOString(),
    };
    const { error: profileErr } = await supabaseService.from('team_users').insert(profile);
    if (profileErr) {
      await supabaseService.auth.admin.deleteUser(created.user.id);
      return res.status(400).json({ error: profileErr.message });
    }
    return res.json({ success: true, user: profile });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'خطأ غير متوقع' });
  }
});

app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(503).json({
      error: 'إدارة المستخدمين تحتاج ضبط SUPABASE_SERVICE_ROLE_KEY على السيرفر',
    });
  }
  const { id } = req.params;
  const { name, role, isActive, brandsAccess, password } = req.body || {};
  try {
    const updates: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof role === 'string') updates.role = role;
    if (typeof isActive === 'boolean') updates.is_active = isActive;
    if (Array.isArray(brandsAccess) && brandsAccess.length > 0) updates.brands_access = brandsAccess;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseService.from('team_users').update(updates).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
    }
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف' });
      }
      const { error } = await supabaseService.auth.admin.updateUserById(id, { password });
      if (error) return res.status(400).json({ error: error.message });
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'خطأ غير متوقع' });
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseService) {
    return res.status(503).json({
      error: 'إدارة المستخدمين تحتاج ضبط SUPABASE_SERVICE_ROLE_KEY على السيرفر',
    });
  }
  const { id } = req.params;
  if (id === req.auth?.id) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الشخصي' });
  }
  try {
    await supabaseService.from('team_users').delete().eq('id', id);
    const { error } = await supabaseService.auth.admin.deleteUser(id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'خطأ غير متوقع' });
  }
});

// API: التخزين المحلي للتطوير فقط (db.json) - معطل في الإنتاج افتراضياً
if (devStorageEnabled) {
  app.get('/api/storage', requireAuth, (req, res) => {
    if (fs.existsSync(DB_FILE)) {
      try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return res.json(JSON.parse(data));
      } catch (e) {
        return res.status(500).json({ error: 'فشل قراءة ملف البيانات' });
      }
    }
    return res.json(null);
  });

  app.post('/api/storage', requireAuth, (req, res) => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
      return res.json({ success: true, savedAt: new Date().toISOString() });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}

// API: تنزيل كود المشروع كاملاً (للمدير العام فقط)
app.get('/api/download-project-zip', requireAuth, requireAdmin, (_req, res) => {
  try {
    const zipBuffer = buildProjectZipBuffer(__dirname, 'brandflow-erp');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="brandflow-erp-project.zip"');
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.send(zipBuffer);
  } catch (e: any) {
    console.error('Error building project ZIP:', e);
    return res.status(500).json({ error: e.message || 'فشل تجهيز ملف المشروع' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrandFlow server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
