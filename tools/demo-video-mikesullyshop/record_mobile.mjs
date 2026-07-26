// Coda del video: lo stesso sito dentro la cornice di un telefono, per mostrare
// che il layout Bootstrap regge davvero sul mobile. L'iframe e' largo 390px, ai
// breakpoint del sito non interessa altro: la UI da telefono si attiva sul
// serio, non e' simulata.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { wire } from './lib_boot.mjs';
import fs from 'fs';
import path from 'path';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/shop/';
const W = 1920, H = 1080;
const STAGE = 'http://127.0.0.1:8922/stage.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  locale: 'it-IT', timezoneId: 'Europe/Rome',
  recordVideo: { dir: D + 'rawmob', size: { width: W, height: H } },
});
wire(ctx);
const p = await ctx.newPage();
const T0 = Date.now();
const marks = [];
const mark = n => { marks.push({ name: n, t: +((Date.now() - T0) / 1000).toFixed(2) }); };
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));

const scene = (k, h, l) => p.evaluate(([a, b, c]) => scene(a, b, c), [k, h, l]);
const app = p.frameLocator('#app');
const frame = () => p.frames().find(f => f.url().includes('8920'));

// Tocca un comando dentro il telefono: anello + click vero nello stesso punto.
async function tap(sel, post = 900) {
  const el = app.locator(sel).first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(350);
  const box = await el.boundingBox();
  if (!box) throw new Error('comando non trovato nel telefono: ' + sel);
  await p.evaluate(([x, y]) => tapAt(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
  await sleep(150);
  await el.click();
  await sleep(post);
}

// Scorrimento dentro il telefono, morbido.
async function scrollPhone(y, dur = 900) {
  await frame().evaluate(([y, d]) => new Promise(res => {
    const y0 = window.scrollY, dy = y - y0, t0 = performance.now();
    const e = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    (function step(now) {
      const t = Math.min(1, (now - t0) / d);
      window.scrollTo(0, y0 + dy * e(t));
      t < 1 ? requestAnimationFrame(step) : res();
    })(performance.now());
  }), [y, dur]);
  await sleep(dur + 200);
}

await p.goto(STAGE, { waitUntil: 'networkidle' });
await sleep(2600);
mark('stage');

await scene('Anche da telefono', 'Lo stesso sito,<br>senza app.',
  'Il layout Bootstrap si riorganizza da solo: stesso catalogo, stesso carrello, stesso account.');
await sleep(2400);

// il catalogo scorre
await scrollPhone(620, 1100);
await p.evaluate(() => revealFeat(0));
await sleep(900);
await scrollPhone(1240, 1100);
await p.evaluate(() => revealFeat(1));
await sleep(1100);

// si apre una scheda prodotto
mark('scheda');
await frame().evaluate(() => { location.href = 'productDetail.php?id=2'; });
await p.waitForTimeout(2600);
await p.evaluate(() => revealFeat(2));
await sleep(1200);
await scrollPhone(420, 900);
await p.evaluate(() => revealFeat(3));
await sleep(1600);

mark('fine');
await sleep(1200);

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks-mobile.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'rawmob').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'rawmob', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
