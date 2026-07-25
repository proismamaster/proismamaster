// Overlay di regia iniettato nella pagina BaseFlow durante la registrazione:
// cursore finto, sottotitoli, cartelli di apertura/chiusura, riquadro di focus.
// Tutto pointer-events:none tranne nulla -- non deve mai intercettare i click veri.
(() => {
  if (window.__bfDemo) return;

  const css = `
  #bfd-layer, #bfd-layer * { box-sizing: border-box; }
  #bfd-layer {
    position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Inter, sans-serif;
  }
  #bfd-cursor {
    position: absolute; left: 0; top: 0; width: 22px; height: 22px; margin: -3px 0 0 -3px;
    opacity: 0; transition: opacity .25s ease;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,.45));
  }
  #bfd-cursor svg { display: block; width: 100%; height: 100%; }
  #bfd-ring {
    position: absolute; left: 0; top: 0; width: 44px; height: 44px; margin: -22px 0 0 -22px;
    border-radius: 50%; border: 3px solid #7c3aed; opacity: 0; transform: scale(.3);
  }
  @keyframes bfd-pop { 0% { opacity:.9; transform: scale(.3);} 100% { opacity:0; transform: scale(1.15);} }
  #bfd-ring.pop { animation: bfd-pop .45s ease-out; }

  #bfd-sub {
    position: absolute; left: 50%; bottom: 42px; transform: translateX(-50%) translateY(14px);
    max-width: 78%; padding: 14px 26px; border-radius: 14px;
    background: rgba(23, 12, 46, .93); color: #fff;
    font-size: 25px; line-height: 1.35; font-weight: 600; letter-spacing: -.2px;
    text-align: center; opacity: 0; transition: opacity .32s ease, transform .32s ease;
    box-shadow: 0 12px 40px rgba(0,0,0,.35); border: 1px solid rgba(167,139,250,.35);
  }
  #bfd-sub.on { opacity: 1; transform: translateX(-50%) translateY(0); }
  #bfd-sub b { color: #c4b5fd; font-weight: 700; }

  #bfd-card {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 22px;
    background: linear-gradient(150deg, #4c1d95 0%, #6d28d9 45%, #3b0764 100%);
    opacity: 0; transition: opacity .55s ease; color: #fff; text-align: center;
  }
  #bfd-card.on { opacity: 1; }
  #bfd-card img { width: 108px; height: 108px; filter: drop-shadow(0 8px 26px rgba(0,0,0,.45)); }
  #bfd-card .t { font-size: 66px; font-weight: 800; letter-spacing: -1.6px; }
  #bfd-card .s { font-size: 27px; font-weight: 500; color: #ddd6fe; max-width: 760px; line-height: 1.4; }
  #bfd-card .u { font-size: 21px; font-weight: 600; color: #a78bfa; letter-spacing: .4px; margin-top: 6px; }
  #bfd-card .chips { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
  #bfd-card .chip {
    font-size: 17px; font-weight: 600; padding: 7px 15px; border-radius: 999px;
    background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22); color: #ede9fe;
  }

  #bfd-focus {
    position: absolute; border-radius: 14px; opacity: 0;
    box-shadow: 0 0 0 3px #a78bfa, 0 0 0 9999px rgba(15, 8, 33, .58);
    transition: opacity .4s ease, left .5s ease, top .5s ease, width .5s ease, height .5s ease;
  }
  #bfd-focus.on { opacity: 1; }
  `;

  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  const layer = document.createElement('div');
  layer.id = 'bfd-layer';
  layer.innerHTML = `
    <div id="bfd-focus"></div>
    <div id="bfd-ring"></div>
    <div id="bfd-cursor">
      <svg viewBox="0 0 24 24"><path d="M5 2.5 L5 20 L9.4 15.8 L12.2 22 L15.3 20.6 L12.6 14.6 L18.6 14.4 Z"
        fill="#fff" stroke="#1e1b4b" stroke-width="1.4" stroke-linejoin="round"/></svg>
    </div>
    <div id="bfd-sub"></div>
    <div id="bfd-card"></div>
  `;
  document.body.appendChild(layer);

  const cur = layer.querySelector('#bfd-cursor');
  const ring = layer.querySelector('#bfd-ring');
  const sub = layer.querySelector('#bfd-sub');
  const card = layer.querySelector('#bfd-card');
  const focus = layer.querySelector('#bfd-focus');

  let cx = 720, cy = 700;
  const place = (x, y) => { cur.style.transform = `translate(${x}px, ${y}px)`; ring.style.transform = `translate(${x}px, ${y}px)`; };
  place(cx, cy);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const api = {
    async cursorShow(on) { cur.style.opacity = on ? '1' : '0'; await sleep(260); },

    // Movimento del cursore con easing + leggero arco, come una mano vera.
    async moveTo(x, y, dur = 620) {
      cur.style.opacity = '1';
      const x0 = cx, y0 = cy;
      const dx = x - x0, dy = y - y0;
      const arc = Math.min(46, Math.hypot(dx, dy) * 0.16);
      const t0 = performance.now();
      await new Promise(res => {
        const step = now => {
          const t = Math.min(1, (now - t0) / dur);
          const e = easeInOut(t);
          const bend = Math.sin(t * Math.PI) * arc;
          place(x0 + dx * e, y0 + dy * e - bend);
          if (t < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      cx = x; cy = y; place(cx, cy);
    },

    async clickFx() {
      ring.style.opacity = '1';
      ring.classList.remove('pop'); void ring.offsetWidth; ring.classList.add('pop');
      await sleep(220);
      ring.style.opacity = '0';
    },

    async say(html, hold = 2600) {
      sub.innerHTML = html;
      sub.classList.add('on');
      await sleep(hold);
    },
    async sayOff() { sub.classList.remove('on'); await sleep(340); },

    async card(html, fadeIn = 600) {
      card.innerHTML = html;
      card.classList.add('on');
      await sleep(fadeIn);
    },
    async cardOff() { card.classList.remove('on'); await sleep(600); },

    async focusOn(sel, pad = 12) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) return;
      const r = el.getBoundingClientRect();
      focus.style.left = (r.left - pad) + 'px';
      focus.style.top = (r.top - pad) + 'px';
      focus.style.width = (r.width + pad * 2) + 'px';
      focus.style.height = (r.height + pad * 2) + 'px';
      focus.classList.add('on');
      await sleep(500);
    },
    async focusRect(x, y, w, h, pad = 10) {
      focus.style.left = (x - pad) + 'px';
      focus.style.top = (y - pad) + 'px';
      focus.style.width = (w + pad * 2) + 'px';
      focus.style.height = (h + pad * 2) + 'px';
      focus.classList.add('on');
      await sleep(500);
    },
    async focusOff() { focus.classList.remove('on'); await sleep(450); },
  };

  window.__bfDemo = api;
})();
