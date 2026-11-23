// بادئة اختيارية لمسارات الـ API - تُستخدم في نسخة المرآة على supabase.co
// حيث تُقدَّم الواجهة من Edge Function تحت المسار /functions/v1/mirror
// وتُمرَّر طلبات /api عبره إلى خادم Cloudflare Workers.
// في النشر العادي (workers.dev) تكون فارغة ولا يتغير أي سلوك.
export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) || '').replace(
  /\/+$/,
  ''
);
