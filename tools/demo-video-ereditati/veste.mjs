// Vestizione delle registrazioni VERTICALI (FlappyBird, Raspberry Car).
//
// Il problema: sono 1080x1920, mentre tutti gli altri video del portfolio sono
// 1920x1080. Riempirle a tutto schermo vorrebbe dire tagliare via mezzo
// fotogramma; metterle in mezzo a due bande nere e' brutto. Si usa la stessa
// impaginazione delle code "da telefono" degli altri video: il filmato dentro
// una cornice a sinistra, il testo nella colonna a destra.
//
// Come funziona il montaggio, visto che qui non si registra un browser:
// questo script produce PNG a 1920x1080 con una FINESTRA TRASPARENTE dove va il
// video. In ffmpeg si mette prima il filmato e sopra il PNG: il video si vede
// solo attraverso la finestra, e ne eredita gli angoli arrotondati.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/altri/';

const PROGETTI = {
  flappy: {
    // Tavolozza del gioco: verde tubo e cielo.
    grad: 'linear-gradient(150deg, #14532d 0%, #15803d 46%, #052e16 100%)',
    acc: '#86efac', acc2: '#bbf7d0', pill: 'rgba(5, 40, 20, .94)',
    finestra: { x: 132, y: 66, w: 650, h: 950, r: 34 },
    cornice: 'telefono',          // e' una registrazione dello schermo del telefono
    titolo: 'Flappy<i>Bird</i> 2',
    sotto: 'Riedizione del classico, finalista Hackergen: temi, difficolta, punteggi e fisica regolabile.',
    chips: ['JavaScript', 'Canvas', 'PWA', 'Electron'],
    url: 'github.com/proismamaster/FlappyBird-2 &nbsp;·&nbsp; ismailbarakat.dev',
    scene: [
      ['Il gioco', 'Quattro livelli<br>di difficolta.', 'Ognuno con il suo uccellino e il suo record da battere.'],
      ['Si gioca', 'Tubi, punteggio<br>e nient\'altro.', 'Un tocco per saltare: la regola del gioco sta tutta li.'],
      ['I record', 'Ogni livello<br>ha il suo record.', 'Facile, normale e difficile tengono ognuno il proprio punteggio.'],
      ['Temi', 'Giorno e notte.', 'Lo sfondo cambia, la citta dietro ai tubi resta.'],
      ['Su misura', 'La fisica si<br>regola a mano.', 'Distanza fra i tubi, spinta del salto, gravita, velocita.'],
      ['Fine partita', 'Quattrocento<br>novantatre.', 'Punteggio, record e si riparte.'],
    ],
  },
  car: {
    // Tavolozza: lampone del Raspberry.
    grad: 'linear-gradient(150deg, #7f1d3a 0%, #a81d45 46%, #4a0f22 100%)',
    acc: '#fda4af', acc2: '#fecdd3', pill: 'rgba(60, 10, 25, .94)',
    finestra: { x: 142, y: 66, w: 572, h: 950, r: 30 },
    cornice: 'neutra',            // qui si filma il mondo vero, non uno schermo
    titolo: 'Raspberry <i>Car</i>',
    sotto: 'Una macchinina comandata dal browser: Raspberry Pi, Arduino e video in diretta.',
    chips: ['Raspberry Pi', 'Arduino', 'Python', 'Flask'],
    url: 'github.com/proismamaster/Rasberry-Car &nbsp;·&nbsp; ismailbarakat.dev',
    scene: [
      ['L\'hardware', 'Montata<br>a mano.', 'Raspberry Pi, camera a nastro, motori e cablaggio sul telaio.'],
      ['Il comando', 'Si guida<br>dal browser.', 'L\'interfaccia accende la macchina e mostra il video della camera.'],
      ['In movimento', 'E cammina<br>davvero.', 'Comandi via Bluetooth, ripresa in diretta dalla camera di bordo.'],
    ],
  },
};

