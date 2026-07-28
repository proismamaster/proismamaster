// Genera i pezzi grafici per vestire una registrazione ALTRUI nello stesso
// stile degli screencast scriptati: due cartelli a tutto schermo e le
// didascalie, come PNG a 1920x1080 (le didascalie con lo sfondo trasparente,
// cosi' si sovrappongono al video).
//
// Serve perche' questo video non l'ho girato io: e' la registrazione di Ismail,
// l'unica che mostra il sito con le foto vere dei prodotti (arrivano da
// Unsplash, che dall'ambiente di registrazione e' bloccato). Non potendo
// rifarla, la si veste.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/forno/';

// Tavolozza presa dal sito: crema, marrone forno, terracotta.
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; }
  body { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Inter, sans-serif; }

  .card {
    width: 1920px; height: 1080px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 30px; text-align: center;
    background: linear-gradient(150deg, #6b3f1d 0%, #8c4f22 45%, #40230e 100%);
    color: #fdf8f0;
  }
  .card .t { font-size: 92px; font-weight: 800; letter-spacing: -1.8px; }
  .card .t i { font-style: italic; color: #f0a868; }
  .card .s { font-size: 36px; font-weight: 500; color: #f3e3cd; max-width: 1180px; line-height: 1.42; }
  .card .u { font-size: 28px; font-weight: 600; color: #f0a868; margin-top: 8px; }
  .chips { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
  .chip {
    font-size: 23px; font-weight: 600; padding: 12px 24px; border-radius: 999px;
    background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.24); color: #fdf0dd;
  }

  /* Didascalia: stessa forma degli altri video, tinta sul marrone del forno. */
  .capwrap {
    width: 1920px; height: 1080px; position: relative; background: transparent;
  }
  .cap {
    position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%);
    max-width: 78%; padding: 19px 35px; border-radius: 19px;
    background: rgba(45, 24, 10, .94); color: #fff;
    font-size: 33px; line-height: 1.35; font-weight: 600; letter-spacing: -.3px;
    text-align: center; white-space: nowrap;
    box-shadow: 0 16px 53px rgba(0,0,0,.42); border: 1px solid rgba(240,168,104,.42);
  }
  .cap b { color: #f0a868; font-weight: 700; }
`;

const CARTELLI = {
  intro: `<div class="card">
    <div class="t">Forno <i>Brace</i></div>
    <div class="s">Il sito di una bottega artigianale: menu, ordine online e il pannello con cui si manda avanti il forno.</div>
    <div class="chips"><span class="chip">Node.js</span><span class="chip">Express</span>
      <span class="chip">SQLite</span><span class="chip">Ordini online</span></div>
  </div>`,
  outro: `<div class="card">
    <div class="t">Forno <i>Brace</i></div>
    <div class="s">Node.js · Express · SQLite — menu, carrello, ordine e gestione</div>
    <div class="u">github.com/proismamaster/Forno_Brace- &nbsp;·&nbsp; ismailbarakat.dev</div>
  </div>`,
};

const DIDASCALIE = [
  'Una bottega vera: <b>pane, focacce, dolci</b> e piatti di stagione.',
  'Il menu si filtra per categoria e si cerca per nome.',
  'Ogni prodotto con la sua foto, il prezzo e la <b>quantita</b>.',
  'Consegna, asporto o tavolo — con orari e mappa della bottega.',
  // Da qui in poi il pezzo che prima era tagliato: il giro completo di un
  // ordine, dal cruscotto del titolare fino a quello che vede il cliente.
  'Il titolare entra nell\'<b>area di gestione</b>.',
  'Il cruscotto: ordini di oggi, incasso, cosa e in lavorazione.',
  'Lo stato si cambia da qui — l\'ordine passa a <b>Consegnato</b>.',
  'E il cliente lo vede subito nei <b>suoi ordini</b>.',
  'I numeri del cruscotto si aggiornano da soli.',
  'Dallo stesso pannello si gestisce il <b>menu</b>: prezzi, disponibilita, nuovi prodotti.',
  'Tutto su <b>Node.js</b>, Express e un database SQLite.',
];

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();

for (const [nome, html] of Object.entries(CARTELLI)) {
  await p.setContent(`<style>${CSS}</style>${html}`);
  await p.screenshot({ path: D + `cartello_${nome}.png` });
  console.log('cartello:', nome);
}

for (let i = 0; i < DIDASCALIE.length; i++) {
  await p.setContent(`<style>${CSS}</style><div class="capwrap"><div class="cap">${DIDASCALIE[i]}</div></div>`);
  await p.screenshot({ path: D + `cap_${i + 1}.png`, omitBackground: true });
  console.log('didascalia', i + 1);
}

fs.writeFileSync(D + 'didascalie.json', JSON.stringify(DIDASCALIE, null, 1));
await browser.close();
