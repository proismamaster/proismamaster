# Demo video di Forno Brace

A differenza degli altri, questo video **non è uno screencast scriptato**: è la
registrazione fatta da Ismail, quella che sta nel repo del progetto sotto Git
LFS. Qui viene solo **vestita** nello stesso stile degli altri — stessa misura,
stessi cartelli, stesse didascalie, niente audio — e ripulita da quello che non
ci deve stare.

## Perché non è girato come gli altri

Il menu del sito prende le foto dei prodotti da `images.unsplash.com`. La policy
di rete dell'ambiente di registrazione **rifiuta quell'host a monte** (403 al
gateway sulla CONNECT), e senza foto l'app cade sul suo ripiego: le schede
restano con i riquadri rotti e il sito sembra guasto mentre non lo è. Rigirarlo
qui avrebbe prodotto un video che racconta il progetto peggio di com'è.

La registrazione di Ismail invece è stata fatta con una rete normale e le foto
si vedono tutte. È l'unica fonte possibile, e per questo si eredita.

## Come si recupera l'originale

Il file nel repo è un **puntatore Git LFS** da 134 byte; `git lfs` non è
installato, ma l'oggetto si scarica lo stesso parlando con l'API di GitHub:

```bash
OID=$(sed -n 's/^oid sha256://p' demo.mp4)
SIZE=$(sed -n 's/^size //p' demo.mp4)
curl -s -X POST "https://github.com/proismamaster/forno_brace-.git/info/lfs/objects/batch" \
  -H "Accept: application/vnd.git-lfs+json" -H "Content-Type: application/vnd.git-lfs+json" \
  -d "{\"operation\":\"download\",\"transfers\":[\"basic\"],\"objects\":[{\"oid\":\"$OID\",\"size\":$SIZE}]}" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['objects'][0]['actions']['download']['href'])" \
  | xargs curl -sL -o demo_originale.mp4
sha256sum demo_originale.mp4    # deve combaciare con l'oid
```

## Il giro dell'ordine, che prima era tagliato

La prima versione buttava via tutto il tratto **0:31–1:03**, perché dentro c'è il
checkout e nel checkout ci sono nome, indirizzo, telefono e metodo di pagamento.
Il taglio era giusto sul checkout ma **troppo largo**: insieme a quello se ne
andava la parte migliore del progetto, cioè il giro completo di un ordine.

Ora il video lo racconta tutto:

| # | sorgente | cosa si vede |
|---|---|---|
| 4 | 44.0–46.6 | il titolare entra nell'area di gestione |
| 5 | 49.8–52.2 | il cruscotto: ordini di oggi, incasso, in lavorazione |
| 6 | 52.2–56.0 | **lo stato passa a Consegnato** |
| 7 | 56.2–59.3 | lato cliente: l'ordine risulta consegnato |
| 8 | 59.3–61.3 | i numeri del cruscotto si ricalcolano (in lavorazione 1→0, incasso 0→6,00 €) |

Fuori resta solo il **checkout vero e proprio (33–44)**, che è l'unico punto dove
i dati del cliente stanno a schermo per esteso — ed è anche solo un modulo da
compilare, non c'è niente da vedere.

Fuori resta anche **46.6–49.8**: lì il browser chiede il permesso per le
notifiche e il riquadro di sistema copre la pagina.

### La riga che viene sfocata

⚠️ Nel cruscotto ogni ordine è intestato `#1 · Marta Bianchi · marta@example.com`
con sotto data, indirizzo e telefono. Sono dati di prova — l'indirizzo è quello
della bottega stessa, il dominio è `example.com`, riservato dalla IANA proprio
per gli esempi — ma la regola tenuta su tutti gli altri video è che i dati di un
cliente non si riprendono, e non la si cambia per comodità.

Quella riga è **sfocata** nelle tre scene del cruscotto (5, 6, 8). Restano
leggibili il numero d'ordine, gli stati (RICEVUTO / CONSEGNATO / CONTANTI /
PAGATO) e i totali, che sono il punto della scena.

Il riquadro è misurato sul fotogramma **originale** a 2664x1440 e applicato
**prima** del ritaglio, così se cambi il `CROP` non devi rifare le coordinate.

In *I miei ordini* (lato cliente) invece non si sfoca niente: lì c'è solo
"Consegna a Via dei Forni 14, Milano", che è l'indirizzo della bottega, lo stesso
stampato nel piè di pagina e nella pagina contatti.

Resta dentro anche il **pannello di gestione del menu** (prodotti, prezzi,
disponibilità, nuovo prodotto), che di dati personali non ne ha.

Nel menu si vede una scheda di prova — *"Isma / asd"*, con la foto di uno
schizzo di rete — rimasta nel database durante la registrazione. È roba sua, non
è stata toccata; il poster è stato spostato sull'apertura col pane proprio per
non metterla in copertina.

## Come si veste

`stile.mjs` disegna in Playwright, e salva come PNG a 1920x1080:

- i due **cartelli** di apertura e chiusura, nella tavolozza del sito (crema,
  marrone forno, terracotta) ma con la stessa struttura degli altri progetti;
- le **didascalie**, con lo sfondo trasparente, così si sovrappongono al video.

`edit.sh` poi lavora in tre passate: ritaglia e rimonta il corpo, sovrappone le
didascalie, incolla i cartelli e chiude con le dissolvenze.

⚠️ L'originale è **2664x1440** (37:20), non 16:9. Si tolgono 52px per lato
invece di aggiungere bande nere, così il video resta a pieno schermo come gli
altri.

⚠️ Le didascalie non si scrivono con `drawtext`: la build di ffmpeg disponibile
non ha quel filtro. Si sovrappongono come immagini con
`overlay=enable='between(t,...)'`, il che ha anche il vantaggio di dare
esattamente lo stesso carattere e la stessa forma degli screencast scriptati.

Ogni scritta sta **tutta dentro la scena che descrive**: compare poco dopo il
taglio e sparisce prima del successivo, mai a cavallo di due segmenti.

⚠️ Le etichette dentro `filter_complex` devono essere **uniche in tutto il
grafo**: lo sfocatore usa `[fz0][fz1][fzb]` proprio per non collidere con quelle
delle scene. Quando collidono, ffmpeg ricabla in silenzio — nessun errore, esce
la scena sbagliata.

```bash
node stile.mjs
bash edit.sh
```

Risultato: **1:06**, 1920x1080, muto.
