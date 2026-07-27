// Parte desktop della demo di MikeSullyShop: l'e-commerce vero, servito da
// `php -S` contro MariaDB, guidato da Playwright con l'overlay di regia sopra.
//
// Differenza importante rispetto a BaseFlow: qui ogni schermata e' una pagina
// PHP diversa, quindi a ogni navigazione il documento viene ricreato e
// l'overlay iniettato sparisce. Per questo si usa addInitScript, che rigira lo
// script a ogni caricamento.
//
// TRE REGOLE DI QUESTO TAGLIO, volute:
//
// 1. La didascalia va SEMPRE su PRIMA del gesto che descrive, e resta su per
//    tutta la sua durata: e' quello che tiene sincronizzate scritte e video.
//    Da qui il pattern `beat()`, che e' l'unico modo in cui si parla qui dentro.
// 2. Il checkout NON si vede. Indirizzo di spedizione e metodo di pagamento
//    sono dati personali e non hanno niente da fare in un video di portfolio:
//    l'ordine viene creato davvero, ma fuori campo (vedi `ordineFuoriCampo`).
// 3. Il peso sta sul PANNELLO DI GESTIONE, non sulla vetrina: e' la parte che
//    dimostra il lavoro vero.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { wire } from './lib_boot.mjs';
import fs from 'fs';
import path from 'path';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/shop/';
const W = 1920, H = 1080;
const B = 'http://127.0.0.1:8920';
const overlaySrc = fs.readFileSync(D + 'overlay.js', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// `--disable-background-networking` e i due che seguono spengono le connessioni
// di preconnessione: Chromium ne apre alcune "per scaldare" senza mandarci mai
// una richiesta, e ognuna tiene occupato per sempre un processo di `php -S`,
// che di socket ne serve una per volta. Bastano poche preconnessioni per far
// smettere di rispondere il server a meta' registrazione, senza un errore.
const browser = await chromium.launch({ args: [
  '--force-color-profile=srgb', '--font-render-hinting=none',
  '--disable-background-networking', '--disable-features=NetworkPrediction',
  '--dns-prefetch-disable',
] });
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
// Due dialoghi nativi lungo il percorso: il prompt dell'OTP al checkout (che
// gira fuori campo) e il confirm che il pannello Ordini chiede prima di
// cambiare stato. Vanno accettati ASPETTANDO: se si prosegue senza attendere,
// l'invio del form si perde per strada e lo stato non viene mai salvato.
p.on('dialog', async d => { await d.accept('1234'); });

// Il pannello Ordini si aggiorna da solo ("stati in tempo reale"): un'attesa
// che vive DENTRO la pagina (un setTimeout dell'overlay, un ciclo di
// requestAnimationFrame) puo' non tornare piu'. Tutto quello che aspetta lato
// pagina passa da qui e ha un tetto: al peggio si prosegue.
const conTetto = (promessa, ms, ripiego = null) =>
  Promise.race([promessa, sleep(ms).then(() => ripiego)]).catch(() => ripiego);

// --- helper di regia -------------------------------------------------------
// Tolleranti alla navigazione: se il gesto porta a un'altra pagina PHP il
// contesto viene distrutto a meta' chiamata, e senza catch il copione muore.
const say = (html, hold = 2600) =>
  conTetto(p.evaluate(([h, t]) => __bfDemo.say(h, t), [html, hold]), hold + 1500);
// Anche queste aspettano dentro la pagina (l'overlay fa `await sleep()` per
// lasciar finire la dissolvenza): senza tetto, una sola di loro puo' bloccare
// tutto il copione a tempo indeterminato.
const sayOff = () => conTetto(p.evaluate(() => __bfDemo.sayOff()), 2000);
const focusOn = (sel, pad = 10) => conTetto(p.evaluate(([s, q]) => __bfDemo.focusOn(s, q), [sel, pad]), 2500);
const focusOff = () => conTetto(p.evaluate(() => __bfDemo.focusOff()), 2500);
const cursor = on => conTetto(p.evaluate(v => __bfDemo.cursorShow(v), on), 2000);

// UN SOLO modo di raccontare: prima la scritta, poi il gesto sotto la scritta.
// `anticipo` e' quanto la didascalia resta da sola prima che qualcosa si muova;
// `coda` quanto resta dopo che il gesto e' finito. Cosi' non capita mai di
// leggere una cosa mentre a schermo ne succede un'altra.
// `naviga: true` quando il gesto cambia pagina: il documento nuovo nasce senza
// didascalia, quindi la rimettiamo subito. Senza, la scritta sparisce a meta'
// azione ed e' esattamente la desincronizzazione che vogliamo evitare.
async function beat(testo, azione, { anticipo = 1100, coda = 700, naviga = false } = {}) {
  await say(testo, anticipo);
  if (azione) await azione();
  if (naviga) await say(testo, coda);
  else await sleep(coda);
  await sayOff();
}

async function click(x, y, { pre = 620, post = 500 } = {}) {
  // moveTo gira su requestAnimationFrame dentro la pagina: stesso rischio.
  await conTetto(p.evaluate(([x, y, d]) => __bfDemo.moveTo(x, y, d), [x, y, pre]), pre + 1500);
  await conTetto(p.evaluate(() => __bfDemo.clickFx()), 1500);
  await p.mouse.click(x, y);
  await sleep(post);
}

async function clickSel(sel, opts = {}) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await sleep(opts.settle ?? 400);
  const box = await el.boundingBox();
  if (!box) throw new Error('elemento non trovato: ' + sel);
  await click(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2), opts);
}

