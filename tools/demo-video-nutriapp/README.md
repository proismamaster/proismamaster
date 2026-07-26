# Demo video di NutriApp

Sorgenti per rigenerare `assets/demo/nutriapp-demo.mp4`. Il video nasce da **due
sorgenti**, montate nella stessa cornice di device e con le stesse didascalie:

| parte | cosa | come |
| --- | --- | --- |
| 1 (0-35s) | ricerca, ritrovamento e apertura del prodotto, porzione, salvataggio | **registrazione fatta da Ismail su un telefono vero**, riprodotta dentro la cornice da `record_phone.mjs` + `stage_video.html` |
| 2 (35-62s) | ricette, grafici, cartello finale | build Flutter Web pilotato da `record_parte2.mjs` contro il backend e il database veri |

Il montaggio finale e' `edit_finale.sh`, che legge le due registrazioni.

## Perche' due sorgenti

Le **foto dei prodotti** esistono e nell'app si vedono, ma arrivano live da
OpenFoodFacts: tutti gli host `*.openfoodfacts.org` sono rifiutati dalla policy
di rete dell'ambiente di registrazione (403 al gateway, verificato anche via
WebFetch), e lo scanner del codice a barre non esiste nel build web. Dal
telefono di Ismail invece si vedono, ed e' per questo che la parte della ricerca
e della scheda prodotto viene da li'.

L'app nella parte 2 e' lasciata in **inglese** per combaciare con la
registrazione del telefono.

⚠️ La registrazione del telefono va convertita in **WebM/VP9**: il Chromium di
Playwright non decodifica H.264.

```bash
ffmpeg -i registrazione.mp4 -an -vf "scale=390:854,fps=30" \
  -c:v libvpx-vp9 -crf 28 -b:v 0 telefono.webm
```

## Cosa mostra

Il taglio è volutamente sbilanciato sul **come si aggiunge un alimento**, che è
il gesto che si fa dieci volte al giorno: ricerca per nome, scheda già compilata,
scelta del pasto e della porzione, card dei macronutrienti, e il salvataggio che
fa scendere le calorie rimanenti nel diario. Poi le ricette. L'accesso avviene
**dietro il cartello di apertura** e nel video non si vede; i grafici prendono
sei secondi in coda.

## Backend e dati: quelli veri del progetto

Il video **non** gira contro un finto server. L'host di produzione
(`progetti.galileicrema.org`) è irraggiungibile dall'ambiente di registrazione
— la policy di rete lo rifiuta a monte con 403, e nessuna credenziale cambia la
cosa — quindi si fa girare **il backend vero in locale**:

```bash
# MariaDB + i dump SQL che stanno nel repo di NutriApp
mysql -u root -e "CREATE DATABASE nutriapp CHARACTER SET utf8mb4"
for f in <NutriApp>/fileDatabase/*.sql; do mysql -u root nutriapp < "$f"; done

# gli endpoint PHP veri, con db_config.php puntato al DB locale via env
cd <cartella che contiene un symlink nutriapp -> fileDatabase>
DB_HOST=127.0.0.1 DB_NAME=nutriapp DB_USER=... DB_PASSWORD=... \
  php -S 127.0.0.1:8911 -t .
```

`lib_boot.mjs` dirotta le chiamate da `progetti.galileicrema.org` a `:8911`.
Il risultato: login vero (`password_verify`), **788 alimenti reali** con i loro
valori nutrizionali, ricerca vera. Cercando "riso" escono otto voci: sette dal database CREA e una
dai prodotti OpenFoodFacts in cache, con marca e codice a barre.

Cosa resta generato da noi, e va detto:

- **il diario** (345 voci su 29 giorni) e le **tre ricette**, costruiti con
  `storico2.sql` e `ricette2.sql` a partire dagli alimenti veri del database:
  i valori nutrizionali sono quelli giusti, sono i pasti a non essere reali;
- **l'account** di prova, creato in locale.

Il badge a schermo dice esattamente questo: *"Diario di esempio · alimenti dal
database reale"*.

⚠️ Il database di produzione contiene molti più prodotti (l'import
OpenFoodFacts) di quelli nei dump del repo: qui i risultati sono reali ma meno
numerosi.

## Le foto dei prodotti: ci sono, ma solo nella parte 1

Nel video si vedono perche' quella meta' e' girata su un telefono con rete
normale. Dall'ambiente di registrazione **non** sono ottenibili: l'app le carica
solo lungo il percorso di scansione (`get_product_by_barcode.php` interroga
OpenFoodFacts in diretta), gli host OpenFoodFacts sono bloccati, e iniettare un
`image_url` nelle risposte di ricerca non serve perche' quelle schede non
leggono quel campo. Provato, verificato, documentato qui per non riprovarci.

## La scansione del codice a barre non è registrabile

Il build Flutter Web **non contiene alcuna implementazione dello scanner**:
niente `mobile_scanner`, niente zxing, nessun riferimento a `BarcodeDetector` nel
bundle. Il pulsante c'è ma su web fallisce sempre con *"Errore durante la
scansione"* — è una funzione solo Android. Iniettare un finto `BarcodeDetector`
è stato provato e non serve, perché non è quella l'API che l'app chiama.
Nel video la parte "codice a barre" è quindi il campo **Codice a Barre
(opzionale)** della scheda prodotto, che invece esiste davvero anche su web.

## Altre due trappole dell'ambiente

Entrambe in `lib_boot.mjs`:

1. **CanvasKit** viene scaricato da `gstatic.com` → servito dalla copia locale
   che il build Flutter contiene già in `canvaskit/`.
2. **Il font Roboto** viene da `fonts.gstatic.com` → sostituito con un font di
   sistema. Senza, l'app rende una **schermata bianca**: il motore disegna, ma il
   testo non ha glifi, e sembra un crash mentre non lo è.

Serve anche `locale: 'it-IT'` sul contesto: con un locale che Dart non riconosce
l'app muore all'avvio con `Incorrect locale information provided`.

## Scroll: Flutter ignora il mouse

Un trascinamento col mouse **non** scrolla una lista Flutter, e la rotellina non
passa in un contesto mobile. Lo swipe va mandato come evento touch vero via CDP
(`Input.dispatchTouchEvent`) — vedi la funzione `swipe()` in `record.mjs`.

## Come rigenerarlo

```bash
# 1. build fresca dell'app (serve il Flutter SDK)
cd <NutriApp> && flutter build web --release --base-href /nutriapp/

# 2. servi il build su :8903 (la cartella che LO CONTIENE: l'index.html
#    ha <base href="/nutriapp/">), e questa cartella su :8904
# 3. avvia MariaDB + php -S come sopra
# 4. registra e monta
node record.mjs
bash edit.sh
```

### Attenzione ai tempi di taglio

I confini in `edit.sh` **non** sono i valori di `marks.json`: Playwright scrive il
webm con una base tempi più lunga del tempo reale. Verifica sempre sul file:

```bash
ffmpeg -ss 142.8 -i raw/*.webm -frames:v 1 check.png
```