const css = (p) => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; }
  body { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Inter, sans-serif; color: #fff; }

  .scena { position: relative; width: 1920px; height: 1080px; background: ${p.grad}; }

  /* Il corpo del dispositivo sta SOTTO la finestra e la incornicia. */
  .corpo {
    position: absolute;
    left: ${p.finestra.x - 13}px; top: ${p.finestra.y - 13}px;
    width: ${p.finestra.w + 26}px; height: ${p.finestra.h + 26}px;
    border-radius: ${p.finestra.r + 12}px;
    background: ${p.cornice === 'telefono'
      ? 'linear-gradient(160deg, #2b2b33, #101014)'
      : 'linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.07))'};
    box-shadow: 0 30px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.12) inset;
  }
  /* Lo schermo spento, dietro al filmato. La scena resta OPACA: gli angoli
     tondi non si ottengono bucando lo sfondo — provato con clip-path, lo
     screenshot esce senza canale alpha e il buco non c'e' — ma arrotondando il
     VIDEO in montaggio, con la maschera qui sotto. */
  .schermo {
    position: absolute;
    left: ${p.finestra.x}px; top: ${p.finestra.y}px;
    width: ${p.finestra.w}px; height: ${p.finestra.h}px;
    border-radius: ${p.finestra.r}px;
    background: #0b0b0f;
  }

  /* Maschera per ffmpeg: bianco dove il video si vede, nero fuori. Il filtro
     alphamerge legge il grigio di questa immagine come trasparenza. */
  .maschera { width: ${p.finestra.w}px; height: ${p.finestra.h}px; background: #000; }
  .maschera > div { width: 100%; height: 100%; border-radius: ${p.finestra.r}px; background: #fff; }

  .colonna {
    position: absolute; left: ${p.finestra.x + p.finestra.w + 96}px; top: 50%;
    transform: translateY(-50%); width: ${1820 - (p.finestra.x + p.finestra.w + 96)}px;
  }
  .kicker { font-size: 24px; font-weight: 700; letter-spacing: 3.4px; text-transform: uppercase; color: ${p.acc}; margin-bottom: 18px; }
  .titolo { font-size: 72px; font-weight: 800; letter-spacing: -2px; line-height: 1.08; }
  .lede { font-size: 29px; color: ${p.acc2}; margin-top: 20px; line-height: 1.45; }

  .cartello {
    position: relative; width: 1920px; height: 1080px; background: ${p.grad};
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 30px; text-align: center;
  }
  .cartello .t { font-size: 92px; font-weight: 800; letter-spacing: -1.8px; }
  .cartello .t i { font-style: italic; color: ${p.acc}; }
  .cartello .s { font-size: 36px; font-weight: 500; color: ${p.acc2}; max-width: 1180px; line-height: 1.42; }
  .cartello .u { font-size: 27px; font-weight: 600; color: ${p.acc}; margin-top: 8px; }
  .chips { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
  .chip {
    font-size: 23px; font-weight: 600; padding: 12px 24px; border-radius: 999px;
    background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.24);
  }
`;

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();

for (const [nome, cfg] of Object.entries(PROGETTI)) {
  const stile = `<style>${css(cfg)}</style>`;

  // Cartelli di apertura e chiusura (opachi).
  await p.setContent(`${stile}<div class="cartello">
    <div class="t">${cfg.titolo}</div><div class="s">${cfg.sotto}</div>
    <div class="chips">${cfg.chips.map(c => `<span class="chip">${c}</span>`).join('')}</div></div>`);
  await p.screenshot({ path: `${D}${nome}_intro.png` });

  await p.setContent(`${stile}<div class="cartello">
    <div class="t">${cfg.titolo}</div>
    <div class="s">${cfg.chips.join(' · ')}</div>
    <div class="u">${cfg.url}</div></div>`);
  await p.screenshot({ path: `${D}${nome}_outro.png` });

  // Una scena per ogni momento: sfondo + cornice + testo, con la finestra bucata.
  for (let i = 0; i < cfg.scene.length; i++) {
    const [k, t, l] = cfg.scene[i];
    await p.setContent(`${stile}<div class="scena">
      <div class="corpo"></div><div class="schermo"></div>
      <div class="colonna">
        <div class="kicker">${k}</div><div class="titolo">${t}</div><div class="lede">${l}</div>
      </div></div>`);
    await p.screenshot({ path: `${D}${nome}_scena${i + 1}.png` });
  }
  await p.setViewportSize({ width: cfg.finestra.w, height: cfg.finestra.h });
  await p.setContent(`${stile}<div class="maschera"><div></div></div>`);
  await p.screenshot({ path: `${D}${nome}_maschera.png` });
  await p.setViewportSize({ width: 1920, height: 1080 });

  console.log(nome, '->', cfg.scene.length, 'scene + 2 cartelli + maschera');
  fs.writeFileSync(`${D}${nome}_geom.json`, JSON.stringify(cfg.finestra));
}

await browser.close();
