import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/demo/';
const W = 1920, H = 1080;    // lo schermo del telefono e' reso 1:1 dentro la scena
const STAGE = 'http://127.0.0.1:8900/stage.html';
const spiral = fs.readFileSync(D + 'Spirale.json', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: D + 'rawmob', size: { width: W, height: H } },
});
const p = await ctx.newPage();
const T0 = Date.now();
const marks = [];
const mark = name => { marks.push({ name, t: +((Date.now() - T0) / 1000).toFixed(2) }); };
p.on('pageerror', e => console.log('PAGEERR', e.message));

await p.goto(STAGE, { waitUntil: 'networkidle' });
await sleep(2500);

const app = p.frameLocator('#app');
const frame = () => p.frames().find(f => f.url().includes('8899'));

// Tocca un comando dentro il telefono: anello + click reale nello stesso punto.
async function tap(sel, post = 700) {
  const box = await app.locator(sel).boundingBox();
  if (!box) throw new Error('comando non trovato nel telefono: ' + sel);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await p.evaluate(([x, y]) => tapAt(x, y), [x, y]);
  await sleep(140);
  await app.locator(sel).click();
  await sleep(post);
}

mark('stage');
await sleep(1200);

// 1) chiude il pannello variabili -> si vede il diagramma
await tap('#variabiliLabel', 1000);

// 2) carica la spirale e prepara la tela grafica a tutto schermo del telefono
await frame().evaluate(t => _bfLoadFlowFromContent(t, 'Spirale.json', null, () => {}), spiral);
await sleep(1600);
await frame().evaluate(() => {
  setRunSpeed(120);                       // il selettore su mobile vive nel menu "More"
  showTurtlePanel();
  const el = document.getElementById('draw-output-panel');
  if (el) { el.style.left = '14px'; el.style.top = '300px'; el.style.width = '362px'; el.style.height = '400px'; }
  if (typeof _tgApplyZoom === 'function') _tgApplyZoom();
  if (typeof bfBringToFront === 'function' && el) bfBringToFront(el);
});
await sleep(900);

// 3) parte l'esecuzione
mark('runStart');
await tap('#console-exe', 300);

// 4) mentre disegna, compaiono le piattaforme una alla volta
for (let i = 0; i < 5; i++) {
  await p.evaluate(n => revealPlatform(n), i);
  await sleep(900);
}

for (let i = 0; i < 200; i++) {
  const running = await frame().evaluate(() => {
    const b = document.getElementById('console-stop');
    return !!(b && !b.disabled);
  });
  if (!running) break;
  await sleep(400);
}
mark('runEnd');
await sleep(2600);
mark('end');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks-mobile.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'rawmob').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'rawmob', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
