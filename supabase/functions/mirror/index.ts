// بروكسي API لمرآة BrandFlow ERP على GitHub Pages.
// الواجهة تُقدَّم من brandflow-deploy.github.io (خارج نطاقات Cloudflare المحجوبة)،
// وهذه الدالة تمرر طلبات /api إلى خادم Cloudflare Workers الأصلي لأن المتصفح
// عند بعض مزودي الإنترنت الأرضي في مصر لا يصل إلى عناوين workers.dev.
// ملحوظة: بوابة Supabase المجانية تمنع تقديم HTML من Functions، لذلك الواجهة نفسها
// على GitHub Pages، وهذه الدالة للـ API فقط (JSON/ملفات، وهي مسموحة).

const UPSTREAM = "https://brandflow-erp.u9hkxp.workers.dev";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  let path = url.pathname;
  // البوابة تمرر المسار بدون /functions/v1 — نتعامل مع الشكلين
  for (const p of ["/functions/v1/mirror", "/mirror"]) {
    if (path.startsWith(p)) {
      path = path.slice(p.length) || "/";
      break;
    }
  }

  if (path !== "/api" && !path.startsWith("/api/")) {
    return new Response("BrandFlow ERP API mirror. The app lives on GitHub Pages.", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", ...CORS },
    });
  }

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("accept-encoding", "identity");
  const upstreamResp = await fetch(UPSTREAM + path + url.search, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    redirect: "manual",
  });
  const out = new Headers(upstreamResp.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  out.delete("transfer-encoding");
  for (const [k, v] of Object.entries(CORS)) out.set(k, v);
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: out,
  });
});