async function typeInto(sel, text, delay = 55) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) await conTetto(p.evaluate(([x, y]) => __bfDemo.moveTo(x, y, 420),
    [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]), 2000);
  await el.click();
  await el.fill('');
  await el.type(text, { delay });
}

async function scrollTo(y, dur = 850) {
  await conTetto(p.evaluate(([y, d]) => new Promise(res => {
    const y0 = window.scrollY, dy = y - y0, t0 = performance.now();
    const e = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    (function step(now) {
      const t = Math.min(1, (now - t0) / d);
      window.scrollTo(0, y0 + dy * e(t));
      t < 1 ? requestAnimationFrame(step) : res();
    })(performance.now());
  }), [y, dur]), dur + 2000);
  await sleep(200);
}

// 'load' e non 'networkidle': i pannelli admin si aggiornano da soli, quindi la
// rete non si ferma mai del tutto e networkidle rischia di non tornare piu'.
// E con ritentativo: `php -S` ogni tanto si impunta, e perdere una ripresa da
// quattro minuti per una navigazione andata a vuoto non ha senso.
const vai = async (url, tentativi = 3) => {
  for (let i = 1; i <= tentativi; i++) {
    try { await p.goto(B + url, { waitUntil: 'load', timeout: 12000 }); await sleep(1100); return; }
    catch (e) { console.log('navigazione a vuoto su', url, '- tentativo', i); }

    // Ripiego: si naviga DA DENTRO la pagina. Dopo qualche minuto di ripresa
    // capita che il `goto` pilotato da CDP non spedisca mai la richiesta (il
    // server la vede come socket aperta e muta), mentre un cambio di
    // `location.href` fatto dalla pagina stessa passa senza problemi.
    try {
      await p.evaluate(u => { window.location.href = u; }, url);
      await p.waitForURL('**' + url.split('?')[0], { timeout: 12000 });
      await p.waitForLoadState('load', { timeout: 12000 });
      await sleep(1100);
      return;
    } catch (e2) { await sleep(1200); }
  }
  throw new Error('non riesco ad aprire ' + url);
};

