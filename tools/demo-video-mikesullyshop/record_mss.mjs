// Parte desktop della demo di MikeSullyShop: l'e-commerce vero, servito da
// `php -S` contro MariaDB, guidato da Playwright con l'overlay di regia sopra.
//
// Differenza importante rispetto a BaseFlow: qui ogni schermata e' una pagina
// PHP diversa, quindi a ogni navigazione il documento viene ricreato e
// l'overlay iniettato sparisce. Per questo si usa addInitScript, che rigira lo
// script a ogni caricamento, e dopo ogni cambio pagina si riparte da say().
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { wire } from './lib_boot.mjs';
import fs from 'fs';
import path from 'path';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/shop/';
const W = 1920, H = 1080;
const B = 'http://127.0.0.1:8920';
const overlaySrc = fs.readFileSync(D + 'overlay.js', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  locale: 'it-IT',
  timezoneId: 'Europe/Rome',
  recordVideo: { dir: D + 'raw', size: { width: W, height: H } },
});
wire(ctx);
await ctx.addInitScript({ content: overlaySrc });

const p = await ctx.newPage();
const T0 = Date.now();
const marks = [];
const mark = name => { marks.push({ name, t: +((Date.now() - T0) / 1000).toFixed(2) }); };
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));

// Il checkout con carta apre un prompt() nativo per l'OTP e poi un alert().
// Sono finestre del browser, non della pagina: nel video non si vedono, quindi
// vanno raccontate dalla didascalia. Senza questo aggancio Playwright le
// scarta, l'ordine viene annullato e non arriva mai nel pannello di gestione.
p.on('dialog', d => d.accept('1234'));

// --- helper di regia -------------------------------------------------------
const say = (html, hold = 2600) => p.evaluate(([h, t]) => __bfDemo.say(h, t), [html, hold]);
const sayOff = () => p.evaluate(() => __bfDemo.sayOff());
const focusOn = (sel, pad = 10) => p.evaluate(([s, q]) => __bfDemo.focusOn(s, q), [sel, pad]);
const focusOff = () => p.evaluate(() => __bfDemo.focusOff());
const cursor = on => p.evaluate(v => __bfDemo.cursorShow(v), on);

async function click(x, y, { pre = 620, post = 500 } = {}) {
  await p.evaluate(([x, y, d]) => __bfDemo.moveTo(x, y, d), [x, y, pre]);
  await p.evaluate(() => __bfDemo.clickFx());
  await p.mouse.click(x, y);
  await sleep(post);
}

// Porta l'elemento in vista, poi ci clicca sopra con cursore e anello.
async function clickSel(sel, opts = {}) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await sleep(opts.settle ?? 450);
  const box = await el.boundingBox();
  if (!box) throw new Error('elemento non trovato: ' + sel);
  await click(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2), opts);
}

async function typeInto(sel, text, delay = 55) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) await p.evaluate(([x, y]) => __bfDemo.moveTo(x, y, 420),
    [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]);
  await el.click();
  await el.fill('');
  await el.type(text, { delay });
}

// Scorrimento morbido: la pagina e' lunga, i salti secchi si notano.
async function scrollTo(y, dur = 900) {
  await p.evaluate(([y, d]) => new Promise(res => {
    const y0 = window.scrollY, dy = y - y0, t0 = performance.now();
    const e = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    (function step(now) {
      const t = Math.min(1, (now - t0) / d);
      window.scrollTo(0, y0 + dy * e(t));
      t < 1 ? requestAnimationFrame(step) : res();
    })(performance.now());
  }), [y, dur]);
  await sleep(dur + 150);
}

const vai = async (url) => { await p.goto(B + url, { waitUntil: 'networkidle' }); await sleep(700); };

// --------------------------------------------------------------------------
// Accesso come cliente PRIMA di tutto: serve per il carrello e il checkout, ma
// non e' interessante da guardare. Sta qui in testa, dove il montaggio taglia,
// cosi' nel video non si vede. L'accesso come admin invece resta dentro,
// perche' li' il punto e' proprio che il pannello e' protetto dal ruolo.
await vai('/loginPage.php');
await p.fill('#mailInput', 'mike@monsters.com');
await p.fill('#passwordInput', 'password123');
await p.click('button[type=submit]');
await p.waitForLoadState('networkidle');
await vai('/homePage.php');

// 1) CARTELLO DI APERTURA ---------------------------------------------------
mark('intro');
await p.evaluate(() => __bfDemo.card(`
  <div class="t">MikeSullyShop</div>
  <div class="s">Un e-commerce completo scritto in PHP e MySQL: catalogo, carrello, checkout e pannello di gestione.</div>
  <div class="chips"><span class="chip">PHP senza framework</span><span class="chip">MySQL</span>
    <span class="chip">Bootstrap 5</span><span class="chip">Pannello admin</span></div>
`, 600));
await sleep(3000);
await p.evaluate(() => __bfDemo.cardOff());
await sleep(300);

