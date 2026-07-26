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
  recordVideo: { dir: D + 'raw', size: { width: W, height: H } },
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
const K = 1.0;          // il telefono renderizza 1:1: niente conversione di scala
const toPage = (x, y) => [SX + x * K, SY + y * K];

async function tap(x, y, post = 900, conAnello = true) {
  const [px, py] = toPage(x, y);
  if (conAnello) { await p.evaluate(([a, b]) => tapAt(a, b), [px, py]); await sleep(130); }
  await p.mouse.click(px, py);
  await sleep(post);
}
const type = (t, delay = 60) => p.keyboard.type(t, { delay });

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
  <div class="s">Registra quello che mangi in pochi tocchi: cerchi l'alimento, scegli il pasto, e i conti si fanno da soli.</div>
  <div class="chips">
    <span class="chip">Flutter</span><span class="chip">Android &amp; Windows</span>
    <span class="chip">Ricerca alimenti</span><span class="chip">Ricette</span>
  </div>
`));

// L'accesso avviene DIETRO il cartello: non e' la parte interessante e nel
// video non si vede.
await sleep(12000);
await tap(362, 28, 1200, false);
await tap(284, 84, 2200, false);
await tap(195, 347, 500, false); await type('ismailbarakat68@gmail.com', 15);
await tap(195, 411, 500, false); await type('DemoNutriApp2026', 15);
await tap(64, 495, 400, false);
await tap(195, 553, 8500, false);
await p.evaluate(() => cardOff());
await sleep(700);

// 1) IL PUNTO DI PARTENZA ---------------------------------------------------
mark('dashboard');
await scene('Il diario', 'Quello che mangi,<br>giorno per giorno.',
  'Anello delle calorie rimanenti e barre dei macro. Ora aggiungiamoci qualcosa.');
await sleep(4500);

// 2) RICERCA PER NOME -------------------------------------------------------
mark('ricerca');
await tap(195, 809, 3000);                       // Aggiungi
await scene('Aggiungi', 'Cerchi l\'alimento<br>e lo trovi.',
  'Ricerca per nome sul database nutrizionale, oppure scansione del codice a barre.');
await sleep(2500);
await tap(195, 194, 700);
await type('pasta', 130);
await sleep(600);
await p.keyboard.press('Enter');
await sleep(3200);
await scene('', 'I risultati arrivano<br>dal database CREA.', 'Ogni voce con le sue calorie per 100 g. Sotto continua la lista.');
await sleep(4000);

// 3) SCHEDA DELL'ALIMENTO ---------------------------------------------------
mark('scheda');
await tap(195, 266, 3500);                       // primo risultato
await scene('La scheda', 'Si apre gia<br>compilata.',
  'Calorie per porzione, percentuale sul fabbisogno, e il campo per il codice a barre.');
await sleep(5000);
await tap(195, 503, 1400);                       // selettore del pasto
await tap(195, 551, 1800);                       // Pranzo
await scene('', 'Scegli il pasto…', 'Colazione, pranzo, cena o spuntino.');
await sleep(3000);
await tap(65, 810, 700);                         // campo peso
await p.keyboard.press('Control+A');
await type('120', 200);
await scene('', '…e la porzione.', 'I valori si ricalcolano sul peso che inserisci.');
await sleep(3800);

// 4) I MACRO A COLPO D'OCCHIO ----------------------------------------------
mark('micro');
await swipe(195, 700, 300);
await scene('Dettaglio', 'Non solo calorie.',
  'Carboidrati, proteine, grassi, fibre e zuccheri in chiaro; i dettagli dei grassi si aprono solo se ti servono.');
await sleep(5500);

// 5) AGGIUNGI E TORNA AL DIARIO --------------------------------------------
mark('salva');
await tap(250, 810, 3500);                       // AGGIUNGI (fisso in basso)
await scene('Fatto', 'E il diario<br>si aggiorna.', 'Le calorie rimanenti e le barre dei macro cambiano subito.');
await sleep(2200);
await tap(39, 820, 4000);                        // torna alla home
await sleep(4500);

// 6) RICETTE ----------------------------------------------------------------
mark('ricette');
await tap(273, 820, 4000);
await scene('Ricette', 'Quello che cucini<br>davvero, salvato.',
  'Una ricetta e un insieme di ingredienti con i suoi valori: si registra in un tocco invece di rifare la somma ogni volta.');
await sleep(6000);
await tap(195, 350, 3500);                       // apre la prima ricetta
await sleep(4500);

// 7) UNO SGUARDO AI GRAFICI -------------------------------------------------
mark('grafici');
await tap(28, 28, 2000);                         // esce dal dettaglio ricetta
await tap(351, 820, 4500);
await swipe(195, 640, 240);
await swipe(195, 640, 260);
await scene('Nel tempo', 'E tutto questo<br>diventa un andamento.',
  'Calorie giorno per giorno, distribuzione dei macro, report PDF.');
await sleep(6000);

// 8) CARTELLO FINALE --------------------------------------------------------
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
await sleep(3600);
mark('fine');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'raw').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'raw', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