// Crea un ordine VERO passando dal checkout e dall'OTP, ma senza riprenderlo:
// la pagina di spedizione e quella di conferma mostrano indirizzo, telefono e
// metodo di pagamento, che nel video non ci devono stare. L'ordine serve per
// farlo comparire, subito dopo, in cima al pannello di gestione.
async function ordineFuoriCampo() {
  await p.goto(B + '/productDetail.php?id=4', { waitUntil: 'load' });
  await p.locator('button:has-text("Aggiungi al Carrello")').first().click();
  await p.waitForTimeout(1200);
  await p.goto(B + '/shippingPage.php', { waitUntil: 'load' });
  for (const [n, v] of [['telefono', '3451182277'], ['indirizzo', 'Via delle Urla 1'],
                        ['citta', 'Crema'], ['cap', '26013'], ['provincia', 'CR']]) {
    await p.locator(`input[name="${n}"]`).first().fill(v);
  }
  await p.locator('#creditCard').first().check().catch(() => {});
  await p.locator('button:has-text("CONFERMA ORDINE")').first().click();
  await p.waitForLoadState('load');
  await p.waitForTimeout(1500);
}

// --------------------------------------------------------------------------
// Accesso come cliente: serve al carrello, ma non e' interessante da guardare.
// Sta qui in testa, dove il montaggio taglia.
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
  <div class="s">Un e-commerce completo scritto in PHP e MySQL: vetrina, carrello e il pannello con cui si manda avanti il negozio.</div>
  <div class="chips"><span class="chip">PHP senza framework</span><span class="chip">MySQL</span>
    <span class="chip">Bootstrap 5</span><span class="chip">Pannello admin</span></div>
