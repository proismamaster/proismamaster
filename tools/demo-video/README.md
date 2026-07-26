# Demo video di BaseFlow

Sorgenti per rigenerare `assets/demo/baseflow-demo.mp4`: uno **screencast scriptato**
dell'app reale, non un montaggio a mano. Playwright guida BaseFlow in un Chromium
headless mentre un overlay iniettato nella pagina disegna cursore, sottotitoli e
cartelli; ffmpeg taglia e riesporta in H.264.

Il video nasce da **due registrazioni** distinte, unite in fase di montaggio:

| file | cosa registra | risoluzione |
| --- | --- | --- |
| `record.mjs` | l'app su desktop | 1920x1080 |
| `record_mobile.mjs` | `stage.html`: l'app dentro una cornice di telefono, con accanto i download per piattaforma | 1920x1080 |

`stage.html` carica l'app in un `<iframe>` largo 390px: la UI mobile di BaseFlow
dipende solo da `@media (max-width: 760px)`, quindi il layout da telefono si
attiva davvero, non è simulato. L'iframe è reso **1:1**, senza `transform:
scale()`: è da lì che viene la nitidezza della parte da telefono.

### Come si alza la qualità (e come NON si alza)

Il video è a 1920x1080 perché la pagina viene **disegnata** a quella misura:
`viewport` e `recordVideo.size` sono entrambi 1920x1080.

⚠️ Alzare il `deviceScaleFactor` **non serve**: Playwright non riscala il
fotogramma catturato per riempire il video: lo incolla nell'angolo in alto a
sinistra e lascia grigio il resto. Provato, verificato, scritto qui per non
riprovarci.

Le misure della regia (`overlay.js`) nascono su un fotogramma da 1440px e si
scalano da sole con `K = innerWidth / 1440`, così l'inquadratura resta identica
a qualsiasi risoluzione. I nodi del diagramma invece sono disegnati su un
`<canvas>`, non nel DOM: non ci sono elementi da cercare, quindi `record.mjs`
ricava la x dei click dal **centro della tela** (879 a 1440px, 1119 a 1920px) e
tiene le y misurate, che non cambiano perché il flusso parte dall'alto.

## Cosa fa il video

1. Cartello di apertura.
2. Inserimento di un blocco **Output** dalla palette e sua configurazione.
3. Esecuzione con output nella console integrata.
4. Caricamento di `Spirale.json` — un ciclo `for` che pilota la tartaruga.
5. Esecuzione animata: nodo evidenziato, variabili aggiornate, spirale che si disegna.
6. Export del diagramma in Python / Java / C.
7. **Parte multipiattaforma**: la stessa spirale eseguita sul telefono, mentre
   compaiono i pacchetti disponibili (Windows, macOS, Linux, Android, PWA).
8. Cartello di chiusura.

I formati elencati al punto 7 rispecchiano la release **v0.2.3** di BaseFlow.
Se cambiano i target in `electron-builder.yml`, aggiorna `stage.html`.

## Come rigenerarlo

Servono Node con `playwright` (e il suo Chromium) e `ffmpeg`.

```bash
# 1. l'app statica va servita su :8899, questa cartella su :8900
npx http-server -p 8899 -c-1 /percorso/a/BaseFlow/app &
npx http-server -p 8900 -c-1 . &

# 2. genera il flowchart di esempio
python3 make_flow.py

# 3. registra le due parti (producono raw/ e rawmob/ + i marks*.json)
node record.mjs
node record_mobile.mjs

# 4. monta ed esporta (MP4 + poster JPG)
bash edit.sh
```

### Attenzione ai tempi di taglio

I confini in `edit.sh` **non** sono i valori di `marks.json`. Playwright scrive il
webm con una base tempi più lunga del tempo reale (frame duplicati: circa +5% sul
desktop, +1% sul mobile a questa risoluzione, ma la deriva cambia da una
registrazione all'altra), quindi i secondi misurati dal copione non corrispondono
ai secondi del file. I marcatori servono solo come stima: il valore va verificato
sul file prima di fidarsi.

```bash
ffmpeg -ss 109.4 -i raw/*.webm -frames:v 1 check.png   # dov'è davvero quel momento?
```

## Come incorporarlo nel sito

```html
<video
  src="/assets/demo/baseflow-demo.mp4"
  poster="/assets/demo/baseflow-demo-poster.jpg"
  width="1920" height="1080"
  controls muted playsinline preload="metadata"
  style="width:100%;height:auto;border-radius:12px">
</video>
```

Il video è **senza audio**: per un loop decorativo in una hero section aggiungi
`autoplay loop` e togli `controls`.
