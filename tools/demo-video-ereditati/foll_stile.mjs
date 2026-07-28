// Cartelli e didascalie per la demo di Instagram Followers.
// Stessa tecnica usata per Forno Brace: PNG a 1920x1080, le didascalie con lo
// sfondo trasparente da sovrapporre in ffmpeg (la build di ffmpeg disponibile
// non ha il filtro drawtext, e passare dalle immagini da comunque lo stesso
// carattere degli screencast scriptati).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const D = '/tmp/claude-0/-home-user-proismamaster/665b245a-a4c7-5022-9652-b85d6823b19c/scratchpad/altri/';

// Tavolozza: il viola/rosa di Instagram, tenuto scuro.
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; }
  body { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Inter, sans-serif; }

  .card {
    width: 1920px; height: 1080px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 30px; text-align: center;
    background: linear-gradient(150deg, #3b0764 0%, #7e22ce 45%, #2e1065 100%);
    color: #fff;
  }
  .card .t { font-size: 92px; font-weight: 800; letter-spacing: -1.8px; }
  .card .t i { font-style: italic; color: #f0abfc; }
  .card .s { font-size: 36px; font-weight: 500; color: #eddaff; max-width: 1220px; line-height: 1.42; }
  .card .u { font-size: 27px; font-weight: 600; color: #f0abfc; margin-top: 8px; }
  .chips { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
  .chip {
    font-size: 23px; font-weight: 600; padding: 12px 24px; border-radius: 999px;
    background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.24); color: #f6ecff;
  }

  .capwrap { width: 1920px; height: 1080px; position: relative; background: transparent; }
  .cap {
    position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%);
    max-width: 82%; padding: 19px 35px; border-radius: 19px;
    background: rgba(28, 8, 46, .94); color: #fff;
    font-size: 33px; line-height: 1.35; font-weight: 600; letter-spacing: -.3px;
    text-align: center; white-space: nowrap;
    box-shadow: 0 16px 53px rgba(0,0,0,.45); border: 1px solid rgba(240,171,252,.42);
  }
  .cap b { color: #f0abfc; font-weight: 700; }
`;

const CARTELLI = {
  intro: `<div class="card">
    <div class="t">Instagram <i>Followers</i></div>
    <div class="s">Uno script Python che legge i dati esportati da Instagram e dice chi non ricambia il follow. Nessuna dipendenza, nessuna password, niente che esca dal computer.</div>
    <div class="chips"><span class="chip">Python</span><span class="chip">CLI</span>
      <span class="chip">Zero dipendenze</span><span class="chip">Privacy</span></div>
  </div>`,
  outro: `<div class="card">
    <div class="t">Instagram <i>Followers</i></div>
    <div class="s">Python · CLI · zero dipendenze — gira in locale, sui dati che Instagram ti da</div>
    <div class="u">github.com/proismamaster/ig-unfollow-audit &nbsp;·&nbsp; ismailbarakat.dev</div>
  </div>`,
};

const DIDASCALIE = [
  'Si parte dal proprio profilo Instagram.',
  'Instagram permette di <b>esportare i propri dati</b>: seguiti e follower.',
  'Arriva un archivio da scaricare, e si scompatta.',
  'Lo script gira in locale: <b>python ig_non_followers.py</b>.',
  'E scrive chi non ricambia. Qui sono <b>quattordici</b>.',
];

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();

for (const [nome, html] of Object.entries(CARTELLI)) {
  await p.setContent(`<style>${CSS}</style>${html}`);
  await p.screenshot({ path: `${D}foll_${nome}.png` });
}
for (let i = 0; i < DIDASCALIE.length; i++) {
  await p.setContent(`<style>${CSS}</style><div class="capwrap"><div class="cap">${DIDASCALIE[i]}</div></div>`);
  await p.screenshot({ path: `${D}foll_cap${i + 1}.png`, omitBackground: true });
}
console.log('cartelli + ' + DIDASCALIE.length + ' didascalie');
await browser.close();
