// Vestizione della demo di IRIS (BitCtrl).
//
// Qui non si registra niente: la registrazione arriva gia' fatta (1920x1140,
// 32s, col browser di Ismail intorno). Questo script produce i PNG a 1920x1080
// dentro cui il filmato viene incastonato in montaggio.
//
// Due cose che NON sono estetica:
//
// 1. La registrazione include la barra del browser: schede aperte, preferiti,
//    indirizzo. Sono roba personale di Ismail (Claude, WhatsApp Web, corsi,
//    un ticket "Firewall"). Non si sfoca, si TAGLIA: crop y=142 in avanti.
//    Cosi' sparisce del tutto e il fotogramma ne guadagna.
// 2. La pagina Configuration > Network mostra hostname e indirizzi di un
//    apparato: quelli restano ma sfocati (vedi iris_monta.sh). La pagina
//    System info invece e' dati finti di esempio (johndoe, my-computer,
//    192.168.1.10, uptime 123456): resta leggibile, e' proprio quello che il
//    progetto deve far vedere.
//
// Impaginazione: sfondo pieno + una finestra 1780x936 in alto, e sotto una
// fascia dove vive la didascalia. La didascalia e' INCISA nel PNG della scena,
// quindi compare e sparisce esattamente con la scena a cui appartiene — mai a
// cavallo di due, che e' il difetto da evitare.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/iris/';

// Finestra: il ritaglio e' 1898x998 (1.902:1), qui dentro senza deformare.
const F = { x: 70, y: 34, w: 1780, h: 936, r: 18 };

// Tavolozza: il blu dell'intestazione di IRIS e il verde acqua dei pulsanti.
const BLU = '#1565c0', ACQUA = '#4db6ac', CHIARO = '#cfe3f7';

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; }
  body { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Inter, sans-serif; color: #fff; }

  .scena {
    position: relative; width: 1920px; height: 1080px;
    background: linear-gradient(150deg, #0b2545 0%, ${BLU} 48%, #06182e 100%);
  }
  /* Un filo di cornice intorno alla finestra, per staccarla dallo sfondo. */
  .corpo {
    position: absolute; left: ${F.x - 6}px; top: ${F.y - 6}px;
    width: ${F.w + 12}px; height: ${F.h + 12}px; border-radius: ${F.r + 6}px;
    background: linear-gradient(160deg, rgba(255,255,255,.26), rgba(255,255,255,.08));
    box-shadow: 0 26px 64px rgba(0,0,0,.5);
  }
  .schermo {
    position: absolute; left: ${F.x}px; top: ${F.y}px;
    width: ${F.w}px; height: ${F.h}px; border-radius: ${F.r}px; background: #0b0b0f;
  }

  /* Maschera per alphamerge: bianco dove il filmato si vede, nero fuori. Gli
     angoli tondi NON si ottengono bucando lo sfondo — clip-path in Chromium
     esce senza canale alpha nello screenshot. Provato. */
  .maschera { width: ${F.w}px; height: ${F.h}px; background: #000; }
  .maschera > div { width: 100%; height: 100%; border-radius: ${F.r}px; background: #fff; }

  /* La fascia sotto la finestra: 1080 - 34 - 936 = 110px. */
  .didascalia {
    position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);
    max-width: 1760px; padding: 15px 34px; border-radius: 16px;
    background: rgba(4, 20, 40, .92); border: 1px solid rgba(77,182,172,.45);
    font-size: 31px; line-height: 1.28; font-weight: 600; letter-spacing: -.3px;
    text-align: center; white-space: nowrap;
  }
  .didascalia b { color: ${ACQUA}; font-weight: 700; }

  .cartello {
    width: 1920px; height: 1080px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 30px; text-align: center;
    background: linear-gradient(150deg, #0b2545 0%, ${BLU} 48%, #06182e 100%);
  }
  .cartello .t { font-size: 92px; font-weight: 800; letter-spacing: -1.8px; }
  .cartello .t i { font-style: italic; color: ${ACQUA}; }
  .cartello .s { font-size: 36px; font-weight: 500; color: ${CHIARO}; max-width: 1240px; line-height: 1.42; }
  .cartello .u { font-size: 27px; font-weight: 600; color: ${ACQUA}; margin-top: 8px; }
  .chips { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
  .chip {
    font-size: 23px; font-weight: 600; padding: 12px 24px; border-radius: 999px;
    background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.24); color: #eaf3ff;
  }
`;

const TITOLO = '<i>IRIS</i> — BitCtrl';

// ⚠️ Le tecnologie sono quelle che Ismail dichiara nella scheda del portfolio
// (Vue.js, PHP, cybersecurity). Dal filmato si vede Material Design e una
// spia "connected", ma non basta per dire quale libreria c'e' sotto: qui non
// si tira a indovinare, si ripete quello che ha scritto lui.
const CARTELLI = {
  intro: `<div class="cartello">
    <div class="t">${TITOLO}</div>
    <div class="s">Il frontend dello strumento di collaudo: si compone la sequenza di test, si configura l'apparato e se ne legge lo stato. Sviluppato durante lo stage in BitCtrl, in Germania.</div>
    <div class="chips"><span class="chip">Vue.js</span><span class="chip">PHP</span>
      <span class="chip">Cybersecurity</span><span class="chip">Stage 2025</span></div>
  </div>`,
  outro: `<div class="cartello">
    <div class="t">${TITOLO}</div>
    <div class="s">Vue.js · PHP · cybersecurity — piattaforma aziendale, sviluppata in stage in BitCtrl (Germania)</div>
    <div class="u">ismailbarakat.dev</div>
  </div>`,
};

// Una voce per scena, nello stesso ordine di iris_monta.sh.
const SCENE = [
  'L\'editor: qui si costruisce la <b>sequenza di collaudo</b>.',
  'Ogni passo puo essere <b>StandardTest</b>, <b>ManualStep</b> o <b>LoopTest</b>.',
  'Uno standard test vuole nome, descrizione e <b>comando da eseguire</b>.',
  'Il passo entra nella sequenza, pronto a essere lanciato.',
  'La stessa interfaccia configura l\'apparato: <b>rete e NTP</b>.',
  'E poi i servizi di sistema e il <b>fuso orario</b>.',
  'System info legge lo stato della macchina <b>in diretta</b>.',
  'Si torna alla sequenza: esecuzione, stato, esportazione.',
];

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const stile = `<style>${CSS}</style>`;

for (const [nome, html] of Object.entries(CARTELLI)) {
  await p.setContent(stile + html);
  await p.screenshot({ path: `${D}iris_${nome}.png` });
}

for (let i = 0; i < SCENE.length; i++) {
  await p.setContent(`${stile}<div class="scena">
    <div class="corpo"></div><div class="schermo"></div>
    <div class="didascalia">${SCENE[i]}</div></div>`);
  await p.screenshot({ path: `${D}iris_scena${i + 1}.png` });
}

await p.setViewportSize({ width: F.w, height: F.h });
await p.setContent(`${stile}<div class="maschera"><div></div></div>`);
await p.screenshot({ path: `${D}iris_maschera.png` });

fs.writeFileSync(`${D}iris_geom.json`, JSON.stringify(F));
console.log(`${SCENE.length} scene + 2 cartelli + maschera`);
await browser.close();