// 2) IL CATALOGO ------------------------------------------------------------
mark('catalogo');
await cursor(true);
await say('Il negozio: <b>merchandise di Monstropolis</b>.', 2000);
await scrollTo(760, 900);
await say('Ogni scheda ha foto, prezzo e <b>sconto</b> in evidenza.', 2600);
await sayOff();

// ricerca vera, che interroga il database
await scrollTo(560, 700);
await say('La ricerca lavora sul <b>database</b>, non sulla pagina.', 1800);
await typeInto('input[type=search][name=search]', 'peluche');
await sleep(600);
await p.keyboard.press('Enter');
await p.waitForLoadState('networkidle');
await sleep(1400);
await say('Tre peluche su dieci articoli.', 2200);
await sayOff();

// 3) LA SCHEDA PRODOTTO -----------------------------------------------------
mark('prodotto');
await vai('/productDetail.php?id=1');
await say('La scheda: <b>carosello</b> di immagini e disponibilita in magazzino.', 2400);
await focusOn('.carousel, #productCarousel', 12);
await sleep(900);
await focusOff();
await sayOff();

await say('Si sceglie la quantita e si aggiunge al carrello.', 1900);
await clickSel('button:has-text("Aggiungi al Carrello"), .add-to-cart', { post: 1800 });
await sayOff();

// 4) IL CARRELLO E IL TIMER -------------------------------------------------
mark('carrello');
await vai('/cart.php');
await say('Nel carrello la merce viene <b>riservata per 30 minuti</b>.', 2600);
await focusOn('#cartTimer', 10);
await sleep(1600);
await say('Scaduto il tempo, la giacenza torna disponibile da sola.', 2600);
await focusOff();
await sayOff();

// 5) IL CHECKOUT ------------------------------------------------------------
mark('checkout');
await clickSel('a:has-text("Acquista Ora"), button:has-text("Acquista Ora")', { post: 2000 });
await p.waitForLoadState('networkidle');
await sleep(800);
await say('Il checkout arriva <b>gia compilato</b> con i dati dell\'account.', 2400);
await typeInto('input[name="telefono"], #telefono', '345 118 2277', 45);
await typeInto('input[name="indirizzo"], #indirizzo', 'Via delle Urla 1', 45);
await typeInto('input[name="citta"], #citta', 'Crema', 45);
await typeInto('input[name="cap"], #cap', '26013', 45);
await typeInto('input[name="provincia"], #provincia', 'CR', 45);
await sayOff();
await scrollTo(760, 800);
await say('Tre metodi di pagamento.', 2000);
await clickSel('label[for="creditCard"], #creditCard', { post: 700 });
await sayOff();
await say('Con la carta parte un <b>OTP di quattro cifre</b> da confermare.', 2600);
await clickSel('button[type="submit"]:has-text("CONFERMA ORDINE"), button:has-text("CONFERMA ORDINE")', { post: 900 });
await p.waitForLoadState('networkidle');
await sleep(1200);
await sayOff();
await say('Ordine registrato, con il suo numero.', 2400);
await sayOff();

// 6) IL PANNELLO DI GESTIONE ------------------------------------------------
mark('admin');
await vai('/php/logout.php').catch(() => {});
await vai('/loginPage.php');
await say('Lo stesso sito ha un <b>pannello di gestione</b>, protetto dal ruolo.', 2200);
await typeInto('#mailInput', 'admin@mikesully.shop', 45);
await typeInto('#passwordInput', 'admin123', 45);
await clickSel('button[type=submit]', { post: 2000 });
await p.waitForLoadState('networkidle');
await sayOff();

await vai('/adminMagazzino.php');
await say('<b>Magazzino</b>: giacenze, prezzi, sconti e categorie.', 2600);
await sayOff();
await scrollTo(420, 900);
await say('I prodotti si aggiungono da qui, con piu foto trascinabili.', 2600);
await sayOff();
await scrollTo(0, 700);

await vai('/adminOrdini.php');
await say('<b>Ordini</b>: in cima c\'e quello appena fatto.', 2600);
await sayOff();

await vai('/adminVendite.php');
await say('E il riepilogo delle <b>vendite</b>.', 2400);
await sayOff();
await cursor(false);
mark('fineDesktop');
await sleep(400);

// 7) CARTELLO DI CHIUSURA ---------------------------------------------------
mark('outro');
await p.evaluate(() => __bfDemo.card(`
  <div class="t">MikeSullyShop</div>
  <div class="s">PHP · MySQL · Bootstrap — catalogo, carrello, checkout e gestione</div>
  <div class="u">github.com/proismamaster/mike-sully-shop &nbsp;·&nbsp; ismailbarakat.dev</div>
`, 600));
await sleep(3000);
mark('end');

await ctx.close();
await browser.close();

fs.writeFileSync(D + 'marks.json', JSON.stringify(marks, null, 1));
const raw = fs.readdirSync(D + 'raw').filter(f => f.endsWith('.webm'));
console.log('registrato:', raw.map(f => f + ' ' + (fs.statSync(path.join(D, 'raw', f)).size / 1e6).toFixed(1) + 'MB').join(', '));
console.log('marcatori:', marks.map(m => m.name + '=' + m.t).join('  '));
