# BrandFlow ERP — براند فلو

نظام إدارة الأوردرات والتصنيع والمخزون للبراندات (واجهة عربية RTL)، مبني بـ React + Vite + Tailwind، مع خادم Express للتكامل مع Supabase و Gemini (اختياري).

## التشغيل محلياً (وضع التطوير)

```bash
npm install
npm run dev        # الواجهة على المنفذ الافتراضي لـ Vite
# أو لتشغيل الخادم كاملاً:
ALLOW_DEV_AUTH=true npm run server
```

بدون إعداد Supabase يعمل النظام في «وضع التطوير المحلي»: تخزين محلي في `data/db.json` ودخول بزر واحد. هذا الوضع للتجربة فقط ولا يصلح للإنتاج.

## النشر على Cloud Run + Supabase (خطوة بخطوة)

### 1) إنشاء مشروع Supabase
1. أنشئي مشروعاً جديداً في [supabase.com](https://supabase.com).
2. من **SQL Editor** نفّذي ملف `supabase/schema.sql` كاملاً (ينشئ الجداول وسياسات الأمان RLS).
3. من **Project Settings → API** انسخي:
   - `Project URL`
   - مفتاح `anon public`
   - مفتاح `service_role` (سري — لا يوضع أبداً في متغيرات الواجهة)

### 2) إنشاء أول مستخدم مدير
1. من **Authentication → Users** في Supabase: **Add user** بالبريد وكلمة المرور.
2. النظام يمنح **أول مستخدم يسجل دخوله** دور المدير العام تلقائياً (bootstrap)، وبعدها تُدار الصلاحيات من شاشة «الإعدادات والفريق» داخل النظام.

### 3) بناء الصورة ونشرها

الصورة لا تحتاج أي متغيرات وقت البناء: الواجهة تجلب إعدادات Supabase من السيرفر وقت التشغيل عبر `/api/public-config`، فتكفي متغيرات البيئة العادية عند التشغيل.

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/brandflow-erp

gcloud run deploy brandflow-erp \
  --image gcr.io/PROJECT_ID/brandflow-erp \
  --platform managed --region REGION --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=https://xxxx.supabase.co" \
  --set-env-vars "SUPABASE_ANON_KEY=eyJ..." \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=eyJ..."
```

### بديل: Render (مجاني بدون بطاقة)
1. ارفعي الكود على مستودع Git عام.
2. في Render: New → Web Service → Public Git repository، واختاري بيئة Docker (سيقرأ Dockerfile تلقائياً).
3. أضيفي متغيرات البيئة نفسها (`SUPABASE_URL` و `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY`)، واتركي الخطة Free.
4. بعد أول Deploy ناجح افتحي الرابط وسجلي دخول أول مستخدم ليأخذ صلاحية المدير.

> الخطة المجانية في Render توقف الخدمة بعد 15 دقيقة خمول، ويعود التشغيل تلقائياً عند أول زيارة (يأخذ حوالي دقيقة).

### 4) متغيرات البيئة (راجعي `.env.example`)
| المتغير | الوصف |
|---|---|
| `PORT` | منفذ الخادم (8080 على Cloud Run) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | ربط الواجهة بـ Supabase |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | إدارة المستخدمين من الخادم (سري) |
| `GEMINI_API_KEY` | اختياري: الاستيراد الذكي للرسائل. بدونه يعمل التحليل المحلي |
| `ALLOW_DEV_AUTH` | اتركيه `false` في الإنتاج |

### 5) ميزة الاستيراد الذكي (اختيارية)
- مطفأة افتراضياً لكل براند.
- تُفعّل من «البراندات» → تعديل البراند → مفتاح «الاستيراد الذكي»، ويمكن إيقافها لأي براند في أي وقت.
- تعمل محلياً بدون مفتاح، ومع `GEMINI_API_KEY` تتحسن دقة التحليل.

## ملاحظات أمنية
- لا تضعي أسراراً في متغيرات `VITE_*` (تظهر في كود المتصفح). `service_role` للخادم فقط.
- وضع التطوير المحلي (`ALLOW_DEV_AUTH`) يجب أن يبقى مطفأً في الإنتاج.
- حزمة `xlsx` المستخدمة للتصدير لها تنبيهات أمنية معروفة بلا إصلاح متاح؛ استخدامها هنا للتصدير فقط (لا قراءة لملفات خارجية)، ومع ذلك يُنصح بعدم رفع ملفات Excel غير موثوقة.
