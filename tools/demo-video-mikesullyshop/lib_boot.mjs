// Aggancio di rete per registrare MikeSullyShop dentro questo ambiente.
//
// L'app carica Bootstrap, le sue icone e SortableJS da jsdelivr, e il font Inter
// da Google Fonts: la policy di rete dell'ambiente di registrazione rifiuta
// entrambi gli host a monte (403 al gateway sulla CONNECT). Senza aggancio la
// pagina viene fuori COMPLETAMENTE senza stile e sembra rotta, mentre non lo e'.
//
// Non stiamo sostituendo le librerie con qualcos'altro: sono le stesse identiche
// versioni che il codice chiede (bootstrap 5.3.2, bootstrap-icons 1.11.3),
// installate da npm e servite da disco. Il font Inter invece non e' ottenibile e
// viene sostituito da un font di sistema: cambia leggermente il disegno delle
// lettere, non il resto.
import fs from 'fs';
import path from 'path';

const VEND = path.dirname(new URL(import.meta.url).pathname) + '/vendor/node_modules';

const TIPI = {
  '.css': 'text/css', '.js': 'text/javascript',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

// Da URL jsdelivr a file dentro node_modules: /npm/<pacchetto>@<versione>/<resto>
function risolvi(urlStr) {
  const u = new URL(urlStr);
  const m = u.pathname.match(/^\/npm\/(?:@[^/]+\/)?([^@/]+)@[^/]+\/(.+)$/);
  if (!m) return null;
  const [, pacchetto, resto] = m;
  const f = path.join(VEND, pacchetto, resto);
  return fs.existsSync(f) ? f : null;
}

export function wire(ctx) {
  ctx.route('https://cdn.jsdelivr.net/**', async (route) => {
    const f = risolvi(route.request().url());
    if (!f) return route.abort();
    route.fulfill({
      status: 200,
      contentType: TIPI[path.extname(f)] ?? 'application/octet-stream',
      body: fs.readFileSync(f),
    });
  });

  // Inter non e' raggiungibile: si dichiara una @font-face vuota e il browser
  // ricade sul primo font disponibile della lista. Senza questa risposta il CSS
  // resta in attesa e la pagina parte con i caratteri di sistema comunque.
  ctx.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '/* Inter non disponibile offline */' }));
  ctx.route('https://fonts.gstatic.com/**', (route) => route.abort());
}
