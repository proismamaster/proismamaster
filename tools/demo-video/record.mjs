import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const D = path.dirname(new URL(import.meta.url).pathname) + '/';
const W = 1440, H = 810;
const APP = 'http://127.0.0.1:8899/index.html';
const overlaySrc = fs.readFileSync(D + 'overlay.js', 'utf8');
const spiral = fs.readFileSync(D + 'Spirale.json', 'utf8');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: D + 'raw', size: { width: W, height: H } },
});
const p = await ctx.newPage();
const T0 = Date.now();
const marks = [];
const mark = name => { marks.push({ name, t: +((Date.now() - T0) / 1000).toFixed(2) }); };
p.on('pageerror', e => console.log('PAGEERR', e.message));

// --- helper di regia -------------------------------------------------------
const say = (html, hold = 2600) => p.evaluate(([h, t]) => __bfDemo.say(h, t), [html, hold]);
const sayOff = () => p.evaluate(() => __bfDemo.sayOff());
const focusOff = () => p.evaluate(() => __bfDemo.focusOff());

async function click(x, y, { pre = 620, post = 420, dbl = false } = {}) {
  await p.evaluate(([x, y, d]) => __bfDemo.moveTo(x, y, d), [x, y, pre]);
  await p.evaluate(() => __bfDemo.clickFx());
  if (dbl) await p.mouse.dblclick(x, y); else await p.mouse.click(x, y);
  await sleep(post);
}

async function clickSel(sel, opts) {
  const box = await p.locator(sel).boundingBox();
  if (!box) throw new Error('elemento non trovato: ' + sel);
  await click(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2), opts);
}

async function typeInto(sel, text, delay = 50) {
  await p.locator(sel).click();
  await p.locator(sel).fill('');
  await p.locator(sel).type(text, { delay });
}

// Sposta/ridimensiona il pannello Turtle Graphics e ridisegna la tela alla nuova misura.
async function turtlePanel(left, top, w, h) {
  await p.evaluate(([l, t, w, h]) => {
    showTurtlePanel();
    const el = document.getElementById('draw-output-panel');
    if (el) { el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px'; }
    if (typeof _tgApplyZoom === 'function') _tgApplyZoom();
    if (typeof bfBringToFront === 'function' && el) bfBringToFront(el);
  }, [left, top, w, h]);
}

// --------------------------------------------------------------------------
await p.goto(APP, { waitUntil: 'networkidle' });
await sleep(900);
await p.addScriptTag({ content: overlaySrc });

// 1) CARTELLO DI APERTURA ---------------------------------------------------
mark('intro');
await p.evaluate(() => __bfDemo.card(`
  <img src="img/logoBaseFlow.png" alt="">
  <div class="t">BaseFlow</div>
  <div class="s">Disegna il diagramma di flusso. Eseguilo davvero. Traducilo in codice.</div>
  <div class="chips"><span class="chip">Editor a blocchi</span><span class="chip">Esecuzione passo-passo</span>
    <span class="chip">Grafica tartaruga</span><span class="chip">Export in 5 linguaggi</span></div>
`, 600));
await sleep(2700);
await p.evaluate(() => __bfDemo.cardOff());
await sleep(250);

// 2) DIAGRAMMA VUOTO + PALETTE ---------------------------------------------
mark('editor');
await p.evaluate(() => __bfDemo.cursorShow(true));
await say('Si parte da un diagramma vuoto: <b>Start</b> e <b>End</b>.', 1900);
await say('Clicca su una freccia per inserire un blocco…', 1500);
await click(879, 132, { post: 800 });
await say('…scegliendo fra <b>I/O</b>, <b>assegnazioni</b>, <b>if</b>, <b>cicli</b> e <b>grafica</b>.', 3000);

// 3) CONFIGURO UN BLOCCO OUTPUT --------------------------------------------
await clickSel('#output-btn', { post: 1000 });
await say('Doppio click sul blocco per configurarlo.', 1400);
await click(879, 164, { post: 800, dbl: true });
await typeInto('#edit-node-input', '"Ciao da BaseFlow!"');
await sleep(500);
await clickSel('#save-node-info', { post: 800 });
await sayOff();

// 4) ESECUZIONE + CONSOLE ---------------------------------------------------
await say('E il diagramma <b>si esegue davvero</b>.', 1600);
await clickSel('#terminal-reopen', { post: 800 });
await clickSel('#console-exe', { post: 2200 });
await p.evaluate(() => __bfDemo.focusOn('#console-output', 8));
await say('L\'output arriva nella console integrata.', 2400);
await focusOff();
await sayOff();
await clickSel('#console-titlebar', { post: 900 });

// 5) UN ALGORITMO VERO ------------------------------------------------------
mark('load');
await say('Ora un algoritmo vero: una <b>spirale</b> disegnata dalla tartaruga.', 900);
await p.evaluate(t => _bfLoadFlowFromContent(t, 'Spirale.json', null, () => {}), spiral);
await sleep(1700);
await say('Un ciclo <b>for</b>: avanti, gira di 89°, allunga il lato.', 3000);
await sayOff();

// pannello grafico nella colonna libera a sinistra: non copre nulla
await turtlePanel(336, 178, 306, 452);
await sleep(500);

// 6) ESECUZIONE ANIMATA (verrà accelerata in montaggio) ---------------------
await p.selectOption('#run-speed', '120');
await say('Esecuzione passo-passo: nodo evidenziato e variabili aggiornate in tempo reale.', 1800);
await clickSel('#console-exe', { post: 300 });
await p.evaluate(() => __bfDemo.cursorShow(false));
mark('runStart');
await sleep(11000);
await sayOff();
await say('La tartaruga disegna mentre il flusso avanza.', 12000);
await sayOff();

for (let i = 0; i < 200; i++) {                       // attende la fine dell'esecuzione
  const running = await p.evaluate(() => {
    const b = document.getElementById('console-stop');
    return !!(b && !b.disabled);
  });
  if (!running) break;
  await sleep(400);
}
mark('runEnd');
await sleep(600);

// 7) IL DISEGNO PRENDE LA SCENA --------------------------------------------
await turtlePanel(430, 74, 660, 664);
await sleep(700);
await say('Ogni figura nasce da un <b>algoritmo</b>, non da un disegno.', 3000);
await sayOff();
await turtlePanel(336, 178, 306, 452);
await sleep(400);

// 8) TRADUZIONE IN CODICE ---------------------------------------------------
mark('export');
await p.evaluate(() => __bfDemo.cursorShow(true));
await say('E lo stesso diagramma diventa <b>codice</b>.', 1600);
await clickSel('#export-btn', { post: 1300 });
await p.evaluate(() => __bfDemo.focusOn('#export-code', 8));
await say('Python, JavaScript, C, C++, Java — oppure PNG e PDF.', 2000);
await p.selectOption('#export-format', 'java');
await sleep(1600);
await p.selectOption('#export-format', 'c');
await sleep(1600);
await focusOff();
await sayOff();
await clickSel('#close-export-btn', { post: 600 });
await p.evaluate(() => __bfDemo.cursorShow(false));

// 9) CARTELLO DI CHIUSURA ---------------------------------------------------
mark('outro');
await p.evaluate(() => __bfDemo.card(`
  <img src="img/logoBaseFlow.png" alt="">
  <div class="t">BaseFlow</div>
  <div class="s">Open source · desktop, web e Android</div>
  <div class="u">github.com/proismamaster/BaseFlow &nbsp;·&nbsp; ismailbarakat.dev</div>
`, 600));
await sleep(3000);
mark('end');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'raw').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'raw', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
