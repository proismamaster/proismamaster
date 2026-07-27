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

## Cosa resta fuori, e perché

⚠️ Dal minuto **0:31 al 1:03** l'originale mostra accesso, checkout e storico
ordini: nome, indirizzo di consegna, telefono e metodo di pagamento del cliente
di prova restano a schermo per quasi mezzo minuto. Sono dati finti, ma la regola
tenuta su tutti i video di questo portfolio è che quella roba non si riprende, e
qui vale uguale. I confini in `edit.sh` servono a questo: se li tocchi,
**ricontrolla i fotogrammi**, perché il checkout entra prima di quanto sembri
(a 0:35, non a 0:40 come farebbe pensare una scorsa veloce).

Resta invece dentro il **pannello di gestione del menu** (prodotti, prezzi,
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

```bash
node stile.mjs
bash edit.sh
```
