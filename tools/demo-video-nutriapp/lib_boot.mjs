import fs from 'fs'; import path from 'path';
// build Flutter web di NutriApp (output di `flutter build web --base-href /nutriapp/`)
const CK = (process.env.NUTRIAPP_BUILD || '../nutriapp/build/web') + '/canvaskit';
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
  // Il backend VERO dell'app (i .php di fileDatabase) gira in locale su :8911
  // contro un MariaDB con i dump reali del progetto. L'host di produzione e'
  // bloccato dalla policy di rete, ma il codice e i dati sono quelli veri.
  await ctx.route('http://progetti.galileicrema.org/**', async r => {
    const u = new URL(r.request().url());
    const res = await r.fetch({ url: 'http://127.0.0.1:8911' + u.pathname + u.search });
    await r.fulfill({ response: res });
  });
  await ctx.route('https://accounts.google.com/**', r => r.abort());
}

// Chromium su Linux non implementa l'API BarcodeDetector, quindi lo scanner
// dell'app fallisce con "Errore durante la scansione". Sul telefono (Android)
// l'API c'e' e la scansione funziona davvero: qui viene fornita una
// implementazione minima, cosi' la schermata di scansione si puo' registrare.
// Il codice restituito e' quello stampato sull'immagine data alla finta
// fotocamera, quindi cio' che si vede a schermo e cio' che l'app legge coincidono.
export async function shimBarcode(ctx, code = '8076809513692', ritardoFrame = 18) {
  await ctx.addInitScript(([codice, soglia]) => {
    let visti = 0;
    class BarcodeDetector {
      static getSupportedFormats() {
        return Promise.resolve(['ean_13', 'ean_8', 'qr_code', 'code_128', 'upc_a']);
      }
      constructor(_opts) {}
      async detect(_source) {
        if (++visti < soglia) return [];      // qualche frame di inquadratura
        const box = { x: 60, y: 150, width: 260, height: 90, top: 150, left: 60, right: 320, bottom: 240 };
        return [{
          rawValue: codice, format: 'ean_13', boundingBox: box,
          cornerPoints: [{ x: 60, y: 150 }, { x: 320, y: 150 }, { x: 320, y: 240 }, { x: 60, y: 240 }],
        }];
      }
    }
    window.BarcodeDetector = BarcodeDetector;
  }, [code, ritardoFrame]);
}
