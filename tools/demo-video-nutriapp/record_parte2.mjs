// Seconda parte del video: ricette e grafici, registrati dal build web contro
// il backend e il database veri del progetto. L'app resta in INGLESE perche' la
// prima parte e' la registrazione dal telefono di Ismail, che e' in inglese.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { wire } from './lib_boot.mjs';

const D = path.dirname(new URL(import.meta.url).pathname) + '/';
const W = 1920, H = 1080;
const STAGE = 'http://127.0.0.1:8904/stage.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb'],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  locale: 'it-IT', timezoneId: 'Europe/Rome',
  recordVideo: { dir: D + 'raw2', size: { width: W, height: H } },
});
await wire(ctx);
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const T0 = Date.now();
const marks = [];
const mark = n => { marks.push({ name: n, t: +((Date.now() - T0) / 1000).toFixed(2) }); };
p.on('pageerror', e => console.log('PAGEERR', e.message.split('\n')[0]));

const scene = (k, h, l) => p.evaluate(([a, b, c]) => scene(a, b, c), [k, h, l]);

let SX = 0, SY = 0;
const toPage = (x, y) => [SX + x, SY + y];

async function tap(x, y, post = 900, conAnello = true) {
  const [px, py] = toPage(x, y);
  if (conAnello) { await p.evaluate(([a, b]) => tapAt(a, b), [px, py]); await sleep(130); }
  await p.mouse.click(px, py);
  await sleep(post);
}

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

await p.goto(STAGE, { waitUntil: 'load' });
await sleep(1000);
const box = await p.locator('.screen').boundingBox();
SX = box.x; SY = box.y;

// Accesso fuori campo: il video parte gia' dentro l'app.
await p.evaluate(() => card('<div class="t">NutriApp</div>'));
await sleep(11000);
await tap(195, 347, 500, false); await p.keyboard.type('ismailbarakat68@gmail.com', { delay: 15 });
await tap(195, 411, 500, false); await p.keyboard.type('DemoNutriApp2026', { delay: 15 });
await tap(64, 495, 400, false);
await tap(195, 553, 8500, false);
await tap(273, 820, 3000, false);                 // gia' sulla scheda Ricette
await p.evaluate(() => cardOff());
await sleep(800);

// 1) RICETTE ----------------------------------------------------------------
mark('ricette');
await scene('Ricette', 'Quello che cucini<br>davvero, salvato.',
  'Una ricetta e un insieme di ingredienti con i suoi valori: si registra in un tocco invece di rifare la somma ogni volta.');
await sleep(5200);
await scene('', 'Con gli ingredienti<br>e i loro valori.', 'Aprendola si vede la somma, non solo il nome.');
await sleep(1400);
await tap(195, 350, 3400);                        // apre la prima ricetta
await sleep(4800);

// 2) GRAFICI ----------------------------------------------------------------
mark('grafici');
await scene('Nel tempo', 'E tutto questo<br>diventa un andamento.',
  'Calorie giorno per giorno, distribuzione dei macro, report PDF.');
await sleep(1400);
await tap(28, 28, 1800);                          // esce dal dettaglio ricetta
await tap(351, 820, 4200);                        // Grafici
await swipe(195, 640, 240);
await swipe(195, 640, 260);
await sleep(5200);

// 3) CARTELLO FINALE --------------------------------------------------------
mark('outro');
await p.evaluate(() => card(`
  <div class="t">NutriApp</div>
  <div class="s">App nutrizionale in Flutter — ricerca alimenti, ricette, macro e
    micronutrienti, grafici storici e report PDF.</div>
  <div class="chips">
    <span class="chip">Android&nbsp;·&nbsp;.apk</span>
    <span class="chip">Windows&nbsp;·&nbsp;.zip</span>
    <span class="chip">v1.0.0</span>
  </div>
  <div class="u">github.com/proismamaster/NutriApp &nbsp;·&nbsp; ismailbarakat.dev</div>
`));
await sleep(3800);
mark('fine');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks-p2.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'raw2').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'raw2', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
