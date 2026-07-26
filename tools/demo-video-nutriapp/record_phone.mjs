// Prima parte del video: la registrazione fatta da Ismail sul telefono vero,
// messa nella stessa cornice della scena e commentata dalle didascalie.
// Qui si vedono le foto dei prodotti, che dall'ambiente di registrazione non
// sarebbero raggiungibili (OpenFoodFacts bloccato).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const D = path.dirname(new URL(import.meta.url).pathname) + '/';
const W = 1920, H = 1080;
const STAGE = 'http://127.0.0.1:8904/stage_video.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb',
         '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  locale: 'it-IT', timezoneId: 'Europe/Rome',
  recordVideo: { dir: D + 'rawtel', size: { width: W, height: H } },
});
const p = await ctx.newPage();
const T0 = Date.now();
const marks = [];
const mark = n => { marks.push({ name: n, t: +((Date.now() - T0) / 1000).toFixed(2) }); };

const scene = (k, h, l) => p.evaluate(([a, b, c]) => scene(a, b, c), [k, h, l]);

// Aspetta che il video del telefono raggiunga un dato secondo, poi prosegue.
async function fino(t) {
  await p.waitForFunction(s => tempo() >= s, t, { timeout: 90000, polling: 120 });
}

await p.goto(STAGE, { waitUntil: 'load' });
await p.waitForFunction(() => document.getElementById('app').readyState >= 3, null, { timeout: 60000 });
await sleep(600);

// 1) CARTELLO DI APERTURA ---------------------------------------------------
mark('intro');
await p.evaluate(() => card(`
  <div class="t">NutriApp</div>
  <div class="s">Registra quello che mangi in pochi tocchi: cerchi l'alimento, scegli il pasto, e i conti si fanno da soli.</div>
  <div class="chips">
    <span class="chip">Flutter</span><span class="chip">Android &amp; Windows</span>
    <span class="chip">Ricerca alimenti</span><span class="chip">Ricette</span>
  </div>
`));
await sleep(3600);
await p.evaluate(() => cardOff());
await sleep(600);

// 2) RICERCA ----------------------------------------------------------------
mark('ricerca');
await scene('Aggiungi', 'Cerchi l\'alimento<br>e lo trovi.',
  'Ricerca per nome, oppure scansione del codice a barre direttamente dal telefono.');
await p.evaluate(() => { vaiA(1.6); play(); });
await fino(7.2);
await scene('', 'Otto risultati,<br>con la foto del prodotto.',
  'Arrivano dal database nutrizionale e da OpenFoodFacts.');
await fino(9.6);

// 3) LA SCHEDA DEL PRODOTTO -------------------------------------------------
mark('scheda');
await scene('La scheda', 'Si apre gia<br>compilata.',
  'Foto, marca, punteggio NOVA e allergeni: tutto quello che c\'e\' sulla confezione.');
await fino(14.5);
await scene('', 'Macro, grassi,<br>vitamine e minerali.',
  'Le sezioni si aprono solo se ti servono, con gli ingredienti in fondo.');
await fino(25.5);

// 4) PORZIONE E SALVATAGGIO -------------------------------------------------
mark('salva');
await scene('', 'Scegli il pasto<br>e la porzione.',
  'Cinquanta grammi: i valori si ricalcolano da soli.');
await fino(33.6);
await scene('Fatto', 'E il diario<br>si aggiorna.',
  'Centosettantaquattro calorie in piu, e le barre dei macro si muovono.');
await fino(37.4);
await p.evaluate(() => pausa());
await sleep(2200);
mark('fine');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks-tel.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'rawtel').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'rawtel', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