`, 600));
await sleep(2700);
await p.evaluate(() => __bfDemo.cardOff());
await sleep(250);

// 2) LA VETRINA, DI PASSAGGIO ------------------------------------------------
mark('vetrina');
await cursor(true);
await beat('La vetrina: <b>ricerca</b> e filtri che interrogano il database.',
  async () => {
    await scrollTo(700, 900);
    await typeInto('input[type=search][name=search]', 'peluche');
    await p.keyboard.press('Enter');
    await p.waitForLoadState('load');
    await sleep(1400);
  }, { anticipo: 1200, coda: 900, naviga: true });

// 3) SCHEDA E CARRELLO -------------------------------------------------------
mark('carrello');
await vai('/productDetail.php?id=1');
await beat('Nella scheda, <b>carosello</b> delle foto e giacenza in magazzino.',
  async () => { await focusOn('.carousel, #productCarousel', 12); await sleep(1100); await focusOff(); },
  { anticipo: 1300, coda: 300 });

await beat('Si aggiunge al carrello…',
  async () => { await clickSel('button:has-text("Aggiungi al Carrello"), .add-to-cart', { post: 1600 }); },
  { anticipo: 900, coda: 400 });

await vai('/cart.php');
await beat('…dove la merce resta <b>riservata trenta minuti</b>: scaduti, la giacenza torna libera.',
  async () => { await focusOn('#cartTimer', 10); await sleep(1800); await focusOff(); },
  { anticipo: 1400, coda: 300 });

await beat('Si conferma con un <b>codice OTP</b> di quattro cifre.',
  null, { anticipo: 2200, coda: 200 });

// L'ordine viene creato davvero, ma fuori campo: niente indirizzi ne' pagamenti.
await cursor(false);
mark('fuoricampo');
await ordineFuoriCampo();

// 4) IL PANNELLO DI GESTIONE — la parte grossa --------------------------------
mark('admin');
await vai('/php/logout.php').catch(() => {});
await vai('/loginPage.php');
await cursor(true);
await beat('Il pannello di gestione e lo stesso sito, ma <b>protetto dal ruolo</b>.',
  async () => {
    await typeInto('#mailInput', 'admin@mikesully.shop', 42);
    await typeInto('#passwordInput', 'admin123', 42);
    await clickSel('button[type=submit]', { post: 1600 });
    await p.waitForLoadState('load');
  }, { anticipo: 1200, coda: 500, naviga: true });

// --- magazzino
mark('magazzino');
await vai('/adminMagazzino.php');
await beat('<b>Magazzino</b>: ogni articolo con categoria, giacenza, prezzo e sconto.',
  async () => { await sleep(1800); }, { anticipo: 1400, coda: 400 });

await beat('Si cerca l\'articolo da correggere…',
  async () => {
    await typeInto('#admin-search', 'zaino', 60);
    await sleep(1400);
  }, { anticipo: 1000, coda: 600 });

// La ricerca nasconde le righe che non combaciano, ma i link restano nel DOM:
// senza `:visible` si finisce a cliccare la matita di una riga nascosta.
await beat('…si apre in modifica, gia compilato.',
  async () => {
    await clickSel('a[title="Modifica"]:visible, button[title="Modifica"]:visible', { post: 1700 });
    await sleep(1300);
  }, { anticipo: 1100, coda: 500, naviga: true });

await beat('Si corregge la <b>giacenza</b> e si salva: l\'inventario cambia davvero.',
  async () => {
    await typeInto('input[name="giacenza"]', '20', 90);
    await sleep(700);
    await clickSel('button:has-text("Aggiorna Prodotto")', { post: 1800 });
    await p.waitForLoadState('load');
    await sleep(1600);
  }, { anticipo: 1300, coda: 800, naviga: true });

await vai('/adminMagazzino.php');
await beat('I nuovi articoli si inseriscono da qui, con <b>piu foto</b> riordinabili a trascinamento.',
  async () => { await scrollTo(360, 900); await sleep(1600); }, { anticipo: 1300, coda: 600 });
await scrollTo(0, 600);

// --- ordini
mark('ordini');
await vai('/adminOrdini.php');
await beat('<b>Ordini</b>: in cima quello appena arrivato, con dentro cosa e stato comprato.',
  async () => { await sleep(2200); }, { anticipo: 1500, coda: 500 });

// Attenzione: la PRIMA `select[name="stato"]` della pagina e' il filtro in cima,
// non una riga d'ordine. E le righe gia' consegnate hanno la select disabilitata.
// Quindi si lavora dentro la riga dell'ordine piu' recente, e con attese corte:
// `networkidle` qui non va usato, questa pagina si aggiorna da sola e non sta
// mai davvero ferma.
await beat('Lo stato si sceglie <b>riga per riga</b>…',
  async () => {
    const riga = p.locator('tbody tr').filter({ has: p.locator('select[name="stato"]:not([disabled])') }).first();
    await riga.locator('select[name="stato"]').scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await sleep(400);
    await riga.locator('select[name="stato"]').selectOption('spedito', { timeout: 5000 }).catch(() => {});
    await sleep(900);
    // Il form viene spedito DALLA PAGINA. Un click pilotato da CDP, a questo
    // punto della ripresa, resta appeso: la richiesta non parte, il server vede
    // solo una socket muta e il copione si ferma per minuti. Un submit fatto
    // dalla pagina stessa passa sempre.
    const salva = riga.locator('button:has-text("Salva")');
    const box = await salva.boundingBox().catch(() => null);
    if (box) {
      await conTetto(p.evaluate(([x, y]) => __bfDemo.moveTo(x, y, 560),
        [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]), 2200);
      await conTetto(p.evaluate(() => __bfDemo.clickFx()), 1500);
    }
    await Promise.all([
      p.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {}),
      salva.evaluate(el => el.form.requestSubmit(el)).catch(() => {}),
    ]);
    await sleep(1800);
  }, { anticipo: 1300, coda: 900, naviga: true });

await beat('…e l\'ordine risulta <b>spedito</b>.',
  async () => { await sleep(2000); }, { anticipo: 1200, coda: 500 });

await beat('E si filtra per stato, cliente o prodotto.',
  async () => { await sleep(1800); }, { anticipo: 1200, coda: 500 });

// --- vendite
mark('vendite');
await vai('/adminVendite.php');
await beat('<b>Vendite</b>: fatturato, articolo piu venduto e nuovi clienti.',
  async () => { await sleep(2600); }, { anticipo: 1500, coda: 600 });
await cursor(false);
mark('fineDesktop');
await sleep(400);

// 5) CARTELLO DI CHIUSURA ----------------------------------------------------
mark('outro');
await p.evaluate(() => __bfDemo.card(`
  <div class="t">MikeSullyShop</div>
  <div class="s">PHP · MySQL · Bootstrap — vetrina, carrello e gestione del negozio</div>
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
