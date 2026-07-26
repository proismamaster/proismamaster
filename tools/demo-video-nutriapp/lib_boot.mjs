import fs from 'fs'; import path from 'path';
const CK = process.env.NUTRIAPP_BUILD ? process.env.NUTRIAPP_BUILD + '/canvaskit'
  : '../portfolio/public/nutriapp/canvaskit';   // build Flutter web di NutriApp
const FONT='/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
const TYPES={'.js':'application/javascript','.wasm':'application/wasm','.symbols':'text/plain'};

// CanvasKit, font e backend arrivano tutti da host bloccati dal proxy:
// vengono serviti da copie locali e dal finto server su :8910.
export async function wire(ctx) {
  await ctx.route('https://www.gstatic.com/flutter-canvaskit/**', r => {
    const rel = new URL(r.request().url()).pathname.split('/').slice(3).join('/');
    const f = path.join(CK, rel);
    if (!fs.existsSync(f)) return r.abort();
    r.fulfill({ status:200, contentType: TYPES[path.extname(f)]||'application/octet-stream', body: fs.readFileSync(f) });
  });
  await ctx.route('https://fonts.gstatic.com/**', r =>
    r.fulfill({ status:200, contentType:'font/ttf', body: fs.readFileSync(FONT) }));
  await ctx.route('http://progetti.galileicrema.org/**', async r => {
    const u = new URL(r.request().url());
    const target = 'http://127.0.0.1:8910' + u.pathname + u.search;
    const res = await r.fetch({ url: target });
    await r.fulfill({ response: res });
  });
  await ctx.route('https://accounts.google.com/**', r => r.abort());
}
