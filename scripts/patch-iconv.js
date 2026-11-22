// Cloudflare Workers bundling fix: disable iconv-lite's node stream/extend loaders.
// They break under esbuild bundling and are only needed for non-UTF-8 encodings.
const fs = require('fs');
const p = 'node_modules/iconv-lite/lib/index.js';
if (fs.existsSync(p)) {
  let s = fs.readFileSync(p, 'utf8');
  const a = 'require("./streams")(iconv);';
  const b = 'require("./extend-node")(iconv);';
  let changed = false;
  if (s.includes(a) && !s.includes('// disabled for Workers bundling: ' + a)) { s = s.replace(a, '// disabled for Workers bundling: ' + a); changed = true; }
  if (s.includes(b) && !s.includes('// disabled for Workers bundling: ' + b)) { s = s.replace(b, '// disabled for Workers bundling: ' + b); changed = true; }
  if (changed) { fs.writeFileSync(p, s); console.log('iconv-lite patched for Workers bundling'); }
}
