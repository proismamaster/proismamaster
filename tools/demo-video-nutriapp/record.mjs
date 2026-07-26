import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { wire } from './lib_boot.mjs';

const D = path.dirname(new URL(import.meta.url).pathname) + '/';
const W = 1280, H = 720;
const STAGE = 'http://127.0.0.1:8904/stage.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb'],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  locale: 'it-IT', timezoneId: 'Europe/Rome',
  recordVideo: { dir: D + 'raw', size: { width: W, height: H } },
});
await wire(ctx);
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const T0 = Date.now();
const marks = [];
const mark = n => { marks.push({ name: n, t: +((Date.now() - T0) / 1000).toFixed(2) }); };
p.on('pageerror', e => console.log('PAGEERR', e.message.split('\n')[0]));

// --- regia -----------------------------------------------------------------
const scene = (k, h, l) => p.evaluate(([a, b, c]) => scene(a, b, c), [k, h, l]);
const chips = list => p.evaluate(l => chips(l), list);
const chipOn = i => p.evaluate(n => chipOn(n), i);

// L'app sta in un iframe scalato 0.7333: da coordinate CSS del telefono a
// coordinate della pagina-scena.
let SX = 0, SY = 0;
const K = 0.7333;
const toPage = (x, y) => [SX + x * K, SY + y * K];

async function tap(x, y, post = 900) {
  const [px, py] = toPage(x, y);
  await p.evaluate(([a, b]) => tapAt(a, b), [px, py]);
  await sleep(130);
  await p.mouse.click(px, py);
  await sleep(post);
}

async function type(text, delay = 55) {
  await p.keyboard.type(text, { delay });
}

// Swipe con eventi touch veri: Flutter non scrolla col trascinamento del mouse.
async function swipe(x, y0, y1, steps = 22, post = 1000) {
  const [px, p0] = toPage(x, y0);
  const [, p1] = toPage(x, y1);
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await send('touchStart', [{ x: px, y: p0 }]);
  for (let i = 1; i <= steps; i++) {
    await send('touchMove', [{ x: px, y: p0 + (p1 - p0) * i / steps }]);
    await sleep(14);
  }
  await send('touchEnd', []);
  await sleep(post);
}

// --------------------------------------------------------------------------
await p.goto(STAGE, { waitUntil: 'load' });
await sleep(1000);
const box = await p.locator('.screen').boundingBox();
SX = box.x; SY = box.y;

mark('intro');
await p.evaluate(() => card(`
  <div class="t">NutriApp</div>
  <div class="s">Traccia i pasti, leggi i macro, guarda l'andamento nel tempo.</div>
  <div class="chips">
    <span class="chip">Flutter</span><span class="chip">Android &amp; Windows</span>
    <span class="chip">Grafici storici</span><span class="chip">Report PDF</span>
  </div>
`));
await sleep(3000);

// attende che il motore Flutter abbia disegnato la schermata di accesso
await sleep(11000);
await p.evaluate(() => cardOff());
await sleep(700);

// 1) LINGUA + ACCESSO -------------------------------------------------------
mark('login');
await scene('Accesso', 'Apri l\'app,<br>entra in due tocchi.', 'Quattro lingue, accesso con email o con Google e Apple.');
await tap(362, 28, 1300);          // globo lingua
await tap(284, 84, 2400);          // Italiano
await tap(195, 347, 600); await type('demo@nutriapp.local');
await tap(195, 411, 600); await type('DemoNutriApp');
await tap(64, 495, 700);           // privacy
await tap(195, 553, 1000);         // Accedi
mark('dashboard');
await sleep(7000);

// 2) DASHBOARD --------------------------------------------------------------
await scene('La giornata', 'Quante ne restano,<br>non solo quante ne hai prese.',
  'Anello delle calorie rimanenti e barre di carboidrati, proteine e grassi sui tuoi obiettivi.');
await sleep(6500);
await scene('I pasti', 'Colazione, pranzo,<br>cena e spuntino.',
  'Ogni pasto ha la sua sezione. Il peso corrente si aggiorna dalla stessa schermata.');
await sleep(5500);

// 3) CALENDARIO -------------------------------------------------------------
mark('calendario');
await tap(117, 810, 4500);
await scene('Lo storico', 'Ogni giorno<br>resta registrato.', 'Dal calendario si riapre qualunque giornata passata.');
await sleep(5000);

// 4) GRAFICI ----------------------------------------------------------------
mark('grafici');
await tap(351, 810, 5000);
await scene('Statistiche', 'Tutto lo storico,<br>in numeri.',
  'Voci totali, giorni tracciati, media e picco delle calorie sull\'intervallo scelto.');
await sleep(6500);
await scene('', 'Giornaliero, settimanale,<br>mensile, annuale.', 'Lo stesso dato riletto su quattro scale temporali.');
await sleep(4500);

mark('graficoBarre');
await swipe(195, 640, 240);
await swipe(195, 640, 260);
await scene('Andamento', 'Le calorie,<br>giorno per giorno.',
  'Il grafico si costruisce dai pasti registrati: si vede subito quando si sfora e quando si sta sotto.');
await sleep(8000);
await swipe(195, 640, 320);
await scene('Macro', 'E come si distribuiscono<br>i macronutrienti.', 'Carboidrati, proteine e grassi sul totale del periodo.');
await sleep(7000);

// 5) REPORT PDF -------------------------------------------------------------
mark('pdf');
await swipe(195, 300, 620);
await swipe(195, 300, 560);
await scene('Condivisione', 'E un report PDF<br>da portare al nutrizionista.', 'Stampa o condivisione diretta dall\'app.');
await sleep(6500);

// 6) CARTELLO FINALE --------------------------------------------------------
mark('outro');
await p.evaluate(() => card(`
  <div class="t">NutriApp</div>
  <div class="s">App nutrizionale in Flutter — tracciamento pasti, macro e micronutrienti,
    grafici storici e report PDF.</div>
  <div class="chips">
    <span class="chip">Android&nbsp;·&nbsp;.apk</span>
    <span class="chip">Windows&nbsp;·&nbsp;.zip</span>
    <span class="chip">v1.0.0</span>
  </div>
  <div class="u">github.com/proismamaster/NutriApp &nbsp;·&nbsp; ismailbarakat.dev</div>
`));
await sleep(3600);
mark('fine');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'raw').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'raw', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
