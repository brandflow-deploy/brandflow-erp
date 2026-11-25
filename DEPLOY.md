# Deployment

## Workers (primary): https://brandflow-erp.u9hkxp.workers.dev
1. `npm run build`
2. `CLOUDFLARE_API_TOKEN=$(cat /tmp/cf-token.txt) npx wrangler deploy`
The Worker serves `/api/public-config`, so no build-time Supabase env needed.

## GitHub Pages mirror: https://brandflow-deploy.github.io/brandflow-erp/
The mirror has NO `/api/public-config`, so the build MUST:
1. Export env first: `source /tmp/supa-keys.env && export VITE_SUPABASE_URL="$SUPABASE_URL" VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"`
2. Build with subpath base: `npx vite build --base=/brandflow-erp/ --outDir dist-pages`
3. Push `dist-pages/*` as the root of the `gh-pages` branch (worktree), never commit it to main.
4. After deploy, a stale service worker may serve the old build: unregister SW + clear caches, then reload.
